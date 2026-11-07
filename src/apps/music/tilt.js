// The explorer headers' 3D slabs (my Music's device and album slabs, my Pictures' photo frame)
// after their spin-in: they hold their settled pose, with the video's idle drift only when the
// log asks for it ('slab.drift', the demo's input: ?demo / ?capture match the video), until the
// pointer is over their window. From that first pointer sample their orientation hands over to
// the pointer's alone (core/tilt.js: the rule and feel of the login's selected slab): with the
// pointer over the slab's centre its face is square to the camera, elsewhere turned toward it,
// and flat again when the pointer leaves the window; the drift fades out with the settled pose.
// Pointer samples are 'ptr' events (core/Cursor.jsx, real time only: none under ?demo /
// ?capture), those since the slab settled plus the last one before it, re-timed to it.
import { tiltAt, takeover, WINDOW } from '../../core/tilt.js'
import { lastOfType, eventsOf } from '../../os/logIndex.js'

const DEG = Math.PI / 180
const TAU = 2 * Math.PI

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
// a 'ptr' event as a sample at time `at`: gone when the pointer is outside the window's rect r
// (or off the page)
const sampleOf = (e, at, r) =>
  e.hidden || e.x < r.x || e.x > r.x + r.w || e.y < r.y || e.y > r.y + r.h ? { t: at, gone: true } : { t: at, x: e.x, y: e.y }

// When the pointer first came over the window since `from` (the last sample before `from`
// counting at `from`), or null. Cached per ptr array and start: once found it never changes (the
// log only grows at its end), and a search goes on from where the last one stopped, so a frame
// costs O(1) however long the pointer has been logged.
const firsts = new WeakMap() // ptr array -> Map(key -> { i: next index to look at, t: time | null })
function firstOver(a, from, rAt) {
  let m = firsts.get(a)
  if (!m) firsts.set(a, (m = new Map()))
  const r0 = rAt(from)
  const key = `${from}|${r0.x},${r0.y},${r0.w}x${r0.h}`
  let c = m.get(key)
  if (!c) {
    if (m.size > 32) m.clear()
    const i = upTo(a, from)
    c = { i: i > 0 ? i - 1 : 0, t: null }
    m.set(key, c)
  }
  for (; c.t == null && c.i < a.length; c.i++) {
    const e = a[c.i]
    const at = Math.max(from, e.t)
    if (!sampleOf(e, at, rAt(at)).gone) c.t = at
  }
  return c.t
}

// -> { yaw, pitch } (deg) toward the pointer, k (0: the settled pose .. 1: the pointer's alone,
// core/tilt.js takeover) and drift (how much of the video's idle drift remains), for a slab that
// settled at `from`, at offset o { x, y } from its window's rect, half size hw x hh; rAt(t): the
// window's rect at t (stage px: the slab moves with a dragged window, so a drag that carries the
// pointer along doesn't turn it); null: the pointer hasn't been over the window since
export function slabTilt(tt, from, o, hw, hh, rAt) {
  if (tt <= from) return null
  const a = eventsOf('ptr')
  const f = firstOver(a, from, rAt)
  if (f == null || f > tt) return null
  // the samples the spring needs (core/tilt.js folds the last WINDOW s from the sample at or
  // before its start): from the first one over the window (the spring starts flat there, at f),
  // or once that is over WINDOW s back, from the sample at or before tt - WINDOW (never one
  // before f: that is the first one over, re-timed to f)
  const n = upTo(a, tt)
  let i = upTo(a, Math.max(f, tt - WINDOW))
  const s = []
  if (i > 0) {
    const at = Math.max(f, a[i - 1].t)
    s.push(sampleOf(a[i - 1], at, rAt(at)))
  }
  for (; i < n; i++) s.push(sampleOf(a[i], a[i].t, rAt(a[i].t)))
  const { yaw, pitch } = tiltAt(tt, s, (at) => {
    const r = rAt(at)
    return { x: r.x + o.x, y: r.y + o.y, hw, hh }
  })
  const k = takeover(tt - f)
  // (to 0.01 deg: a settling spring stops changing the slab's image, and its canvas redraws, once
  // it is within that of its target)
  const q = (v) => Math.round(v * 100) / 100
  return { yaw: q(yaw), pitch: q(pitch), k, drift: 1 - k }
}

// the pose with the pointer's orientation taking over from its own (the slab renderer's ry / rx
// turn the other way: ry = -yaw); whole turns in the settled ry (an album's 2 pi + 0.72) stay
export function applyTilt(pose, tilt) {
  if (!tilt) return pose
  const keep = 1 - tilt.k
  const ry = pose.ry ?? 0
  const turns = TAU * Math.round(ry / TAU)
  return { ...pose, ry: turns + (ry - turns) * keep - tilt.yaw * DEG, rx: (pose.rx ?? 0) * keep - tilt.pitch * DEG, rz: (pose.rz ?? 0) * keep }
}
