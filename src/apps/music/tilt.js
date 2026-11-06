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
function samples(from, t, rAt) {
  const a = eventsOf('ptr')
  const n = upTo(a, t)
  let i = upTo(a, from)
  const out = []
  const map = (e, at) => {
    const r = rAt(at)
    return e.hidden || e.x < r.x || e.x > r.x + r.w || e.y < r.y || e.y > r.y + r.h ? { t: at, gone: true } : { t: at, x: e.x, y: e.y }
  }
  if (i > 0) out.push(map(a[i - 1], from))
  for (; i < n; i++) out.push(map(a[i], a[i].t))
  return out
}

// -> { yaw, pitch } (deg) and drift (1: the video's drift in full .. 0: gone), for a slab that
// settled at `from`, at offset o { x, y } from its window's rect, half size hw x hh; rAt(t): the
// window's rect at t (stage px: the slab moves with a dragged window, so a drag that carries the
// pointer along doesn't turn it); null: no pointer yet
export function slabTilt(tt, from, o, hw, hh, rAt) {
  if (tt <= from) return null
  const s = samples(from, tt, rAt)
  if (!s.length) return null
  const { yaw, pitch } = tiltAt(tt, s, (at) => {
    const r = rAt(at)
    return { x: r.x + o.x, y: r.y + o.y, hw, hh }
  })
  const u = Math.max(0, Math.min(1, (tt - s[0].t) / DRIFT_OUT))
  // (to 0.01 deg: a settling spring stops changing the slab's image, and its canvas redraws, once
  // it is within that of its target)
  const q = (v) => Math.round(v * 100) / 100
  return { yaw: q(yaw), pitch: q(pitch), drift: 1 - u * u * (3 - 2 * u) }
}

// the pose with the tilt applied (the slab renderer's ry / rx turn the other way: ry -= yaw)
export function applyTilt(pose, tilt) {
  if (!tilt) return pose
  return { ...pose, ry: pose.ry - tilt.yaw * DEG, rx: pose.rx - tilt.pitch * DEG }
}
