// Light from the taskbar that the window rises out of (open / restore) and falls into (minimise):
// a fan of soft rays from a point on the taskbar and a small sparkle. Stage px.
import { memo } from 'react'
import { clamp } from '../core/anim.js'
import { table } from './table.js'

const RAYS = [
  [-58, 560, 34, 0.5],
  [-47, 600, 22, 0.8],
  [-38, 520, 30, 0.6],
  [-30, 470, 18, 0.9],
  [-22, 430, 26, 0.7],
  [-13, 400, 16, 0.8],
  [-5, 380, 22, 0.55],
  [4, 330, 16, 0.5],
  [12, 280, 20, 0.35],
] // [angle from vertical (deg), length, width, strength]

const Fan = memo(function Fan() {
  return (
    <svg width="960" height="720" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        <linearGradient id="mw-ray" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#e8f2ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#d8e8ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="mw-haze" cx="0.5" cy="1" r="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="#dce9ff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#dce9ff" stopOpacity="0" />
        </radialGradient>
        <filter id="mw-rayblur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <ellipse cx="380" cy="700" rx="190" ry="210" fill="url(#mw-haze)" />
      <g filter="url(#mw-rayblur)">
        {RAYS.map(([a, len, w, s], i) => (
          <polygon
            key={i}
            points={`${-3},0 ${3},0 ${w / 2},${-len} ${-w / 2},${-len}`}
            transform={`translate(455 704) rotate(${a})`}
            fill="url(#mw-ray)"
            opacity={s}
          />
        ))}
      </g>
    </svg>
  )
})

const Sparkle = memo(function Sparkle() {
  return (
    <svg width="80" height="60" viewBox="-40 -30 80 60" style={{ position: 'absolute', left: 415, top: 665, overflow: 'visible' }}>
      <defs>
        <radialGradient id="mw-spark" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.35" stopColor="#cfe4ff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#7fb2ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="0" cy="0" rx="26" ry="14" fill="url(#mw-spark)" />
      <path d="M0 -22 L2.2 -2.2 L22 0 L2.2 2.2 L0 22 L-2.2 2.2 L-22 0 L-2.2 -2.2 Z" fill="#ffffff" opacity="0.95" />
    </svg>
  )
})

// the soft glow the window rises out of (open): [rel, x0, y0, x1, y1, alpha], stage px,
// measured as the brightened area over the clean desktop in f698-700
const HAZE = table([
  [3.4, 380, 640, 560, 700, 0],
  [4, 260, 480, 640, 700, 0.3],
  [5, 160, 320, 560, 700, 0.32],
  [6, 60, 190, 470, 660, 0.14],
  [7, 40, 120, 420, 600, 0],
])
function Haze({ rel }) {
  if (rel <= 3.4 || rel >= 7) return null
  const [x0, y0, x1, y1, a] = HAZE(rel)
  return (
    <div
      style={{
        position: 'absolute',
        left: x0,
        top: y0,
        width: x1 - x0,
        height: y1 - y0 + 30,
        borderRadius: 40,
        background: 'linear-gradient(180deg, rgba(235,243,255,0.6), rgba(255,255,255,1))',
        opacity: a,
        filter: 'blur(18px)',
      }}
    />
  )
}

// rel: frames since the trigger; fan: [start, peak, end]; spark: [start, peak, end]
const env = (rel, [a, b, c]) => (rel <= a || rel >= c ? 0 : rel < b ? (rel - a) / (b - a) : 1 - (rel - b) / (c - b))

// dx: horizontal shift of the whole effect (taskbar button x relative to the video's my Music slot)
export function Beam({ rel, fan = [3.2, 6, 8.2], spark = [7, 8.5, 12.5], rise = true, haze = false, fanOp = 1, dx = 0 }) {
  const f = clamp(env(rel, fan)) * fanOp
  const s = clamp(env(rel, spark))
  if (f <= 0 && s <= 0 && !(haze && rel > 3.4 && rel < 7)) return null
  // the fan grows upwards while it brightens
  const grow = rise ? clamp((rel - fan[0]) / (fan[1] - fan[0] + 1.5), 0.35, 1) : 1
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 960, height: 720, pointerEvents: 'none', transform: dx ? `translateX(${dx}px)` : undefined }}>
      {haze && <Haze rel={rel} />}
      {f > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: f, transform: `scaleY(${grow})`, transformOrigin: '455px 704px' }}>
          <Fan />
        </div>
      )}
      {s > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: s }}>
          <Sparkle />
        </div>
      )}
    </div>
  )
}
