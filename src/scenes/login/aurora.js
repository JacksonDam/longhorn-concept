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
// On a taller stage (core/Stage.jsx: a portrait screen) the frame is scaled up uniformly to the
// stage's height, centred across and cropped at its sides (Aurora.jsx), ribbons wider and faster
// with it. On a wider one (core/Stage.jsx: the frame widened; the login places the frame at an
// offset in it, layout.js frameOffset) the field runs on beyond the frame's sides, unstretched:
// - the coarse field is a wider lattice: the fitted control points inside the frame stay, and
//   every other one takes the fitted field's colour where a line through it along the field's
//   grain enters the frame (FLOW: its colour bands rise to the right at ~0.36, the direction in
//   which it varies least, 7-17 times less than across; structure tensor over all keys), or the
//   colour of the frame's corner that line passes nearest, settling further out to that corner's
//   colour averaged over the loop. So its bands carry on in their own direction, and past the top
//   left and the bottom right corners the light holds their colours.
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
const FAR = 240 // px across the grain past a corner's line over which its colour gives way to its steady one

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
let cornerSteady = null // [[r, g, b] top left, [r, g, b] bottom right]: see keysReady

const bw = (f) => [(1 - f) ** 3 / 6, (3 * f ** 3 - 6 * f ** 2 + 4) / 6, (-3 * f ** 3 + 3 * f ** 2 + 3 * f + 1) / 6, f ** 3 / 6]
// the fitted lattice g's B-spline at frame px (x, y), as the shader evaluates it: its 16 taps
// (index into g, weight) into `taps` / `wts` from `q`, or its colour when no taps are given
function fieldAt(g, x, y, taps = null, wts = null, q = 0) {
  const ux = x / S + 1, uy = y / S + 1
  const bx = Math.floor(ux), by = Math.floor(uy)
  const wx = bw(ux - bx), wy = bw(uy - by)
  const out = [0, 0, 0]
  for (let b2 = 0; b2 < 4; b2++)
    for (let a2 = 0; a2 < 4; a2++) {
      const ci = Math.max(0, Math.min(NX - 1, bx - 1 + a2)), cj = Math.max(0, Math.min(NY - 1, by - 1 + b2))
      const t = (cj * NX + ci) * 3, w = wx[a2] * wy[b2]
      if (taps) {
        taps[q + b2 * 4 + a2] = t
        wts[q + b2 * 4 + a2] = w
      } else for (let ch = 0; ch < 3; ch++) out[ch] += w * g[t + ch]
    }
  return out
}
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
    // the frame's top left and bottom right corners' colours averaged over the loop (keys from
    // LOOP_A to LOOP_B): what the field beyond them settles to (makeView), unmoved by the light
    // that passes through the corners now and then (a swell lights the top left at 385-420)
    cornerSteady = [[0, 0], [960, 720]].map(([x, y]) => {
      const sum = [0, 0, 0]
      let cnt = 0
      for (let k = 0; k < K; k++) {
        const f = k * COARSE_STEP + 1
        if (f < LOOP_A || f > LOOP_B) continue
        const c = fieldAt(coarseKeys[k], x, y)
        for (let ch = 0; ch < 3; ch++) sum[ch] += c[ch]
        cnt++
      }
      return sum.map((v) => v / cnt)
    })
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
//        colour where the line through it along the grain enters the frame: its 16 B-spline taps
//        into the fitted lattice (index, weight). A line that misses the frame passes it by its
//        top left or bottom right corner: the corner's colour, giving way over FAR px further
//        across the grain to the corner's steady colour (far: corner, weight). All null at the
//        frame's own size: the fitted lattice itself.
//   tiles: tx x ty ribbon-mask tiles over the stage
//   columns: mc mask columns over the stage (the frame's MC spacing), each with its frame x
//        clamped to the frame (B-spline basis there, colB / colD / colI) and the run past it (colRun)
function makeView(w, h, ox, oy, k) {
  // the stage's edges in frame px
  const fx0 = -ox / k, fy0 = -oy / k, fx1 = (w - ox) / k, fy1 = (h - oy) / k
  const L = fx0 < 0 ? Math.ceil(-fx0 / S) : 0
  const T = fy0 < 0 ? Math.ceil(-fy0 / S) : 0
  const R = fx1 > 960 ? Math.ceil((fx1 - 930) / S) : 0
  const B = fy1 > 720 ? Math.ceil((fy1 - 690) / S) : 0
  const nx = NX + L + R, ny = NY + T + B
  let taps = null, wts = null, far = null
  if (nx !== NX || ny !== NY) {
    taps = new Int32Array(nx * ny * 16)
    wts = new Float32Array(nx * ny * 16)
    far = new Float32Array(nx * ny * 2) // (corner 0 | 1, how much of its steady colour)
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
        const u = (FLOW * x + y) / n // across the grain (px; the top left corner's line at 0)
        const l0 = Math.max(-x / dx, (Y1 - y) / dy)
        const l1 = Math.min((X1 - x) / dx, -y / dy)
        if (x >= 0 && x <= X1 && y >= 0 && y <= Y1) {
          // (inside already: the fitted ring's points on the frame's edge lines)
        } else if (l0 <= l1) {
          const l = l0 > 0 ? l0 : l1
          x += l * dx
          y += l * dy
        } else {
          // passes the frame by a corner: its colour, giving way further out to its steady colour
          const c = u < (FLOW * X1 + Y1) / n / 2 ? 0 : 1
          const dist = c ? u - (FLOW * X1 + Y1) / n : -u
          const m = Math.max(0, Math.min(1, dist / FAR))
          far[(J * nx + I) * 2] = c
          far[(J * nx + I) * 2 + 1] = m * m * (3 - 2 * m)
          x = c ? X1 : 0
          y = c ? Y1 : 0
        }
        x = Math.max(0, Math.min(X1, x))
        y = Math.max(0, Math.min(Y1, y))
        // the fitted field there
        fieldAt(null, x, y, taps, wts, q)
      }
  }
  const tx = Math.ceil(w / TS), ty = Math.ceil(h / TS)
  const mc = Math.max(MC, Math.ceil((w * (MC - 1)) / 960) + 1)
  const colB = new Float32Array(mc * 4)
  const colD = new Float32Array(mc * 4)
  const colI = new Int32Array(mc)
  const colRun = new Float32Array(mc)
  for (let c = 0; c < mc; c++) {
    const xs = ((c * 960) / (MC - 1) - ox) / k
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
    w, h, ox, oy, k, L, T, nx, ny, taps, wts, far,
    grid: taps ? new Float32Array(nx * ny * 3) : null,
    tx, ty, tileMask: new Uint32Array(tx * ty * 4),
    mc, colB, colD, colI, colRun, ribY: new Float32Array(mc * 2),
  }
}

// the fitted lattice g (NX x NY) carried out to the view's lattice
function extendGrid(v, g) {
  if (!v.taps) return g
  const { taps, wts, far, grid } = v
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
    const k = (p / 3) * 2
    const m = far[k + 1]
    if (m > 0 && cornerSteady) {
      const c = cornerSteady[far[k]]
      r += (c[0] - r) * m
      gg += (c[1] - gg) * m
      bb += (c[2] - bb) * m
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
  const { mc, colB, colD, colI, colRun, ribY, tileMask, tx: TX, ty: TY, oy, k: sc } = v
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
      ribY[c * 2] = (y + dy * colRun[c]) * sc + oy
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
        const ext = (REACH * sig * sc) / ribY[c * 2 + 1] + 1 // +1 px: the curve between mask columns
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

// ------------------------------------------------------------------ shaders
// Two passes where the GPU can render to float textures (EXT_color_buffer_float), one otherwise.
// What a ribbon is at a pixel column (its centreline, slope and colour) and the coarse field's
// lattice rows summed across (the separable B-spline's x half) are the same for every pixel of
// the column, so a first pass works them out once per canvas column (the canvas's width x the
// ribbon rows, then x the lattice rows: a few hundred thousand fragments) and the second pass
// per pixel only looks them up: 4 fetches for the coarse colour instead of 16, and per candidate
// ribbon 1 fetch and a few operations (2 fetches when it reaches the pixel) instead of 5 fetches
// and two B-spline evaluations. Full resolution on a 2x laptop screen is ~6 Mpx a frame: the
// single pass cost ~4 ms of GPU there, the two ~1.5 ms. Same values either way (the same
// operations, split), so the fallback draws the same picture.
const VS = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`

const COMMON = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uGrid;   // the lattice's control points (RGB)
uniform sampler2D uRib;    // (KX+1) x MAXR: control points (y, Ar, Ag, Ab), then 1/(2 s^2)
uniform highp usampler2D uTiles; // per 30 px tile of the stage: bitmask of the ribbons that reach it
uniform float uDim;
uniform vec2 uSize;        // the stage (px)
uniform vec2 uOff;         // the frame's corner in it
uniform float uScale;      // stage px per frame px
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
// the coarse field's lattice row j summed across at frame x (the B-spline's x half)
vec3 coarseRow(float x, int j) {
  float u = x / S + 1.0 + uLat.x;
  float b = floor(u);
  vec4 wx = bw(u - b);
  int i0 = int(b) - 1;
  return cp(i0, j) * wx.x + cp(i0 + 1, j) * wx.y + cp(i0 + 2, j) * wx.z + cp(i0 + 3, j) * wx.w;
}
// the lattice rows a pixel at frame y blends (from j0) and their weights
void coarseRows(float y, out int j0, out vec4 wy) {
  float u = y / S + 1.0 + uLat.y;
  float b = floor(u);
  wy = bw(u - b);
  j0 = int(b) - 1;
}
// ribbon i at frame x: centreline y, 1/(2 s^2) over the slope term (e = (py - y)^2 q), colour.
// The ribbons are cubic B-splines in x (KX control points, BSX apart); past the frame's sides a
// ribbon runs on along its tangent there (run), its colour held.
void ribbonAt(float x, int i, out float y, out float q, out vec3 amp) {
  float xc = clamp(x, 0.0, 960.0);
  float run = x - xc;
  float ru = (xc - ${BX0}.0) / ${BSX.toFixed(6)} + 1.0;
  float rf = ru - floor(ru);
  int ri = int(floor(ru)) - 1;
  vec4 wb = bw(rf);
  vec4 wd = vec4(-(1.0 - rf) * (1.0 - rf) * 0.5, (9.0 * rf * rf - 12.0 * rf) / 6.0, (-9.0 * rf * rf + 6.0 * rf + 3.0) / 6.0, rf * rf * 0.5) / ${BSX.toFixed(6)};
  ivec4 ks = clamp(ivec4(ri, ri + 1, ri + 2, ri + 3), 0, ${KX - 1});
  vec4 c0 = texelFetch(uRib, ivec2(ks.x, i), 0);
  vec4 c1 = texelFetch(uRib, ivec2(ks.y, i), 0);
  vec4 c2 = texelFetch(uRib, ivec2(ks.z, i), 0);
  vec4 c3 = texelFetch(uRib, ivec2(ks.w, i), 0);
  vec4 ys = vec4(c0.x, c1.x, c2.x, c3.x);
  float dy = dot(wd, ys);
  y = dot(wb, ys) + dy * run;
  q = texelFetch(uRib, ivec2(${KX}, i), 0).x / (1.0 + dy * dy);
  amp = wb.x * c0.yzw + wb.y * c1.yzw + wb.z * c2.yzw + wb.w * c3.yzw;
}
// the pixel's stage and frame px
vec2 stagePx() { return vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y); }
uvec4 tileMask(vec2 q) {
  return texelFetch(uTiles, ivec2(clamp(int(q.x / ${TS}.0), 0, uTileMax.x), clamp(int(q.y / ${TS}.0), 0, uTileMax.y)), 0);
}
// lowest set bit's index, cleared (GLSL ES 3.00 has no findLSB): the bit alone as a float is an
// exact power of two, whose exponent field is the index
int lowBit(inout uint bits) {
  uint low = bits & (~bits + 1u);
  bits ^= low;
  return int(floatBitsToUint(float(low)) >> 23u) - 127;
}
`

// one pass: everything per pixel
const FS_ONE = `${COMMON}
out vec4 outColor;
void main() {
  vec2 q = stagePx();
  vec2 p = (q - uOff) / uScale; // frame px
  int j0; vec4 wy;
  coarseRows(p.y, j0, wy);
  vec3 col = vec3(0.0);
  for (int a = 0; a < 4; a++) col += coarseRow(p.x, j0 + a) * wy[a];
  uvec4 m = tileMask(q);
  for (int w = 0; w < ${MAXR / 32}; w++) {
    uint bits = m[w];
    while (bits != 0u) {
      int i = w * 32 + lowBit(bits);
      float y, k; vec3 amp;
      ribbonAt(p.x, i, y, k, amp);
      float d = p.y - y;
      float e = d * d * k;
      if (e > ${CUT}.0) continue;
      col += amp * exp(-e);
    }
  }
  outColor = vec4(col * uDim, 1.0);
}`

// two passes, 1: per canvas column (x) and row: rows 0..MAXR-1 the ribbons (o0: y, q; o1: colour),
// rows MAXR.. the lattice rows summed across (o1)
const FS_COLS = `${COMMON}
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
void main() {
  float x = (stagePx().x - uOff.x) / uScale;
  int row = int(gl_FragCoord.y);
  if (row < ${MAXR}) {
    float y, k; vec3 amp;
    ribbonAt(x, row, y, k, amp);
    o0 = vec4(y, k, 0.0, 0.0);
    o1 = vec4(amp, 0.0);
  } else {
    o0 = vec4(0.0);
    o1 = vec4(coarseRow(x, row - ${MAXR}), 0.0);
  }
}`

// 2: per pixel, from its column's
const FS_MAIN = `${COMMON}
uniform highp sampler2D uCol0;
uniform highp sampler2D uCol1;
out vec4 outColor;
void main() {
  vec2 q = stagePx();
  vec2 p = (q - uOff) / uScale; // frame px
  int cx = int(gl_FragCoord.x);
  int j0; vec4 wy;
  coarseRows(p.y, j0, wy);
  vec3 col = vec3(0.0);
  for (int a = 0; a < 4; a++) col += texelFetch(uCol1, ivec2(cx, ${MAXR} + clamp(j0 + a, 0, uGridMax.y)), 0).rgb * wy[a];
  uvec4 m = tileMask(q);
  for (int w = 0; w < ${MAXR / 32}; w++) {
    uint bits = m[w];
    while (bits != 0u) {
      int i = w * 32 + lowBit(bits);
      vec2 r = texelFetch(uCol0, ivec2(cx, i), 0).xy;
      float d = p.y - r.x;
      float e = d * d * r.y;
      if (e > ${CUT}.0) continue;
      col += texelFetch(uCol1, ivec2(cx, i), 0).rgb * exp(-e);
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

const UNIFORMS = ['uGrid', 'uRib', 'uTiles', 'uDim', 'uSize', 'uOff', 'uScale', 'uLat', 'uGridMax', 'uTileMax', 'uCol0', 'uCol1']
function program(gl, vs, fs) {
  const prog = gl.createProgram()
  gl.attachShader(prog, vs)
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs))
  gl.bindAttribLocation(prog, 0, 'aPos')
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
  const u = {}
  for (const n of UNIFORMS) u[n] = gl.getUniformLocation(prog, n)
  return { prog, u }
}

const FRAME_VIEW = { w: 960, h: 720, ox: 0, oy: 0, k: 1 }
// local comparison aid: ?aurora=one draws in one pass where two would do
const ONE_PASS = new URLSearchParams(location.search).get('aurora') === 'one'

export class AuroraRenderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: false })
    this.gl = gl
    this.canvas = canvas
    const vs = compile(gl, gl.VERTEX_SHADER, VS)
    this.two = !ONE_PASS && !!gl.getExtension('EXT_color_buffer_float')
    if (this.two) {
      this.cols = program(gl, vs, FS_COLS)
      this.main = program(gl, vs, FS_MAIN)
    } else this.one = program(gl, vs, FS_ONE)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    // textures are allocated once per stage or canvas size (immutable storage) and only updated
    // with texSubImage2D, so a frame never reallocates GPU memory (reallocating ~1 MB per frame
    // could stall behind other GPU work, e.g. right after the desktop releases its resources)
    this.ribTex = this.texture()
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, KX + 1, MAXR)
    this.tex = null
    this.tileTex = null
    this.view = null
    this.fb = null // the column pass's target: { w, h, fbo, col0, col1 }
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
  setView({ w, h, ox, oy, k = 1 }) {
    const v = this.view
    if (v && v.w === w && v.h === h && v.ox === ox && v.oy === oy && v.k === k) return v
    const gl = this.gl
    const nv = makeView(w, h, ox, oy, k)
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

  // the column pass's target for a canvas width and lattice height: RG32F (centreline, q) and
  // RGBA16F (colours; ~0.1 of a level at most), canvas width x (MAXR + lattice rows); false when
  // the GPU can't draw into them (then one pass)
  columns(pw, ny) {
    const gl = this.gl
    const h = MAXR + ny
    if (this.fb && this.fb.w === pw && this.fb.h === h) return this.fb.ok ? this.fb : null
    if (this.fb) {
      gl.deleteFramebuffer(this.fb.fbo)
      gl.deleteTexture(this.fb.col0)
      gl.deleteTexture(this.fb.col1)
      this.fb = null
    }
    if (pw > gl.getParameter(gl.MAX_TEXTURE_SIZE)) return null
    const col0 = this.texture()
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG32F, pw, h)
    const col1 = this.texture()
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, pw, h)
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, col0, 0)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, col1, 0)
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1])
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.fb = { w: pw, h, fbo, col0, col1, ok }
    return ok ? this.fb : null
  }

  // the context's GPU memory goes now (Aurora.jsx: while the login screen is away)
  dispose() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
    this.gl = null
  }

  uniforms(p, v, g) {
    const { gl } = this
    const u = p.u
    gl.uniform1i(u.uGrid, 0)
    gl.uniform1i(u.uRib, 1)
    gl.uniform1i(u.uTiles, 2)
    gl.uniform1i(u.uCol0, 3)
    gl.uniform1i(u.uCol1, 4)
    gl.uniform1f(u.uDim, g ? 1 : 0)
    gl.uniform2f(u.uSize, v.w, v.h)
    gl.uniform2f(u.uOff, v.ox, v.oy)
    gl.uniform1f(u.uScale, v.k)
    gl.uniform2f(u.uLat, v.L, v.T)
    gl.uniform2i(u.uGridMax, v.nx - 1, v.ny - 1)
    gl.uniform2i(u.uTileMax, v.tx - 1, v.ty - 1)
  }

  // t: clock time; pw x ph: the canvas's pixels; view: the stage (w x h px) the canvas covers, the
  // video frame's corner in it (ox, oy) and its scale (k stage px per frame px)
  render(t, pw, ph, view = FRAME_VIEW) {
    const { gl, canvas } = this
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw
      canvas.height = ph
    }
    // (new textures first: creating one binds it on the active unit)
    const v = this.setView(view)
    const fb = this.two ? this.columns(pw, v.ny) : null
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
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    if (g) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, v.nx, v.ny, gl.RGB, gl.FLOAT, g)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.ribTex)
    if (n) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, KX + 1, n, gl.RGBA, gl.FLOAT, ribTex.subarray(0, (KX + 1) * n * 4))
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.tileTex)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, v.tx, v.ty, gl.RGBA_INTEGER, gl.UNSIGNED_INT, v.tileMask)
    gl.bindVertexArray(this.vao)
    if (fb) {
      // pass 1: the ribbons in use and the lattice rows, per canvas column
      gl.activeTexture(gl.TEXTURE3)
      gl.bindTexture(gl.TEXTURE_2D, null)
      gl.activeTexture(gl.TEXTURE4)
      gl.bindTexture(gl.TEXTURE_2D, null)
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb.fbo)
      gl.viewport(0, 0, pw, fb.h)
      gl.useProgram(this.cols.prog)
      this.uniforms(this.cols, v, g)
      gl.enable(gl.SCISSOR_TEST)
      if (n) {
        gl.scissor(0, 0, pw, n)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      gl.scissor(0, MAXR, pw, v.ny)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.disable(gl.SCISSOR_TEST)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      // pass 2: the picture
      gl.activeTexture(gl.TEXTURE3)
      gl.bindTexture(gl.TEXTURE_2D, fb.col0)
      gl.activeTexture(gl.TEXTURE4)
      gl.bindTexture(gl.TEXTURE_2D, fb.col1)
      gl.viewport(0, 0, pw, ph)
      gl.useProgram(this.main.prog)
      this.uniforms(this.main, v, g)
    } else {
      if (!this.one) this.one = program(gl, compile(gl, gl.VERTEX_SHADER, VS), FS_ONE)
      gl.viewport(0, 0, pw, ph)
      gl.useProgram(this.one.prog)
      this.uniforms(this.one, v, g)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}
