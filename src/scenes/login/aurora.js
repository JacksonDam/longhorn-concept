// The login background: a looping aurora of light ribbons over a blue gradient, rendered
// procedurally in a fragment shader (crisp at any size).
//
// Fitted to the reference video (tools/login/fit_*.py):
// - coarse colour field: a uniform cubic B-spline grid (35x27 control points, 30 px spacing),
//   keyframed every 4 video frames (public/img/login/aurora-coarse.png). JS interpolates the
//   keyframes (Catmull-Rom) and uploads one grid per frame; the shader evaluates the spline.
// - ribbons: thin glowing curves, keyframed parameters (see ribbons.js), drawn analytically.
//
// Time: the video's background is a loop of 395 frames (frames 436.. repeat 41..), with an
// extra swell of light (frames ~140-435) that we keep inside the loop. auroraFrame(t) maps
// clock time to that loop: frames 1..435 once, then 41..435 forever.
import { asset, waitFor } from '../../core/preload.js'

export const NX = 35
export const NY = 27
export const KEY_STEP = 4
export const LOOP_A = 41
export const LOOP_B = 435

export function auroraFrame(t) {
  const f = (t * 30000) / 1001 + 1
  if (f < LOOP_B) return f
  return LOOP_A + ((((f - LOOP_A) % (LOOP_B - LOOP_A)) + (LOOP_B - LOOP_A)) % (LOOP_B - LOOP_A))
}

// ------------------------------------------------------------------ coarse keyframes
let keys = null // Float32Array per keyframe (NX*NY*3, 0..1)
export const keysReady = new Promise((resolve) => {
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, img.width, img.height).data
    const n = img.height / NY
    keys = []
    for (let k = 0; k < n; k++) {
      const a = new Float32Array(NX * NY * 3)
      for (let j = 0; j < NY; j++)
        for (let i = 0; i < NX; i++) {
          const p = ((k * NY + j) * NX + i) * 4
          const q = (j * NX + i) * 3
          a[q] = d[p] / 255
          a[q + 1] = d[p + 1] / 255
          a[q + 2] = d[p + 2] / 255
        }
      keys.push(a)
    }
    resolve(true)
  }
  img.onerror = () => resolve(false)
  img.src = asset('img/login/aurora-coarse.png')
})
waitFor(keysReady)

const grid = new Float32Array(NX * NY * 3)
// Catmull-Rom across keyframes at aurora frame a
function coarseAt(a) {
  if (!keys) return null
  const u = (a - 1) / KEY_STEP
  const i1 = Math.max(0, Math.min(keys.length - 1, Math.floor(u)))
  const f = Math.max(0, Math.min(1, u - i1))
  const k = (i) => keys[Math.max(0, Math.min(keys.length - 1, i))]
  const p0 = k(i1 - 1), p1 = k(i1), p2 = k(i1 + 1), p3 = k(i1 + 2)
  const f2 = f * f, f3 = f2 * f
  const w0 = -0.5 * f3 + f2 - 0.5 * f
  const w1 = 1.5 * f3 - 2.5 * f2 + 1
  const w2 = -1.5 * f3 + 2 * f2 + 0.5 * f
  const w3 = 0.5 * f3 - 0.5 * f2
  for (let q = 0; q < grid.length; q++) grid[q] = w0 * p0[q] + w1 * p1[q] + w2 * p2[q] + w3 * p3[q]
  return grid
}

// ------------------------------------------------------------------ shader
export const MAX_RIBBONS = 48

const VS = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`

const FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uGrid;   // NX x NY control points (RGB)
uniform float uDim;        // overall multiplier (exit fade handled in DOM)
// ribbons: per ribbon 3 vec4s
//  a: x0, x1 (stage px extent), y0 (centre y at x=480), slope (dy/dx)
//  b: bend (px at the ends, quadratic), wave amp (px), wave length (px), wave phase
//  c: core width (px), glow width (px), intensity, colour mix (0 violet .. 1 cyan .. 2 white)
uniform vec4 uRA[${MAX_RIBBONS}];
uniform vec4 uRB[${MAX_RIBBONS}];
uniform vec4 uRC[${MAX_RIBBONS}];
uniform int uCount;

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

vec3 ribbonColor(float m) {
  vec3 violet = vec3(0.42, 0.45, 1.0);
  vec3 cyan = vec3(0.25, 0.66, 1.0);
  vec3 white = vec3(0.92, 0.96, 1.0);
  return m < 1.0 ? mix(violet, cyan, m) : mix(cyan, white, m - 1.0);
}

void main() {
  vec2 p = vec2(vUv.x * 960.0, (1.0 - vUv.y) * 720.0);
  vec3 col = coarse(p);
  for (int i = 0; i < ${MAX_RIBBONS}; i++) {
    if (i >= uCount) break;
    vec4 a = uRA[i], b = uRB[i], c = uRC[i];
    float xn = (p.x - 480.0) / 480.0;
    float yc = a.z + a.w * (p.x - 480.0) + b.x * xn * xn + b.y * sin(6.2831853 * p.x / max(b.z, 1.0) + b.w);
    // slope of the centreline -> perpendicular distance
    float dy = a.w + b.x * 2.0 * xn / 480.0 + b.y * 6.2831853 / max(b.z, 1.0) * cos(6.2831853 * p.x / max(b.z, 1.0) + b.w);
    float d = (p.y - yc) / sqrt(1.0 + dy * dy);
    float along = smoothstep(a.x - 120.0, a.x + 120.0, p.x) * (1.0 - smoothstep(a.y - 120.0, a.y + 120.0, p.x));
    float core = exp(-0.5 * d * d / max(c.x * c.x, 0.01));
    float glow = exp(-0.5 * d * d / max(c.y * c.y, 0.01));
    col += ribbonColor(c.w) * c.z * along * (core + 0.35 * glow);
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
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: true })
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
    this.tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    this.u = {}
    for (const n of ['uGrid', 'uDim', 'uRA', 'uRB', 'uRC', 'uCount']) this.u[n] = gl.getUniformLocation(prog, n)
    this.ra = new Float32Array(MAX_RIBBONS * 4)
    this.rb = new Float32Array(MAX_RIBBONS * 4)
    this.rc = new Float32Array(MAX_RIBBONS * 4)
  }

  // ribbons: [{a:[4], b:[4], c:[4]}]
  render(t, w, h, ribbons = []) {
    const { gl, canvas } = this
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    const g = coarseAt(auroraFrame(t))
    gl.viewport(0, 0, w, h)
    gl.useProgram(this.prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    if (g) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, NX, NY, 0, gl.RGB, gl.FLOAT, g)
    gl.uniform1i(this.u.uGrid, 0)
    gl.uniform1f(this.u.uDim, g ? 1 : 0)
    const n = Math.min(MAX_RIBBONS, ribbons.length)
    for (let i = 0; i < n; i++) {
      this.ra.set(ribbons[i].a, i * 4)
      this.rb.set(ribbons[i].b, i * 4)
      this.rc.set(ribbons[i].c, i * 4)
    }
    gl.uniform4fv(this.u.uRA, this.ra)
    gl.uniform4fv(this.u.uRB, this.rb)
    gl.uniform4fv(this.u.uRC, this.rc)
    gl.uniform1i(this.u.uCount, n)
    gl.bindVertexArray(this.vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}
