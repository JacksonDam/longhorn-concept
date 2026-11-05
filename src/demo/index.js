// Demo playback: the reference video's own sequence of input, as time-stamped events
// plus a cursor path, authored in 1-based video frame numbers (29.97 fps).
// Each scene contributes its part; ?demo plays it, ?capture uses it for frame diffs.
import { frameTime } from '../core/clock.js'
import { loginDemo } from './login.js'
import { desktopDemo } from './desktop.js'
import { musicDemo } from './music.js'
import { cursorKeys } from './cursor.js'

export function demoEvents() {
  return [...loginDemo, ...desktopDemo, ...musicDemo].map(({ frame, ...e }) => ({ ...e, t: frameTime(frame) }))
}

// cursorKeys: [[frame, x, y], ...] (x, y = hotspot in stage px); null x hides it.
export function demoCursor(t) {
  const keys = cursorKeys
  if (!keys.length) return null
  const f = t * (30000 / 1001) + 1
  if (f <= keys[0][0]) return keys[0][1] == null ? { hidden: true } : { x: keys[0][1], y: keys[0][2] }
  for (let i = 1; i < keys.length; i++) {
    if (f <= keys[i][0]) {
      const [f0, x0, y0] = keys[i - 1]
      const [f1, x1, y1] = keys[i]
      if (x1 == null) return { hidden: true }
      if (x0 == null) return f >= f1 - 1e-6 ? { x: x1, y: y1 } : { hidden: true }
      const k = (f - f0) / (f1 - f0)
      return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k }
    }
  }
  const l = keys[keys.length - 1]
  return l[1] == null ? { hidden: true } : { x: l[1], y: l[2] }
}
