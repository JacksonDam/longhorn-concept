// Small animation toolkit: easing curves and keyframe tracks evaluated at time t.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, k) => a + (b - a) * k
export const invLerp = (a, b, v) => clamp((v - a) / (b - a))
export const smooth = (k) => k * k * (3 - 2 * k)

// CSS-style cubic-bezier(x1, y1, x2, y2)
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const sx = (t) => ((ax * t + bx) * t + cx) * t
  const sy = (t) => ((ay * t + by) * t + cy) * t
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x
      const d = dx(t)
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break
      t -= e / d
    }
    t = clamp(t)
    return sy(t)
  }
}

export const ease = {
  linear: (k) => k,
  in: bezier(0.42, 0, 1, 1),
  out: bezier(0, 0, 0.58, 1),
  inOut: bezier(0.42, 0, 0.58, 1),
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inCubic: (k) => k * k * k,
  outQuart: (k) => 1 - Math.pow(1 - k, 4),
  outExpo: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  outBack: (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2),
}

// Keyframe track. keys: [[time, value, easeIntoThisKey?], ...] sorted by time.
// value may be a number or an array of numbers. Times are seconds (or frames, as long
// as the caller is consistent).
export function track(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1]
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e] = keys[i]
      if (t <= t1) {
        const [t0, v0] = keys[i - 1]
        const k = (e || ease.linear)((t - t0) / (t1 - t0))
        if (Array.isArray(v0)) return v0.map((a, j) => lerp(a, v1[j], k))
        return lerp(v0, v1, k)
      }
    }
    return keys[keys.length - 1][1]
  }
}

// frames (1-based video frame numbers) -> seconds helper for authoring tracks
export const F = (n) => (n * 1001) / 30000
