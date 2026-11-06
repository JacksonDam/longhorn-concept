// The login background: a looping aurora of light ribbons over a blue gradient, rendered
// procedurally in a fragment shader (crisp at any size).
//
// Fitted to the reference video (tools/login/fit_aurora.py, export_aurora.py):
// - coarse colour field: a uniform cubic B-spline grid (35x27 control points, 30 px spacing),
//   keyframed every 8 video frames (public/img/login/aurora-coarse.webp).
// - ribbons: up to NS glowing curves; each is a centreline y = Y(x) and a per-channel amplitude
//   A(x) (cubic B-splines over x, KX control points) with a gaussian cross-section of width s,
//   keyframed every 4 frames (public/img/login/aurora-ribbons.webp).
// Each frame, JS interpolates the keys (Catmull-Rom) and uploads each ribbon's control points
// (~10 KB); the shader evaluates the curves and sums the gaussians analytically per pixel. JS also
// samples the curves at the mask columns for the per-tile ribbon masks.
//
// Beyond the frame (core/Stage.jsx: a wider or taller screen extends the stage past the video's
// 960x720; the login places the frame at an offset in it, layout.js frameOffset) the field runs
// on, unstretched:
// - the coarse field is a wider lattice: the fitted control points inside the frame stay, and
//   every other one takes the fitted field's colour where a line through it along the field's
//   grain enters the frame (FLOW: its colour bands rise to the right at ~0.36, the direction in
//   which it varies least, 7-17 times less than across; structure tensor over all keys), or the
//   colour of the frame's corner that line passes nearest. So its bands carry on in their own
//   direction, and the light past the top left and the bottom right corners holds their colours.
// - a ribbon past x 0 or 960 continues along its tangent there with its colour held there: the
//   long diagonal strokes run on across the extra width (or up into the extra height).
// At the frame's own size (?capture, ?bench, ?demo) nothing of this applies.
//
// Time: the video's background is a loop of 395 frames (frames 436.. repeat 41..), with an
// extra swell of light (frames ~140-435) that we keep inside the loop. auroraFrame(t) maps
// clock time to that loop: frames 1..505 once, then 110..505 forever. The seam sits in a calm
// stretch (video frames 489-505 = 94-110), where the last XFADE frames crossfade into the
// frames before LOOP_A so the wrap is invisible.
import { asset, waitFor } from '../../core/preload.js'

export const NX = 35
export const NY = 27
export const KEY_STEP = 4 // ribbon keys
const COARSE_STEP = 8 // coarse keys
export const LOOP_A = 110
export const LOOP_B = 505

const KX = 8
const BX0 = -60
const BSX = (1020 - BX0) / (KX - 3)
const PER = 4 * KX + 1 // per slot: KX centreline, 3*KX amplitudes, sigma
const MC = 128 // mask columns across the frame (7.6 px apart), at which JS samples the ribbons
const XFADE = 16 // frames: the end of the loop crossfades into the frames just before LOOP_A
const MAXR = 128
const S = 30 // coarse lattice spacing (px)
const FLOW = 0.36 // the coarse field's grain: its bands rise this much per px to the right

export function auroraFrame(t) {
  const f = (t * 30000) / 1001 + 1
  if (f < LOOP_B) return f
  return LOOP_A + ((((f - LOOP_A) % (LOOP_B - LOOP_A)) + (LOOP_B - LOOP_A)) % (LOOP_B - LOOP_A))
}

// ------------------------------------------------------------------ data
function loadPixels(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)
      resolve({ w: img.width, h: img.height, d: ctx.getImageData(0, 0, img.width, img.height).data })
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

let coarseKeys = null // [Float32Array(NX*NY*3)] values 0..1
let ribbonKeys = null // [Float32Array(NS*PER)] decoded values
let NS = 0

export const keysReady = Promise.all([
  loadPixels(asset('img/login/aurora-coarse.webp')),
  loadPixels(asset('img/login/aurora-ribbons.webp')),
]).then(([c, r]) => {
  if (c) {
    const K = c.h / NY
    coarseKeys = []
    for (let k = 0; k < K; k++) {
      const a = new Float32Array(NX * NY * 3)
      for (let j = 0; j < NY; j++)
        for (let i = 0; i < NX; i++) {
          const p = ((j * K + k) * NX + i) * 4
          const q = (j * NX + i) * 3
          a[q] = c.d[p] / 255
          a[q + 1] = c.d[p + 1] / 255
          a[q + 2] = c.d[p + 2] / 255
        }
      coarseKeys.push(a)
    }
  }
  if (r) {
    NS = r.w / PER
    ribbonKeys = []
    const acc = new Int32Array(r.w)
    for (let k = 0; k < r.h; k++) {
      const a = new Float32Array(r.w)
      for (let v = 0; v < r.w; v++) {
        const p = (k * r.w + v) * 4
        acc[v] = (acc[v] + ((r.d[p] << 8) | r.d[p + 1])) & 0xffff
        const q = acc[v] >= 32768 ? acc[v] - 65536 : acc[v]
        const o = v % PER
        a[v] = o < KX ? q / 4 : o < 4 * KX ? q / 4 : q / 20
      }
      ribbonKeys.push(a)
    }
    findSwitches()
  }
  return !!(c && r)
})

// The fit numbers its ribbons per keyframe, and now and then a slot passes from one ribbon to
// another between two keys (its centreline jumps 35-470 px, where a ribbon itself moves at most
// ~30 px a key). Interpolated across, that ribbon slid across the screen in 4 frames: the strips
// that suddenly changed position. Such a slot is treated as two ribbons there: the one before the
// switch carries on (its motion extrapolated) and fades out over the interval while the one after
// fades in (ribbonsAt), and no interpolation reads a key across a switch.
const SWITCH = 32 // px: more than any ribbon moves in a key
let switches = null // Uint8Array(NS * keys): 1 where slot s switches between keys k - 1 and k
function findSwitches() {
  const K = ribbonKeys.length
  switches = new Uint8Array(NS * K)
  const xs = [60, 240, 480, 720, 900]
  const yAt = (key, o, x) => {
    const u = (x - BX0) / BSX + 1
    const i = Math.floor(u)
    const f = u - i
    const w = [(1 - f) ** 3 / 6, (3 * f ** 3 - 6 * f ** 2 + 4) / 6, (-3 * f ** 3 + 3 * f ** 2 + 3 * f + 1) / 6, f ** 3 / 6]
    let y = 0
    for (let m = 0; m < 4; m++) y += w[m] * key[o + Math.max(0, Math.min(KX - 1, i - 1 + m))]
    return y
  }
  for (let sl = 0; sl < NS; sl++)
    for (let k = 1; k < K; k++) {
      const o = sl * PER
      let d = 0
      for (const x of xs) d = Math.max(d, Math.abs(yAt(ribbonKeys[k], o, x) - yAt(ribbonKeys[k - 1], o, x)))
      if (d > SWITCH) switches[sl * K + k] = 1
    }
}
waitFor(keysReady)

// Catmull-Rom across keyframes at aurora frame a into `out`
function interpKeys(keys, a, out, step = KEY_STEP) {
  const u = (a - 1) / step
  const i1 = Math.max(0, Math.min(keys.length - 1, Math.floor(u)))
  const f = Math.max(0, Math.min(1, u - i1))
  const k = (i) => keys[Math.max(0, Math.min(keys.length - 1, i))]
  const p0 = k(i1 - 1), p1 = k(i1), p2 = k(i1 + 1), p3 = k(i1 + 2)
  const f2 = f * f, f3 = f2 * f
  const w0 = -0.5 * f3 + f2 - 0.5 * f
  const w1 = 1.5 * f3 - 2.5 * f2 + 1
  const w2 = -1.5 * f3 + 2 * f2 + 0.5 * f
  const w3 = 0.5 * f3 - 0.5 * f2
  for (let q = 0; q < out.length; q++) out[q] = w0 * p0[q] + w1 * p1[q] + w2 * p2[q] + w3 * p3[q]
  return out
}

// screen tiles (30 px over the stage): bitmask of the ribbons that can reach each tile, so the
// shader only evaluates those (RGBA32UI: 4 x 32 bits = MAXR ribbons)
const TS = 30
const CUT = 14 // exp(-14): the shader ignores a ribbon beyond this
const REACH = Math.sqrt(2 * CUT) // in sigmas

// ------------------------------------------------------------------ the stage around the frame
// Per stage size and frame offset (stage px; the frame's own: 960x720 at 0, 0):
//   lattice: nx x ny control points with the fitted one's column 0 at L, row 0 at T. The fitted
//        points inside the frame are kept; every other one (the fitted ring just outside the
//        frame, which the fit barely constrained, and the points past it) is the fitted field's
//        colour where the line through it along the grain enters the frame (or at the corner the
//        line passes nearest): its 16 B-spline taps into the fitted lattice (index, weight).
//        null at the frame's own size: the fitted lattice itself.
//   tiles: tx x ty ribbon-mask tiles over the stage
//   columns: mc mask columns over the stage (the frame's MC spacing), each with its frame x
//        clamped to the frame (B-spline basis there, colB / colD / colI) and the run past it (colRun)
const bw = (f) => [(1 - f) ** 3 / 6, (3 * f ** 3 - 6 * f ** 2 + 4) / 6, (-3 * f ** 3 + 3 * f ** 2 + 3 * f + 1) / 6, f ** 3 / 6]
function makeView(w, h, ox, oy) {
  const L = ox > 0 ? Math.ceil(ox / S) : 0
  const T = oy > 0 ? Math.ceil(oy / S) : 0
  const R = w - ox > 960 ? Math.ceil((w - ox - 930) / S) : 0
  const B = h - oy > 720 ? Math.ceil((h - oy - 690) / S) : 0
  const nx = NX + L + R, ny = NY + T + B
  let taps = null, wts = null
  if (nx !== NX || ny !== NY) {
    taps = new Int32Array(nx * ny * 16)
    wts = new Float32Array(nx * ny * 16)
    // the grain's direction, and the frame (px)
    const n = Math.hypot(1, FLOW)
    const dx = 1 / n, dy = -FLOW / n
    const X1 = 960, Y1 = 720
    for (let J = 0; J < ny; J++)
      for (let I = 0; I < nx; I++) {
        const q = (J * nx + I) * 16
        const i = I - L, j = J - T
        if (i >= 1 && i <= NX - 2 && j >= 1 && j <= NY - 2) {
          // a fitted point inside the frame: itself
          taps[q] = (j * NX + i) * 3
          wts[q] = 1
          continue
        }
        // the point (px), along the grain to where its line meets the frame: [l0, l1]
        let x = (i - 1) * S, y = (j - 1) * S
        const l0 = Math.max(-x / dx, (Y1 - y) / dy)
        const l1 = Math.min((X1 - x) / dx, -y / dy)
        if (x >= 0 && x <= X1 && y >= 0 && y <= Y1) {
          // (inside already: the fitted ring's points on the frame's edge lines)
        } else if (l0 <= l1) {
          const l = l0 > 0 ? l0 : l1
          x += l * dx
          y += l * dy
        } else if (FLOW * x + y < (FLOW * X1 + Y1) / 2) x = 0, y = 0 // passes above the top left corner
        else x = X1, y = Y1 // below the bottom right one
        x = Math.max(0, Math.min(X1, x))
        y = Math.max(0, Math.min(Y1, y))
        // the fitted field there: the lattice's B-spline (as the shader evaluates it)
        const ux = x / S + 1, uy = y / S + 1
        const bx = Math.floor(ux), by = Math.floor(uy)
        const wx = bw(ux - bx), wy = bw(uy - by)
        for (let b2 = 0; b2 < 4; b2++)
          for (let a2 = 0; a2 < 4; a2++) {
            const ci = Math.max(0, Math.min(NX - 1, bx - 1 + a2)), cj = Math.max(0, Math.min(NY - 1, by - 1 + b2))
            taps[q + b2 * 4 + a2] = (cj * NX + ci) * 3
            wts[q + b2 * 4 + a2] = wx[a2] * wy[b2]
          }
      }
  }
  const tx = Math.ceil(w / TS), ty = Math.ceil(h / TS)
  const mc = Math.max(MC, Math.ceil((w * (MC - 1)) / 960) + 1)
  const colB = new Float32Array(mc * 4)
  const colD = new Float32Array(mc * 4)
  const colI = new Int32Array(mc)
  const colRun = new Float32Array(mc)
  for (let c = 0; c < mc; c++) {
    const xs = (c * 960) / (MC - 1) - ox
    const x = Math.max(0, Math.min(960, xs))
    const u = (x - BX0) / BSX + 1
    const i = Math.floor(u)
    const f = u - i
    colI[c] = i - 1
    colRun[c] = xs - x
    colB.set([(1 - f) ** 3 / 6, (3 * f ** 3 - 6 * f ** 2 + 4) / 6, (-3 * f ** 3 + 3 * f ** 2 + 3 * f + 1) / 6, f ** 3 / 6], c * 4)
    colD.set([-((1 - f) ** 2) / 2 / BSX, (9 * f ** 2 - 12 * f) / 6 / BSX, (-9 * f ** 2 + 6 * f + 3) / 6 / BSX, f ** 2 / 2 / BSX], c * 4)
  }
  return {
    w, h, ox, oy, L, T, nx, ny, taps, wts,
    grid: taps ? new Float32Array(nx * ny * 3) : null,
    tx, ty, tileMask: new Uint32Array(tx * ty * 4),
    mc, colB, colD, colI, colRun, ribY: new Float32Array(mc * 2),
  }
}

// the fitted lattice g (NX x NY) carried out to the view's lattice
function extendGrid(v, g) {
  if (!v.taps) return g
  const { taps, wts, grid } = v
  for (let p = 0, q = 0; p < grid.length; p += 3, q += 16) {
    let r = 0, gg = 0, bb = 0
    for (let m = q; m < q + 16; m++) {
      const wm = wts[m]
      if (wm === 0) continue
      const a = taps[m]
      r += wm * g[a]
      gg += wm * g[a + 1]
      bb += wm * g[a + 2]
    }
    grid[p] = r
    grid[p + 1] = gg
    grid[p + 2] = bb
  }
  return grid
}

let grid = null
let grid2 = null
let rib = null
let ribTex = null // Float32Array (KX+1) x MAXR x RGBA: per ribbon its control points
// (y, r, g, b amplitude) and, in the last column, 1/(2 sigma^2): ~10 KB per frame to upload

// One slot at aurora frame a into `out` (PER values): Catmull-Rom over keys i1-1..i1+2 that
// never reads a key across a switch; a missing key continues the centreline linearly from the
// near side and holds the rest. part 0: the ribbon of key i1, part 1: the ribbon of key i1+1
// (only where a switch lies between them). Returns the part's weight: 1 and 0 without a switch,
// a smoothstep crossfade over the interval with one.
let Q = null
function slotAt(sl, a, part, out) {
  const K = ribbonKeys.length
  const u = (a - 1) / KEY_STEP
  const i1 = Math.max(0, Math.min(K - 1, Math.floor(u)))
  const f = Math.max(0, Math.min(1, u - i1))
  const o = sl * PER
  const sw = (k) => k > 0 && k < K && switches[sl * K + k] === 1 // between keys k - 1 and k
  const copy = (q, k) => {
    const src = ribbonKeys[Math.max(0, Math.min(K - 1, k))]
    for (let v = 0; v < PER; v++) q[v] = src[o + v]
  }
  const cont = (q, near, far) => {
    for (let v = 0; v < PER; v++) q[v] = v < KX ? 2 * near[v] - far[v] : near[v]
  }
  const [q0, q1, q2, q3] = Q
  if (part === 0) {
    copy(q1, i1)
    if (!sw(i1)) copy(q0, i1 - 1)
    else if (sw(i1 + 1)) cont(q0, q1, q1)
    else copy(q2, i1 + 1), cont(q0, q1, q2)
    if (sw(i1 + 1)) cont(q2, q1, q0), cont(q3, q2, q1)
    else if (copy(q2, i1 + 1), sw(i1 + 2)) cont(q3, q2, q1)
    else copy(q3, i1 + 2)
  } else {
    copy(q2, i1 + 1)
    if (sw(i1 + 2)) cont(q3, q2, q2)
    else copy(q3, i1 + 2)
    cont(q1, q2, q3)
    cont(q0, q1, q2)
  }
  const f2 = f * f, f3 = f2 * f
  const w0 = -0.5 * f3 + f2 - 0.5 * f
  const w1 = 1.5 * f3 - 2.5 * f2 + 1
  const w2 = -1.5 * f3 + 2 * f2 + 0.5 * f
  const w3 = 0.5 * f3 - 0.5 * f2
  for (let v = 0; v < PER; v++) out[v] = w0 * q0[v] + w1 * q1[v] + w2 * q2[v] + w3 * q3[v]
  if (!sw(i1 + 1)) return part === 0 ? 1 : 0
  const sm = f * f * (3 - 2 * f)
  return part === 0 ? 1 - sm : sm
}

// evaluate the ribbons of aurora frame a, amplitudes scaled by w, into rows from `row`, marking
// the view's tiles each one reaches
function ribbonsAt(v, a, w0, row) {
  if (!ribbonKeys || w0 <= 0) return row
  if (!rib) {
    rib = new Float32Array(2 * PER)
    ribTex = new Float32Array((KX + 1) * MAXR * 4)
    Q = [0, 1, 2, 3].map(() => new Float32Array(PER))
  }
  const { mc, colB, colD, colI, colRun, ribY, tileMask, tx: TX, ty: TY, oy } = v
  for (let s = 0, part = 0; s < NS && row < MAXR; part ? (s++, (part = 0)) : (part = 1)) {
    const wp = slotAt(s, a, part, rib)
    if (part === 0 && wp === 1) part = 1 // no switch here: the slot is one ribbon
    if (wp <= 0) continue
    const w = w0 * wp
    const o = 0
    let amax = 0
    for (let q = KX; q < 4 * KX; q++) amax = Math.max(amax, Math.abs(rib[o + q]))
    if (amax * w < 0.5) continue
    const sig = Math.max(0.8, rib[o + 4 * KX])
    const inv = 1 / (2 * sig * sig)
    const r0 = row * (KX + 1) * 4
    for (let k = 0; k < KX; k++) {
      ribTex[r0 + k * 4] = rib[o + k]
      ribTex[r0 + k * 4 + 1] = (w * rib[o + KX + k]) / 255
      ribTex[r0 + k * 4 + 2] = (w * rib[o + 2 * KX + k]) / 255
      ribTex[r0 + k * 4 + 3] = (w * rib[o + 3 * KX + k]) / 255
    }
    ribTex[r0 + KX * 4] = inv
    for (let c = 0; c < mc; c++) {
      let y = 0, dy = 0
      for (let m = 0; m < 4; m++) {
        const k = Math.max(0, Math.min(KX - 1, colI[c] + m))
        y += colB[c * 4 + m] * rib[o + k]
        dy += colD[c * 4 + m] * rib[o + k]
      }
      // (past the frame's sides: along the tangent at the side; stage px)
      ribY[c * 2] = y + dy * colRun[c] + oy
      ribY[c * 2 + 1] = 1 / Math.sqrt(1 + dy * dy)
    }
    // mark the tiles this ribbon reaches
    const word = row >> 5
    const bit = (1 << (row & 31)) >>> 0
    for (let tx = 0; tx < TX; tx++) {
      const c0 = Math.max(0, Math.floor(((tx * TS) / 960) * (MC - 1)) - 1)
      const c1 = Math.min(mc - 1, Math.ceil((((tx + 1) * TS) / 960) * (MC - 1)) + 1)
      let lo = Infinity, hi = -Infinity
      for (let c = c0; c <= c1; c++) {
        const y = ribY[c * 2]
        const ext = (REACH * sig) / ribY[c * 2 + 1] + 1 // +1 px: the curve between mask columns
        if (y - ext < lo) lo = y - ext
        if (y + ext > hi) hi = y + ext
      }
      const ty0 = Math.max(0, Math.floor(lo / TS))
      const ty1 = Math.min(TY - 1, Math.floor(hi / TS))
      for (let ty = ty0; ty <= ty1; ty++) tileMask[(ty * TX + tx) * 4 + word] |= bit
    }
    row++
  }
  return row
}

// ------------------------------------------------------------------ shader
const VS = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uGrid;   // the lattice's control points (RGB)
uniform sampler2D uRib;    // (KX+1) x MAXR: control points (y, Ar, Ag, Ab), then 1/(2 s^2)
uniform highp usampler2D uTiles; // per 30 px tile of the stage: bitmask of the ribbons that reach it
uniform int uCount;
uniform float uDim;
uniform vec2 uSize;        // the stage (px)
uniform vec2 uOff;         // the frame's corner in it
uniform vec2 uLat;         // the fitted lattice's first column and row in the lattice
uniform ivec2 uGridMax;    // the lattice's last column and row
uniform ivec2 uTileMax;    // the last tile column and row

const float S = ${S}.0;
vec3 cp(int i, int j) {
  i = clamp(i, 0, uGridMax.x); j = clamp(j, 0, uGridMax.y);
  return texelFetch(uGrid, ivec2(i, j), 0).rgb;
}
vec4 bw(float f) {
  float f2 = f * f, f3 = f2 * f;
  return vec4((1.0 - f) * (1.0 - f) * (1.0 - f), 3.0 * f3 - 6.0 * f2 + 4.0, -3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0, f3) / 6.0;
}
vec3 coarse(vec2 p) {
  vec2 u = p / S + 1.0 + uLat;
  vec2 b = floor(u);
  vec2 f = u - b;
  vec4 wx = bw(f.x), wy = bw(f.y);
  ivec2 i0 = ivec2(b) - 1;
  vec3 acc = vec3(0.0);
  for (int a = 0; a < 4; a++) {
    vec3 row = cp(i0.x, i0.y + a) * wx.x + cp(i0.x + 1, i0.y + a) * wx.y + cp(i0.x + 2, i0.y + a) * wx.z + cp(i0.x + 3, i0.y + a) * wx.w;
    acc += row * wy[a];
  }
  return acc;
}

void main() {
  vec2 q = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y); // stage px
  vec2 p = q - uOff; // frame px
  vec3 col = coarse(p);
  // the ribbons are cubic B-splines in x (KX control points, BSX apart): the basis weights and
  // their x derivative depend only on the pixel's x, so they are computed once here; past the
  // frame's sides a ribbon runs on along its tangent there (run), its colour held
  float xc = clamp(p.x, 0.0, 960.0);
  float run = p.x - xc;
  float ru = (xc - ${BX0}.0) / ${BSX.toFixed(6)} + 1.0;
  float rf = ru - floor(ru);
  int ri = int(floor(ru)) - 1;
  vec4 wb = bw(rf);
  vec4 wd = vec4(-(1.0 - rf) * (1.0 - rf) * 0.5, (9.0 * rf * rf - 12.0 * rf) / 6.0, (-9.0 * rf * rf + 6.0 * rf + 3.0) / 6.0, rf * rf * 0.5) / ${BSX.toFixed(6)};
  ivec4 ks = clamp(ivec4(ri, ri + 1, ri + 2, ri + 3), 0, ${KX - 1});
  uvec4 m = texelFetch(uTiles, ivec2(clamp(int(q.x / ${TS}.0), 0, uTileMax.x), clamp(int(q.y / ${TS}.0), 0, uTileMax.y)), 0);
  for (int w = 0; w < ${MAXR / 32}; w++) {
    uint bits = m[w];
    while (bits != 0u) {
      uint low = bits & (~bits + 1u);   // lowest set bit (GLSL ES 3.00 has no findLSB)
      int i = w * 32 + int(floor(log2(float(low)) + 0.5));
      bits ^= low;
      vec4 c0 = texelFetch(uRib, ivec2(ks.x, i), 0);
      vec4 c1 = texelFetch(uRib, ivec2(ks.y, i), 0);
      vec4 c2 = texelFetch(uRib, ivec2(ks.z, i), 0);
      vec4 c3 = texelFetch(uRib, ivec2(ks.w, i), 0);
      vec4 ys = vec4(c0.x, c1.x, c2.x, c3.x);
      float dy = dot(wd, ys);
      float y = dot(wb, ys) + dy * run;
      float d = (p.y - y) * inversesqrt(1.0 + dy * dy);
      float e = d * d * texelFetch(uRib, ivec2(${KX}, i), 0).x;
      if (e > ${CUT}.0) continue;
      vec3 amp = wb.x * c0.yzw + wb.y * c1.yzw + wb.z * c2.yzw + wb.w * c3.yzw;
      col += amp * exp(-e);
    }
  }
  outColor = vec4(col * uDim, 1.0);
}`

function compile(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
  return s
}

const FRAME_VIEW = { w: 960, h: 720, ox: 0, oy: 0 }

export class AuroraRenderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: false })
    this.gl = gl
    this.canvas = canvas
    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
    this.prog = prog
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'aPos')
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    // textures are allocated once per stage size (immutable storage) and only updated with
    // texSubImage2D, so a frame never reallocates GPU memory (reallocating ~1 MB per frame could
    // stall behind other GPU work, e.g. right after the desktop releases its resources)
    this.ribTex = this.texture()
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, KX + 1, MAXR)
    this.tex = null
    this.tileTex = null
    this.view = null
    this.u = {}
    for (const n of ['uGrid', 'uRib', 'uTiles', 'uCount', 'uDim', 'uSize', 'uOff', 'uLat', 'uGridMax', 'uTileMax']) this.u[n] = gl.getUniformLocation(prog, n)
  }

  texture() {
    const gl = this.gl
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }

  // the lattice and tile textures for a stage size (new ones when the size changes)
  setView({ w, h, ox, oy }) {
    const v = this.view
    if (v && v.w === w && v.h === h && v.ox === ox && v.oy === oy) return v
    const gl = this.gl
    const nv = makeView(w, h, ox, oy)
    if (!v || v.nx !== nv.nx || v.ny !== nv.ny) {
      if (this.tex) gl.deleteTexture(this.tex)
      this.tex = this.texture()
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB32F, nv.nx, nv.ny)
    }
    if (!v || v.tx !== nv.tx || v.ty !== nv.ty) {
      if (this.tileTex) gl.deleteTexture(this.tileTex)
      this.tileTex = this.texture()
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32UI, nv.tx, nv.ty)
    }
    this.view = nv
    return nv
  }

  // the context's GPU memory goes now (Aurora.jsx: while the login screen is away)
  dispose() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
    this.gl = null
  }

  // t: clock time; pw x ph: the canvas's pixels; view: the stage (w x h px) the canvas covers and
  // the video frame's corner in it (ox, oy)
  render(t, pw, ph, view = FRAME_VIEW) {
    const { gl, canvas } = this
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw
      canvas.height = ph
    }
    const v = this.setView(view)
    const a = auroraFrame(t)
    // loop seam: over the last XFADE frames blend into the frames just before LOOP_A
    const xw = t > 1 ? Math.max(0, Math.min(1, (a - (LOOP_B - XFADE)) / XFADE)) : 0
    const xs = xw * xw * (3 - 2 * xw)
    if (coarseKeys && !grid) {
      grid = new Float32Array(NX * NY * 3)
      grid2 = new Float32Array(NX * NY * 3)
    }
    let g = coarseKeys ? interpKeys(coarseKeys, a, grid, COARSE_STEP) : null
    if (g && xs > 0) {
      interpKeys(coarseKeys, a - (LOOP_B - LOOP_A), grid2, COARSE_STEP)
      for (let q = 0; q < g.length; q++) g[q] += (grid2[q] - g[q]) * xs
    }
    if (g) g = extendGrid(v, g)
    v.tileMask.fill(0)
    let n = ribbonsAt(v, a, 1 - xs, 0)
    n = ribbonsAt(v, a - (LOOP_B - LOOP_A), xs, n)
    gl.viewport(0, 0, pw, ph)
    gl.useProgram(this.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    if (g) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, v.nx, v.ny, gl.RGB, gl.FLOAT, g)
    gl.uniform1i(this.u.uGrid, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.ribTex)
    if (n) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, KX + 1, n, gl.RGBA, gl.FLOAT, ribTex.subarray(0, (KX + 1) * n * 4))
    gl.uniform1i(this.u.uRib, 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.tileTex)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, v.tx, v.ty, gl.RGBA_INTEGER, gl.UNSIGNED_INT, v.tileMask)
    gl.uniform1i(this.u.uTiles, 2)
    gl.uniform1i(this.u.uCount, n)
    gl.uniform1f(this.u.uDim, g ? 1 : 0)
    gl.uniform2f(this.u.uSize, v.w, v.h)
    gl.uniform2f(this.u.uOff, v.ox, v.oy)
    gl.uniform2f(this.u.uLat, v.L, v.T)
    gl.uniform2i(this.u.uGridMax, v.nx - 1, v.ny - 1)
    gl.uniform2i(this.u.uTileMax, v.tx - 1, v.ty - 1)
    gl.bindVertexArray(this.vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}
