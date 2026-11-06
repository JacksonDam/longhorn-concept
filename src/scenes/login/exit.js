// Element-wise exit after login.submit (k = seconds since submit), fitted to frames 510-522
// (submit at 510): the bar tiles flip edge-on and drop, left to right, 2 frames apart; the
// flag spins off down-left and fades; the slab flies up to the top right corner, shrinking;
// the words, panel, Shut Down and clock fade; the whole layer dissolves (measured alpha).
import { clamp, ease, F, lerp } from '../../core/anim.js'
import { FPS } from '../../core/clock.js'

export const LOGIN_EXIT = F(12) // the login layer is gone 12 frames after submit

// piecewise-linear keys over frames since submit
function keys(ks, f) {
  if (f <= ks[0][0]) return ks[0][1]
  for (let i = 1; i < ks.length; i++) {
    if (f <= ks[i][0]) {
      const [f0, v0] = ks[i - 1], [f1, v1] = ks[i]
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], (f - f0) / (f1 - f0))) : lerp(v0, v1, (f - f0) / (f1 - f0))
    }
  }
  return ks[ks.length - 1][1]
}

const LAYER = [[2, 1], [3, 0.93], [4, 0.83], [5, 0.7], [6, 0.55], [7, 0.4], [8, 0.27], [9, 0.14], [10, 0.06], [11, 0]]
export const layerOpacity = (k) => keys(LAYER, k * FPS)

// flag: spins about its vertical axis in place, then flies down-left and fades (frames 511-514)
const FLAG = [[1, [0, 0, 0, 1]], [2, [-6, 2, 200, 1]], [3, [-118, 33, 420, 0.8]], [4, [-220, 58, 600, 0.35]], [5, [-300, 75, 720, 0]]]
export function flagExit(k) {
  const f = k * FPS
  if (f <= 1) return {}
  const [dx, dy, rot, op] = keys(FLAG, f)
  return { transform: `translate(${dx}px, ${dy}px) perspective(600px) rotateY(${rot}deg)`, opacity: op }
}

export function wordsExit(k) {
  return { opacity: keys([[3, 1], [4, 0.6], [6, 0]], k * FPS) }
}

// bar tiles: edge-on in a frame, then drop and fade; order = position left to right
export function tileExit(k, i, sel) {
  if (k <= 0) return null
  const order = sel >= 0 && i > sel ? i - 1 : i
  const f = k * FPS - (0.4 + 2 * order)
  if (f <= 0) return { transform: '', opacity: 1, moving: false }
  const flip = clamp(f / 0.7)
  const drop = clamp((f - 0.5) / 2) ** 2
  return {
    transform: ` translateY(${(drop * 80).toFixed(2)}px) perspective(260px) rotateY(${(flip * 86).toFixed(2)}deg)`,
    opacity: 1 - clamp((f - 1.2) / 1.8),
    moving: f < 3.5,
  }
}

// the slab flies up to the top right, shrinking and spinning
const SLAB_PATH = [
  [1, [379, 345, 1, 0]],
  [2, [388, 325, 0.97, 25]],
  [3, [400, 263, 0.93, 70]],
  [4, [440, 213, 0.88, 130]],
  [5, [488, 147, 0.82, 200]],
  [6, [541, 85, 0.75, 270]],
  [7, [657, 52, 0.68, 340]],
  [8, [771, 35, 0.6, 400]],
  [9, [860, 15, 0.52, 450]],
  [10, [950, 0, 0.45, 500]],
]
// how far along its path the slab is (0..1 by distance travelled), per path key
const SLAB_ALONG = (() => {
  const out = [[SLAB_PATH[0][0], 0]]
  let d = 0
  for (let i = 1; i < SLAB_PATH.length; i++) {
    const [, [x0, y0]] = SLAB_PATH[i - 1], [f1, [x1, y1]] = SLAB_PATH[i]
    d += Math.hypot(x1 - x0, y1 - y0)
    out.push([f1, d])
  }
  return out.map(([f, v]) => [f, v / d])
})()
// corner: { x, y } where the stage's top right corner is past the frame's (in the slab's own
// coordinates; layout.js: on a wider or taller stage the slab sits in the frame's middle, moved
// +dw / 2, +dh): the path bends over to it, more the further along it the slab is, so the slab
// still leaves by the screen's corner
export function slabExit(k, pose, corner = null) {
  const f = k * FPS
  if (f <= 1) return pose
  let [x, y, s, rot] = keys(SLAB_PATH, f)
  if (corner) {
    const u = keys(SLAB_ALONG, f)
    x += corner.x * u
    y += corner.y * u
  }
  const w = clamp((f - 1) / 1)
  return {
    ...pose,
    x: lerp(pose.x, x, w),
    y: lerp(pose.y, y, w),
    s: pose.s * s,
    ry: pose.ry + (rot * Math.PI) / 180,
    faceBand: undefined,
    opacity: (pose.opacity ?? 1) * (1 - clamp((f - 8) / 2)),
  }
}

export function panelExit(k) {
  return { opacity: keys([[2, 1], [3, 0.7], [4, 0.35], [5, 0]], k * FPS) }
}

export function chromeExit(k) {
  return { opacity: keys([[1.5, 1], [3, 0.6], [5, 0]], k * FPS) }
}
