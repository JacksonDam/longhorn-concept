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
// samples the curves at MC columns for the per-tile ribbon masks.
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
const MC = 128 // columns at which JS samples the ribbons for the tile masks
const XFADE = 16 // frames: the end of the loop crossfades into the frames just before LOOP_A
const MAXR = 128

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
  }
  return !!(c && r)
})
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

// B-spline basis of the ribbon curves at the MC mask columns (and its x derivative)
const colB = new Float32Array(MC * 4)
const colD = new Float32Array(MC * 4)
const colI = new Int32Array(MC)
for (let c = 0; c < MC; c++) {
  const x = (c * 960) / (MC - 1)
  const u = (x - BX0) / BSX + 1
  const i = Math.floor(u)
  const f = u - i
  colI[c] = i - 1
  colB.set([(1 - f) ** 3 / 6, (3 * f ** 3 - 6 * f ** 2 + 4) / 6, (-3 * f ** 3 + 3 * f ** 2 + 3 * f + 1) / 6, f ** 3 / 6], c * 4)
  colD.set([-((1 - f) ** 2) / 2 / BSX, (9 * f ** 2 - 12 * f) / 6 / BSX, (-9 * f ** 2 + 6 * f + 3) / 6 / BSX, f ** 2 / 2 / BSX], c * 4)
}

// screen tiles (30 px): bitmask of the ribbons that can reach each tile, so the shader only
// evaluates those (RGBA32UI: 4 x 32 bits = MAXR ribbons)
const TS = 30
const TX = 32
const TY = 24
const tileMask = new Uint32Array(TX * TY * 4)
const CUT = 14 // exp(-14): the shader ignores a ribbon beyond this
const REACH = Math.sqrt(2 * CUT) // in sigmas

let grid = null
let grid2 = null
let rib = null
let ribTex = null // Float32Array (KX+1) x MAXR x RGBA: per ribbon its control points
// (y, r, g, b amplitude) and, in the last column, 1/(2 sigma^2): ~10 KB per frame to upload
let ribY = null // y and slope factor at the MC columns, for the tile masks

// evaluate the ribbons of aurora frame a, amplitudes scaled by w, into rows from `row`
function ribbonsAt(a, w, row) {
  if (!ribbonKeys || w <= 0) return row
  if (!rib) {
    rib = new Float32Array(NS * PER)
    ribTex = new Float32Array((KX + 1) * MAXR * 4)
    ribY = new Float32Array(MC * 2)
  }
  interpKeys(ribbonKeys, a, rib)
  for (let s = 0; s < NS && row < MAXR; s++) {
    const o = s * PER
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
    for (let c = 0; c < MC; c++) {
      let y = 0, dy = 0
      for (let m = 0; m < 4; m++) {
        const k = Math.max(0, Math.min(KX - 1, colI[c] + m))
        y += colB[c * 4 + m] * rib[o + k]
        dy += colD[c * 4 + m] * rib[o + k]
      }
      ribY[c * 2] = y
      ribY[c * 2 + 1] = 1 / Math.sqrt(1 + dy * dy)
    }
    // mark the tiles this ribbon reaches
    const word = row >> 5
    const bit = (1 << (row & 31)) >>> 0
    for (let tx = 0; tx < TX; tx++) {
      const c0 = Math.max(0, Math.floor(((tx * TS) / 960) * (MC - 1)) - 1)
      const c1 = Math.min(MC - 1, Math.ceil((((tx + 1) * TS) / 960) * (MC - 1)) + 1)
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
uniform sampler2D uGrid;   // NX x NY control points (RGB)
uniform sampler2D uRib;    // (KX+1) x MAXR: control points (y, Ar, Ag, Ab), then 1/(2 s^2)
uniform highp usampler2D uTiles; // per 30 px tile: bitmask of the ribbons that reach it
uniform int uCount;
uniform float uDim;

const float S = 30.0;
vec3 cp(int i, int j) {
  i = clamp(i, 0, ${NX - 1}); j = clamp(j, 0, ${NY - 1});
  return texelFetch(uGrid, ivec2(i, j), 0).rgb;
}
vec4 bw(float f) {
  float f2 = f * f, f3 = f2 * f;
  return vec4((1.0 - f) * (1.0 - f) * (1.0 - f), 3.0 * f3 - 6.0 * f2 + 4.0, -3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0, f3) / 6.0;
}
vec3 coarse(vec2 p) {
  vec2 u = p / S + 1.0;
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
  vec2 p = vec2(vUv.x * 960.0, (1.0 - vUv.y) * 720.0);
  vec3 col = coarse(p);
  // the ribbons are cubic B-splines in x (KX control points, BSX apart): the basis weights and
  // their x derivative depend only on the pixel's x, so they are computed once here
  float ru = (p.x - ${BX0}.0) / ${BSX.toFixed(6)} + 1.0;
  float rf = ru - floor(ru);
  int ri = int(floor(ru)) - 1;
  vec4 wb = bw(rf);
  vec4 wd = vec4(-(1.0 - rf) * (1.0 - rf) * 0.5, (9.0 * rf * rf - 12.0 * rf) / 6.0, (-9.0 * rf * rf + 6.0 * rf + 3.0) / 6.0, rf * rf * 0.5) / ${BSX.toFixed(6)};
  ivec4 ks = clamp(ivec4(ri, ri + 1, ri + 2, ri + 3), 0, ${KX - 1});
  uvec4 m = texelFetch(uTiles, ivec2(clamp(int(p.x / ${TS}.0), 0, ${TX - 1}), clamp(int(p.y / ${TS}.0), 0, ${TY - 1})), 0);
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
      float y = dot(wb, ys);
      float dy = dot(wd, ys);
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
    const mk = (filter) => {
      const t = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, t)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      return t
    }
    // textures are allocated once (immutable storage) and only updated with texSubImage2D, so a
    // frame never reallocates GPU memory (reallocating ~1 MB per frame could stall behind other
    // GPU work, e.g. right after the desktop releases its resources)
    this.tex = mk(gl.NEAREST)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGB32F, NX, NY)
    this.ribTex = mk(gl.NEAREST)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, KX + 1, MAXR)
    this.tileTex = mk(gl.NEAREST)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32UI, TX, TY)
    this.u = {}
    for (const n of ['uGrid', 'uRib', 'uTiles', 'uCount', 'uDim']) this.u[n] = gl.getUniformLocation(prog, n)
  }

  render(t, w, h) {
    const { gl, canvas } = this
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    const a = auroraFrame(t)
    // loop seam: over the last XFADE frames blend into the frames just before LOOP_A
    const xw = t > 1 ? Math.max(0, Math.min(1, (a - (LOOP_B - XFADE)) / XFADE)) : 0
    const xs = xw * xw * (3 - 2 * xw)
    if (coarseKeys && !grid) {
      grid = new Float32Array(NX * NY * 3)
      grid2 = new Float32Array(NX * NY * 3)
    }
    const g = coarseKeys ? interpKeys(coarseKeys, a, grid, COARSE_STEP) : null
    if (g && xs > 0) {
      interpKeys(coarseKeys, a - (LOOP_B - LOOP_A), grid2, COARSE_STEP)
      for (let q = 0; q < g.length; q++) g[q] += (grid2[q] - g[q]) * xs
    }
    tileMask.fill(0)
    let n = ribbonsAt(a, 1 - xs, 0)
    n = ribbonsAt(a - (LOOP_B - LOOP_A), xs, n)
    gl.viewport(0, 0, w, h)
    gl.useProgram(this.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    if (g) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, NX, NY, gl.RGB, gl.FLOAT, g)
    gl.uniform1i(this.u.uGrid, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.ribTex)
    if (n) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, KX + 1, n, gl.RGBA, gl.FLOAT, ribTex.subarray(0, (KX + 1) * n * 4))
    gl.uniform1i(this.u.uRib, 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.tileTex)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TX, TY, gl.RGBA_INTEGER, gl.UNSIGNED_INT, tileMask)
    gl.uniform1i(this.u.uTiles, 2)
    gl.uniform1i(this.u.uCount, n)
    gl.uniform1f(this.u.uDim, g ? 1 : 0)
    gl.bindVertexArray(this.vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}
