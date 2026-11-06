// my Music's 3D slabs tilt towards the pointer once their spin-in has settled (instead of the
// fitted idle drift): the target tilt comes from the pointer's position relative to the tile's
// centre, and the slab follows it critically damped, so it eases in and settles without
// overshoot; with the pointer outside the window the target is flat.
// Pure: the tilt at t is the target over the last few T s (core/Cursor.jsx pointerAt, the
// video's cursor under ?demo / ?capture) weighted by a critically damped step response's
// derivative (h(s) = s / T^2 e^(-s / T)), so any frame renders the same at any seek order.
// The login's selected tile uses the same feel (TILT).
import { pointerAt } from '../../core/Cursor.jsx'

export const TILT = {
  max: (12 * Math.PI) / 180, // the largest tilt, rad (each axis)
  radius: 180, // stage px from the tile's centre at which the tilt is full
  T: 0.12, // s, the critically damped response's time constant
}
const K = 24 // samples of the response
const SPAN = 6 // response length, in T
const W = (() => {
  const w = []
  let sum = 0
  for (let i = 0; i < K; i++) {
    const s = ((i + 0.5) * SPAN * TILT.T) / K
    const v = s * Math.exp(-s / TILT.T)
    w.push([s, v])
    sum += v
  }
  return w.map(([s, v]) => [s, v / sum])
})()

const clamp1 = (v) => Math.max(-1, Math.min(1, v))
// the tilt the pointer asks for at t: [rx, ry] (rad); r: the window's rect (stage px)
function target(t, cx, cy, r) {
  const p = pointerAt(t)
  if (!p || p.hidden || p.x < r.x || p.x > r.x + r.w || p.y < r.y || p.y > r.y + r.h) return [0, 0]
  return [clamp1((cy - p.y) / TILT.radius) * TILT.max, clamp1((p.x - cx) / TILT.radius) * TILT.max]
}

const memo = new Map()
// -> [rx, ry] (rad) at t for a tile centred at (cx, cy) in window rect r (stage px)
export function tiltAt(t, cx, cy, r) {
  const key = `${t}|${cx}|${cy}|${r.x}|${r.y}|${r.w}|${r.h}`
  let v = memo.get(key)
  if (v) return v
  let rx = 0, ry = 0
  for (const [s, w] of W) {
    const [a, b] = target(t - s, cx, cy, r)
    rx += a * w
    ry += b * w
  }
  v = [rx, ry]
  if (memo.size > 256) memo.clear()
  memo.set(key, v)
  return v
}
// whether the tilt is still moving at t (the pointer moved within the response's length)
export function tiltMoving(t, cx, cy, r) {
  const a = tiltAt(t, cx, cy, r)
  const b = tiltAt(t - 0.5 / 29.97, cx, cy, r)
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 1e-4
}
