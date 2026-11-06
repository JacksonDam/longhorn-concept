// Timings and fitted motion of the my Music window, in video frames (29.97 fps).
// "rel" frames count from the reference point of each animation: video frame 694 for the open
// (music.open + OPEN_DELAY), the album click (945.5), music.minimize (1354.5) and
// music.restore + RESTORE_DELAY (1403.5). The delays map the desktop scene's event times
// (music.open 693.5, music.restore 1402.6) onto the fitted tables.
import { FPS } from '../../core/clock.js'
import { clamp, lerp } from '../../core/anim.js'
import { DEVICE_F0, DEVICE_POSES, ALBUM_POSES } from './poses.js'

export const toRel = (t, t0) => (t - t0) * FPS
export const relToSec = (f) => f / FPS
// the window animations (open, lighting, minimise, restore) live in os/windowAnim.js
export { OPEN_DELAY, RESTORE_DELAY, OPEN_END, openPose, openMoving, openLight, poseCss, MIN_END, RESTORE_END, minimizePose, restorePose } from '../../os/windowAnim.js'

import { table } from '../../os/table.js'
export { table }

// ---------------------------------------------------------------- header slabs
// The fitted spin-in and settle play to REST frames; the slab then holds that pose (and turns
// toward the pointer, tilt.js), unless the log plays the video's idle drift: ping-pong playback
// of the fitted idle range once the table runs out
export const DEVICE_REST = 40
export const ALBUM_REST = 40
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
// drift: 1 the video's drift, 0 held at rest (between: blended, the drift fading out)
export const devicePoseRel = (rel, drift = 0) => blendPose(pose6(devTable(Math.min(rel, DEVICE_REST, DEV_END))), drift > 0 && rel > DEVICE_REST ? pose6(devTable(pingPong(rel, 40, DEV_END))) : null, drift)

const albTable = table(ALBUM_POSES)
const ALB_END = ALBUM_POSES[ALBUM_POSES.length - 1][0]
// hrel: frames since the album page transition started
export const albumPoseRel = (hrel, drift = 0) => blendPose(pose6(albTable(Math.min(hrel, ALBUM_REST, ALB_END))), drift > 0 && hrel > ALBUM_REST ? pose6(albTable(pingPong(hrel, 40, ALB_END))) : null, drift)
function blendPose(rest, d, k) {
  if (!d || k <= 0) return rest
  if (k >= 1) return d
  const o = {}
  for (const key in rest) o[key] = rest[key] + (d[key] - rest[key]) * k
  return o
}

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
