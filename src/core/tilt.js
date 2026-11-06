// Pointer tilt: a surface (the selected login slab, my Music's slabs) turns its face toward the
// pointer, eased by a critically damped spring, and settles back flat when the pointer leaves.
// A pure function of (time, pointer samples): the samples come from the event log, so real time,
// ?demo and ?capture agree and any seek order gives the same pose.
//
//   samples: [{ t, x, y } | { t, gone: true }] ascending by t, in stage px (gone: the pointer left)
//   tiltAt(t, samples, centre) -> { yaw, pitch } in degrees
//     yaw   + = the surface's right side toward the viewer (it turns to a pointer on its left)
//     pitch + = its top toward the viewer (it turns to a pointer below it)
//   centre: { x, y, hw, hh } the surface's centre and half size in stage px (may vary with time:
//     a function of t)
//
// Feel: the target is linear in the pointer's offset from the centre, MAX at REACH half-sizes
// away and held beyond; the response to a step reaches 90% in SETTLE seconds with no overshoot.
export const TILT = {
  max: 12, // deg at REACH and beyond
  reach: 1.5, // half-sizes of the surface from its centre to full tilt
  settle: 0.125, // s to 90% of a step (critically damped)
}
// (1 + w t) e^(-w t) = 0.1 at w t = 3.8897
export const OMEGA = 3.8897 / TILT.settle
// inputs older than this have decayed below 1e-12 of their step: folding starts here, from rest
// at the target in force then (exact to that error, and the cost per frame stays bounded)
const WINDOW = 1

const clamp1 = (v) => Math.max(-1, Math.min(1, v))

// the target angles for one sample: flat when the pointer has gone
export function tiltTarget(s, c) {
  if (!s || s.gone) return [0, 0]
  const nx = clamp1((s.x - c.x) / (c.hw * TILT.reach))
  const ny = clamp1((s.y - c.y) / (c.hh * TILT.reach))
  return [-nx * TILT.max, ny * TILT.max]
}

// advance a critically damped axis (x: offset from its target, v: velocity) by dt
function step(st, dt) {
  const e = Math.exp(-OMEGA * dt)
  const x = st[0], v = st[1]
  st[0] = (x + (v + OMEGA * x) * dt) * e
  st[1] = (v - OMEGA * (v + OMEGA * x) * dt) * e
}

export function tiltAt(t, samples, centre) {
  const cAt = typeof centre === 'function' ? centre : () => centre
  // the last sample at or before t - WINDOW sets the settled starting target
  let i = 0
  const t0 = t - WINDOW
  let lo = 0, hi = samples.length
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (samples[m].t <= t0) lo = m + 1
    else hi = m
  }
  i = lo // first sample after t0
  let target = tiltTarget(samples[i - 1], cAt(t0))
  // state per axis: angle and velocity
  const ax = [target[0], 0], ay = [target[1], 0]
  let at = t0
  const advance = (to) => {
    const dt = to - at
    if (dt <= 0) return
    const sx = [ax[0] - target[0], ax[1]], sy = [ay[0] - target[1], ay[1]]
    step(sx, dt)
    step(sy, dt)
    ax[0] = sx[0] + target[0], ax[1] = sx[1]
    ay[0] = sy[0] + target[1], ay[1] = sy[1]
    at = to
  }
  for (; i < samples.length && samples[i].t <= t; i++) {
    advance(samples[i].t)
    target = tiltTarget(samples[i], cAt(samples[i].t))
  }
  advance(t)
  return { yaw: ax[0], pitch: ay[0] }
}
