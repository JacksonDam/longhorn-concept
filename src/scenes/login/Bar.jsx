// Bottom bar: translucent band with a highlight line, Shut Down button, clock pill.
import { memo } from 'react'
import { asset, preload } from '../../core/preload.js'
import { BAR, SHUTDOWN, CLOCK } from './layout.js'
import { seam } from '../../core/Stage.jsx'

// The band is a translucent overlay fitted to the reference over the aurora (tools/login/fit_bar.py):
// a soft colour/alpha field (4 px cells across, 1 px rows so the thin top and bottom lines stay sharp).
const BAR_IMG = asset('img/login/bar.png')
preload([BAR_IMG])

// The band on a wider stage: its ends stay at the stage's ends (the highlight line's fade-in and
// Shut Down's part on the left, the line's fade-out and the clock's part on the right) and the
// soft middle between them stretches across (a 4 px-cell field, smooth along x; its rows, the
// thin lines, keep their heights). The three parts meet on whole device pixels (seam): Safari
// rounds each composited layer's edges to device pixels on its own at a phone's page zoom, and
// parts meeting inside a pixel could leave a column of the aurora between them. At the frame's
// width it is the image as fitted.
const BAR_H = 720 - BAR.top
const ENDS = [120, 160] // stage px of the band at its left and right ends kept as they are
const barImg = { position: 'absolute', top: 0, height: BAR_H, maxWidth: 'none' }
export const BarBand = memo(function BarBand({ w = 960, dh = 0 }) {
  const top = BAR.top + dh
  if (w <= 960)
    return <img src={BAR_IMG} alt="" draggable={false} style={{ position: 'absolute', left: 0, top, width: 960, height: BAR_H, pointerEvents: 'none' }} />
  const [a, b] = ENDS
  const f = (w - a - b) / (960 - a - b) // the middle's stretch
  const x1 = seam(a), x2 = seam(w - b)
  const part = (left, right, imgLeft, imgWidth) => (
    <div style={{ position: 'absolute', left, top, width: right - left, height: BAR_H, overflow: 'hidden', pointerEvents: 'none' }}>
      <img src={BAR_IMG} alt="" draggable={false} style={{ ...barImg, left: imgLeft - left, width: imgWidth }} />
    </div>
  )
  return (
    <>
      {part(0, x1, 0, 960)}
      {part(x1, x2, a - a * f, 960 * f)}
      {part(x2, w, w - 960, 960)}
    </>
  )
})

const labelStyle = {
  position: 'absolute',
  fontFamily: 'Libre Franklin',
  fontSize: 12,
  fontWeight: 600,
  color: 'rgb(214,232,255)',
  whiteSpace: 'nowrap',
  textAlign: 'center',
  lineHeight: '14px',
  textShadow: '0 1px 1.5px rgba(5,30,120,0.55)',
}

export const ShutDown = memo(function ShutDown({ onClick }) {
  const { cx, cy, r, labelY } = SHUTDOWN
  return (
    <>
      <svg
        width={2 * r + 4}
        height={2 * r + 4}
        viewBox={`${-r - 2} ${-r - 2} ${2 * r + 4} ${2 * r + 4}`}
        style={{ position: 'absolute', left: cx - r - 2, top: cy - r - 2, overflow: 'visible', cursor: 'pointer' }}
        onPointerDown={onClick}
      >
        <defs>
          <radialGradient id="sd-body" cx="0.55" cy="0.78" r="0.7">
            <stop offset="0" stopColor="#8db0ff" />
            <stop offset="0.55" stopColor="#5a88fb" />
            <stop offset="1" stopColor="#4a7af2" />
          </radialGradient>
          <linearGradient id="sd-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dfe6ff" stopOpacity="0.95" />
            <stop offset="0.55" stopColor="#c4d2ff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#a8c0ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sd-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c0d4f0" />
            <stop offset="0.5" stopColor="#7aa6e6" />
            <stop offset="1" stopColor="#64a6f6" />
          </linearGradient>
        </defs>
        <circle r={r} fill="none" stroke="url(#sd-rim)" strokeWidth="1.6" opacity="0.9" />
        <circle r={r - 1.2} fill="url(#sd-body)" />
        <ellipse cx="0" cy={-r * 0.42} rx={r * 0.78} ry={r * 0.5} fill="url(#sd-top)" />
        <line x1="0" y1="-4.5" x2="0" y2="4.5" stroke="#9cc6ff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div onPointerDown={onClick} style={{ ...labelStyle, left: cx - 40, width: 80, top: labelY - 7, fontSize: 12.5, cursor: 'pointer' }}>
        Shut Down
      </div>
    </>
  )
})

export function clockText(demo) {
  if (demo) return '7:09 PM'
  const d = new Date()
  const h = d.getHours() % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`
}

// The video's pill also has a lighter slanted band at its left end; it is left out (the user's
// call), and the time is centred in the pill's body left of the cap, so a longer time ("12:07 AM")
// keeps clear of the cap.
export const Clock = memo(function Clock({ text }) {
  const { left, top, width, height } = CLOCK
  const capX = width - 17.5 // the cap's left edge
  return (
    <div style={{ position: 'absolute', left, top, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          {/* an inset pill (measured on frames 290-320): darkest at the top, lighter towards a
              light rim at the bottom */}
          <linearGradient id="ck-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2e6ce6" />
            <stop offset="0.25" stopColor="#2768e8" />
            <stop offset="0.65" stopColor="#2a6be6" />
            <stop offset="0.9" stopColor="#3e7cf1" />
            <stop offset="1" stopColor="#5a90f0" />
          </linearGradient>
          <linearGradient id="ck-cap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7cabf5" />
            <stop offset="0.6" stopColor="#5f97ef" />
            <stop offset="1" stopColor="#4c84ee" />
          </linearGradient>
        </defs>
        <rect x="0.5" y="0" width={width - 1} height={height} rx="5" fill="url(#ck-body)" />
        <rect x="1" y="0.5" width={width - 2} height={height - 1} rx="4.5" fill="none" stroke="#7aa8f4" strokeOpacity="0.45" />
        <rect x={capX} y="2" width="15" height={height - 4.5} rx="3.5" fill="url(#ck-cap)" />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 0.5,
          width: capX - 0.5,
          top: 4.5,
          textAlign: 'center',
          fontFamily: 'Libre Franklin',
          fontSize: 14.5,
          fontWeight: 600,
          color: 'rgb(80,144,250)',
          lineHeight: '17px',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>
    </div>
  )
})
