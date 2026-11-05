// Timings and fitted motion of the my Music window, in video frames (29.97 fps).
// "rel" frames count from the event that starts an animation (music.open at video frame 694,
// music.album at 945.5, music.minimize at 1353, music.restore at 1403).
import { FPS } from '../../core/clock.js'
import { clamp, lerp } from '../../core/anim.js'
import { DEVICE_F0, DEVICE_POSES } from './devicePoses.js'

export const toRel = (t, t0) => (t - t0) * FPS
export const relToSec = (f) => f / FPS

// Catmull-Rom through rows [[f, v0, v1, ...], ...] sorted by f (clamped at both ends)
export function table(rows) {
  return (f) => {
    if (f <= rows[0][0]) return rows[0].slice(1)
    const n = rows.length
    if (f >= rows[n - 1][0]) return rows[n - 1].slice(1)
    let i = 1
    while (rows[i][0] < f) i++
    const a = rows[Math.max(0, i - 2)], b = rows[i - 1], c = rows[i], d = rows[Math.min(n - 1, i + 1)]
    const u = (f - b[0]) / (c[0] - b[0])
    const out = []
    for (let j = 1; j < b.length; j++) {
      const m1 = (c[j] - a[j]) / Math.max(1e-6, c[0] - a[0]) * (c[0] - b[0])
      const m2 = (d[j] - b[j]) / Math.max(1e-6, d[0] - b[0]) * (c[0] - b[0])
      const u2 = u * u, u3 = u2 * u
      out.push((2 * u3 - 3 * u2 + 1) * b[j] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * c[j] + (u3 - u2) * m2)
    }
    return out
  }
}

// ---------------------------------------------------------------- window open (rel to music.open)
// [rel, tx, ty, tz, rx, ry, rz (deg), opacity]; CSS: perspective(1600px) translate3d rotateY rotateX rotateZ
// rel 9.. are fitted per frame (ECC homography of the window, then a CSS-pose fit; P = 1600).
const OPEN = table([
  [5, -430, 260, -1500, 0, -80, -2, 0],
  [6, -268, 89, -521, -0.4, -46, -1.3, 0.6],
  [7, -110, 15, -120, -1.5, -27, 0, 0.85],
  [7.5, -62, 3, -50, -2, -21.5, 0.5, 0.95],
  [8, -46.2, -0.4, -33.3, -2.11, -19.75, 0.58, 1],
  [9, -43.7, -4.1, -13.1, -2.91, -19.14, 0.79, 1],
  [10, -32.5, -3.0, -6.5, -2.65, -17.34, 0.6, 1],
  [11, -21.6, -2.2, -5.5, -2.21, -15.4, 0.45, 1],
  [12, -15.0, -1.5, -5.6, -1.86, -13.25, 0.31, 1],
  [13, -10.8, -1.1, -5.6, -1.56, -10.91, 0.21, 1],
  [14, -7.8, -0.7, -5.1, -1.3, -8.63, 0.12, 1],
  [15, -5.6, -0.4, -4.4, -1.08, -6.54, 0.07, 1],
  [16, -3.8, -0.3, -3.6, -0.88, -4.79, 0.04, 1],
  [17, -2.4, -0.1, -2.7, -0.71, -3.38, 0.01, 1],
  [18, -1.4, -0.1, -1.9, -0.52, -2.24, 0, 1],
  [19, -0.7, -0.1, -1.2, -0.34, -1.39, 0, 1],
  [20, -0.3, 0, -0.7, -0.18, -0.84, 0, 1],
  [21, -0.1, 0, -0.3, -0.13, -0.33, 0, 1],
  [22, 0, 0, 0, 0, 0, 0, 1],
])
export const OPEN_END = 22
export function openPose(rel) {
  const [tx, ty, tz, rx, ry, rz, op] = OPEN(rel)
  return { tx, ty, tz, rx, ry, rz, op: rel < 5 ? 0 : op }
}
export const openMoving = (rel) => rel > 4.5 && rel < OPEN_END + 1

export function poseCss(p) {
  return {
    transform: `perspective(1600px) translate3d(${p.tx}px, ${p.ty}px, ${p.tz}px) rotateY(${p.ry}deg) rotateX(${p.rx}deg) rotateZ(${p.rz}deg) scale(${p.sx ?? 1}, ${p.sy ?? 1})`,
    transformOrigin: p.origin || '50% 50%',
    opacity: p.op,
  }
}

// ---------------------------------------------------------------- header device (rel to music.open)
const DEV = DEVICE_POSES.map((r, i) => [DEVICE_F0 + i, ...r])
const devTable = table(DEV)
const DEV_LOOP0 = 40 // idle part used for ping-pong playback after the fitted range
const DEV_END = DEVICE_F0 + DEVICE_POSES.length - 1
export function devicePoseRel(rel) {
  let f = rel
  if (f > DEV_END) {
    const span = DEV_END - DEV_LOOP0
    const k = (f - DEV_END) % (2 * span)
    f = k < span ? DEV_END - k : DEV_LOOP0 + (k - span)
  }
  const [x, y, rx, ry, rz] = devTable(f)
  return { x, y, rx, ry, rz }
}

// ---------------------------------------------------------------- header intro fades (rel to music.open)
export const ramp = (rel, a, b) => clamp((rel - a) / (b - a))
export const smoothRamp = (rel, a, b) => {
  const k = ramp(rel, a, b)
  return k * k * (3 - 2 * k)
}
export const HEADER = {
  swoosh: [9.5, 15],
  enjoy: [8.5, 12],
  windows: [16, 22.5], // fade + slide in from the left
  my: [23.5, 27],
  music: [25.5, 31.5], // wipe left -> right
  drift: [22.5, 36], // whole title drifts back left
  buttons: [65.5, 67.2, 68.9], // start of each button's pop-in
  buttonDur: 4,
}

export { lerp }
