// Timings and fitted motion of the my Music window, in video frames (29.97 fps).
// "rel" frames count from the reference point of each animation: video frame 694 for the open
// (music.open + OPEN_DELAY), the album click (945.5), music.minimize (1354.5) and
// music.restore + RESTORE_DELAY (1403.5). The delays map the desktop scene's event times
// (music.open 693.5, music.restore 1402.6) onto the fitted tables.
import { FPS } from '../../core/clock.js'
import { clamp, lerp } from '../../core/anim.js'
import { DEVICE_F0, DEVICE_POSES, ALBUM_POSES } from './poses.js'

export const toRel = (t, t0) => (t - t0) * FPS
export const OPEN_DELAY = 0.5
export const RESTORE_DELAY = 0.9
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

// lighting while the window swings in: its left side is washed light and its right side
// shaded (measured on the body/toolbar brightness, f702-712): [rel, light alpha, shade alpha]
const OPEN_LIGHT = table([
  [5, 0.55, 0.45],
  [7, 0.55, 0.45],
  [8, 0.49, 0.34],
  [9, 0.45, 0.25],
  [10, 0.35, 0.14],
  [11, 0.25, 0.08],
  [12, 0.17, 0.04],
  [14, 0.06, 0.01],
  [16, 0, 0],
])
export const openLight = (rel) => (rel >= 16 ? null : OPEN_LIGHT(rel))

export function poseCss(p) {
  return {
    transform: `perspective(1600px) translate3d(${p.tx}px, ${p.ty}px, ${p.tz}px) rotateY(${p.ry}deg) rotateX(${p.rx}deg) rotateZ(${p.rz}deg) scale(${p.sx ?? 1}, ${p.sy ?? 1})`,
    transformOrigin: p.origin || '50% 50%',
    opacity: p.op,
  }
}

// ---------------------------------------------------------------- minimise / restore
// The window rect per frame, measured from the reference (ECC fits where sharp, smear extents
// where blurred): [rel, tx, ty, sx, sy, opacity]; transform origin: top centre, so ty moves the
// top edge and sy stretches or squashes the window below it. Minimise: it rises, then stretches
// down into the taskbar and collapses towards the My Music button; restore is the reverse,
// ending with an upward bounce that stretches down again.
const MIN = table([
  [0, 0, 0, 1, 1, 1],
  [0.5, 0, -9, 1, 1, 1],
  [1.5, 0, -18.5, 1, 1, 1],
  [2.5, 0, -18.5, 1, 1, 1],
  [3.5, 0, -18.6, 1.004, 1.004, 1],
  [4.5, 0, 2, 1, 1.12, 1],
  [5.5, -0.5, 139, 0.95, 0.98, 1],
  [6.5, 1.5, 293, 0.8, 0.74, 1],
  [7.5, 3, 468, 0.583, 0.47, 0.95],
  [8.5, 5, 618, 0.372, 0.24, 0.8],
  [9.5, 6, 700, 0.2, 0.12, 0],
])
export const MIN_END = 9.5
const RESTORE = table([
  [-0.5, 7, 700, 0.2, 0.12, 0],
  [0.5, 8.5, 564, 0.376, 0.26, 0.85],
  [1.5, -0.5, 303, 0.686, 0.66, 1],
  [2.5, -0.5, 77, 0.893, 0.95, 1],
  [3.5, 0.3, 1.4, 0.97, 0.972, 1],
  [4.5, 0, -32.6, 1.004, 1.004, 1],
  [5.5, 0, -55.2, 1.007, 1.008, 1],
  [6.5, 0, -22.4, 1.003, 0.99, 1],
  [7.5, 0, -1.7, 1, 1, 1],
  [8.5, 0, 0, 1, 1, 1],
])
export const RESTORE_END = 8.5
const minPose = ([tx, ty, sx, sy, op]) => ({ tx, ty, tz: 0, rx: 0, ry: 0, rz: 0, sx, sy, op, origin: '50% 0%' })
export const minimizePose = (rel) => minPose(MIN(rel))
export const restorePose = (rel) => minPose(RESTORE(rel))

// ---------------------------------------------------------------- header slabs
// ping-pong playback of the fitted idle range once the table runs out (interactive use)
function pingPong(f, a, b) {
  if (f <= b) return f
  const span = b - a
  const k = (f - b) % (2 * span)
  return k < span ? b - k : a + (k - span)
}
const pose6 = ([x, y, rx, ry, rz, z]) => ({ x, y, rx, ry, rz, z })

const devTable = table(DEVICE_POSES.map((r, i) => [DEVICE_F0 + i, ...r]))
const DEV_END = DEVICE_F0 + DEVICE_POSES.length - 1
// rel: frames since music.open
export const devicePoseRel = (rel) => pose6(devTable(pingPong(rel, 40, DEV_END)))

const albTable = table(ALBUM_POSES)
const ALB_END = ALBUM_POSES[ALBUM_POSES.length - 1][0]
// hrel: frames since the album page transition started
export const albumPoseRel = (hrel) => pose6(albTable(pingPong(hrel, 40, ALB_END)))

// the album page: the header changes this long after the album tile is clicked
export const PAGE_DELAY = 22.5
// device spins away (hrel = frames since the page transition started)
export const spinOut = (h) => (h <= 1 ? { ry: 0, z: 0 } : { ry: 0.37 * (h - 1), z: -8 * (h - 1) })
// track list slides in from the right: [hrel, dx, opacity]
export const LIST_IN = table([
  [13, 420, 0],
  [14, 260, 0.35],
  [15, 110, 0.75],
  [15.5, 40, 0.9],
  [16, 9, 1],
  [17, 5, 1],
  [18, 2, 1],
  [19, 0.5, 1],
  [20, 0, 1],
])

// ---------------------------------------------------------------- header intro fades (rel to music.open)
export const ramp = (rel, a, b) => clamp((rel - a) / (b - a))
export const smoothRamp = (rel, a, b) => {
  const k = ramp(rel, a, b)
  return k * k * (3 - 2 * k)
}
export const HEADER = {
  swoosh: [10.5, 24], // fades in and sweeps out to full size
  enjoy: [8.5, 12],
  windows: [16, 22.5], // fade + slide in from the left
  my: [23.5, 27],
  music: [25.5, 31.5], // wipe left -> right
  drift: [22.5, 36], // whole title drifts back left
  buttons: [65.5, 67.2, 68.9], // start of each button's pop-in
  buttonDur: 4,
}

export { lerp }
