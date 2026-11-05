// Window animations of the Plex window system, fitted on the video's my Music window (frames
// 694-716 open, 1353-1365 minimise, 1403-1415 restore) and generalised to any window rect and
// taskbar button. "rel" = video frames since the animation's reference point: the event time
// plus OPEN_DELAY (open) / RESTORE_DELAY (restore); minimise starts at its event.
import { table } from './table.js'

export const OPEN_DELAY = 0.5
export const RESTORE_DELAY = 0.9

// ---------------------------------------------------------------- open
// [rel, tx, ty, tz, rx, ry, rz (deg), opacity]; CSS: perspective(1600px) translate3d rotateY rotateX rotateZ
// rel 9.. are fitted per frame (ECC homography of the window, then a CSS-pose fit; P = 1600).
const OPEN = table([
  [5, -430, 260, -1500, 0, -80, -2, 0],
  [6, -297, 81, -843, -5.7, -42.7, 1.1, 0.6],
  [7, -70, 4, -124, -7.8, -26.8, 1.5, 0.85],
  [7.5, -56, 1, -70, -4.5, -22.5, 1, 0.95],
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

// lighting while the window swings in (measured against the settled window, f700-710): the
// toolbar's left part is lit (additive, peak ~+75 at stage x 100-200, zero by x 360) and its
// right part shaded (x 0.55 from x 500); the body is shaded towards rgb(60, 90, 140) to the
// right (stage x 400 -> 575) and downwards (local y 400 -> 600), covers and text included.
// [rel, toolbar light (x75), body shade alpha, toolbar shade alpha]
const OPEN_LIGHT = table([
  [5, 1.4, 0.6, 0.5],
  [7, 1.35, 0.58, 0.48],
  [8, 1.3, 0.53, 0.45],
  [9, 1.0, 0.4, 0.35],
  [10, 0.6, 0.23, 0.22],
  [11, 0.45, 0.13, 0.15],
  [12, 0.3, 0.08, 0.08],
  [13, 0.17, 0.04, 0.04],
  [14, 0.09, 0.02, 0.02],
  [15, 0.04, 0.01, 0.01],
  [16, 0, 0, 0],
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
  [4.5, 0, 18, 0.995, 0.984, 1],
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


// generalised minimise / restore for a window rect r ({x, y, w, h}) collapsing towards dock d
// ({x, y}: taskbar button point): the fitted tables are for my Music (top 23, centre x 433.5,
// dock 440 / 700), so heights scale with the drop and x shifts with the dock offset.
const MUSIC = { top: 23, cx: 433.5, dockX: 440, floor: 700 }
function generalise(p, r, d) {
  const drop = (d.y + 2 - r.y) / (MUSIC.floor - MUSIC.top)
  const dx = (d.x - (r.x + r.w / 2)) / (MUSIC.dockX - MUSIC.cx)
  return { ...p, tx: p.tx * dx, ty: p.ty > 0 ? p.ty * drop : p.ty }
}
export const minimizePoseFor = (rel, r, d) => generalise(minimizePose(rel), r, d)
export const restorePoseFor = (rel, r, d) => generalise(restorePose(rel), r, d)

// motion-blur sampling per animation: { n, shutter (frames), phase }
export function openBlur(rel) {
  if (rel < 8) return { n: 14, shutter: 1, phase: -0.5 }
  if (rel < 14) return { n: 6, shutter: 0.5, phase: -0.5 }
  return { n: 4, shutter: 0.5, phase: -0.5 }
}
export const minimizeBlur = (mrel) =>
  mrel > 3.8 ? { n: 16, shutter: 1.32, phase: mrel > 5.8 ? 0 : -0.5 } : { n: 6, shutter: 1, phase: -0.5 }
export const restoreBlur = (mrel) => ({ n: 16, shutter: mrel > 4.5 ? 1.36 : 1, phase: mrel < 2 ? -1 : -0.5 })

// close: the open played backwards, 1.6x faster
export const CLOSE_SPEED = 1.6
export const CLOSE_END = (OPEN_END - 5) / CLOSE_SPEED
export const closePose = (crel) => openPose(OPEN_END - crel * CLOSE_SPEED)

// maximise / restore-down: the frame moves between the two rects in MAX_FRAMES frames (ease out)
export const MAX_FRAMES = 7
export const maxEase = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3)
