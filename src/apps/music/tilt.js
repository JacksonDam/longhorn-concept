// my Music's 3D slabs after their spin-in: in real use they hold their settled pose and turn
// toward the pointer (core/tilt.js, the login's selected slab's feel); the video's idle drift
// plays only when the log asks for it ('slab.drift', the demo's input: ?demo / ?capture match
// the video) and fades out over DRIFT_OUT from the first pointer sample, so the two never fight.
// Pointer samples are 'ptr' events (core/Cursor.jsx, real time only: none under ?demo /
// ?capture), those since the slab settled plus the last one before it, re-timed to it.
import { tiltAt } from '../../core/tilt.js'
import { lastOfType, eventsOf } from '../../os/logIndex.js'

export const DRIFT_OUT = 0.3 // s
const DEG = Math.PI / 180

// whether the video's idle drift plays at t
export const drifting = (t) => lastOfType(t, 'slab.drift') != null

const upTo = (a, t) => {
  let lo = 0, hi = a.length
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (a[m].t <= t) lo = m + 1
    else hi = m
  }
  return lo
}
// the pointer samples from `from` to t: { t, x, y } or { t, gone } (the pointer outside the
// window's rect r, or off the page)
function samples(from, t, r) {
  const a = eventsOf('ptr')
  const n = upTo(a, t)
  let i = upTo(a, from)
  const out = []
  const map = (e, at) => (e.hidden || e.x < r.x || e.x > r.x + r.w || e.y < r.y || e.y > r.y + r.h ? { t: at, gone: true } : { t: at, x: e.x, y: e.y })
  if (i > 0) out.push(map(a[i - 1], from))
  for (; i < n; i++) out.push(map(a[i], a[i].t))
  return out
}

// -> { yaw, pitch } (deg) and drift (1: the video's drift in full .. 0: gone), for a slab that
// settled at `from`, centred at c { x, y, hw, hh } (stage px) in window rect r; null: no pointer yet
export function slabTilt(tt, from, c, r) {
  if (tt <= from) return null
  const s = samples(from, tt, r)
  if (!s.length) return null
  const { yaw, pitch } = tiltAt(tt, s, c)
  const u = Math.max(0, Math.min(1, (tt - s[0].t) / DRIFT_OUT))
  return { yaw, pitch, drift: 1 - u * u * (3 - 2 * u) }
}

// the pose with the tilt applied (the slab renderer's ry / rx turn the other way: ry -= yaw)
export function applyTilt(pose, tilt) {
  if (!tilt) return pose
  return { ...pose, ry: pose.ry - tilt.yaw * DEG, rx: pose.rx - tilt.pitch * DEG }
}
