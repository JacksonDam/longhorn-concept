// Bottom bar: translucent band with a highlight line, Shut Down button, clock pill.
import { memo } from 'react'
import { BAR, SHUTDOWN, CLOCK } from './layout.js'

export const BarBand = memo(function BarBand() {
  return (
    <div style={{ position: 'absolute', left: 0, top: BAR.top, width: 960, height: 720 - BAR.top, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(150,200,255,0) 0px, rgba(150,200,255,0.38) 140px, rgba(150,200,255,0.42) 600px, rgba(150,200,255,0.2) 960px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 960,
          height: 2,
          background:
            'linear-gradient(90deg, rgba(220,235,255,0) 20px, rgba(220,235,255,0.6) 150px, rgba(220,235,255,0.6) 700px, rgba(220,235,255,0) 880px)',
        }}
      />
      <div style={{ position: 'absolute', left: 0, top: 716 - BAR.top, width: 960, height: 1.5, background: 'rgba(200,225,255,0.25)' }} />
      <div style={{ position: 'absolute', left: 0, top: 719 - BAR.top, width: 960, height: 1, background: 'rgba(0,20,90,0.35)' }} />
    </div>
  )
})

const labelStyle = {
  position: 'absolute',
  fontFamily: 'Plex',
  fontSize: 12,
  fontWeight: 500,
  color: 'rgb(214,232,255)',
  whiteSpace: 'nowrap',
  textAlign: 'center',
  lineHeight: '14px',
  textShadow: '0 1px 1px rgba(10,40,140,0.35)',
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
          <radialGradient id="sd-body" cx="0.4" cy="0.32" r="0.75">
            <stop offset="0" stopColor="#9fb6ff" />
            <stop offset="0.45" stopColor="#5571f0" />
            <stop offset="1" stopColor="#3a52d8" />
          </radialGradient>
          <linearGradient id="sd-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d6e2ff" />
            <stop offset="1" stopColor="#8fa8ff" />
          </linearGradient>
        </defs>
        <circle r={r} fill="url(#sd-rim)" opacity="0.85" />
        <circle r={r - 2} fill="url(#sd-body)" />
        <ellipse cx="-1.5" cy="-6" rx="8" ry="5" fill="#fff" opacity="0.28" />
        <line x1="0" y1="-5" x2="0" y2="1.5" stroke="#e8eeff" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <div style={{ ...labelStyle, left: cx - 40, width: 80, top: labelY - 7, fontWeight: 600, fontSize: 11.5 }}>Shut Down</div>
    </>
  )
})

export function clockText(demo) {
  if (demo) return '7:09 PM'
  const d = new Date()
  const h = d.getHours() % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`
}

export const Clock = memo(function Clock({ text }) {
  const { left, top, width, height } = CLOCK
  return (
    <div style={{ position: 'absolute', left, top, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <linearGradient id="ck-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3f7cf2" />
            <stop offset="1" stopColor="#2f69e6" />
          </linearGradient>
          <linearGradient id="ck-cap" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4a86f0" />
            <stop offset="1" stopColor="#7aa8f6" />
          </linearGradient>
        </defs>
        <rect x="0.5" y="0.5" width={width - 1} height={height - 1} rx="6" fill="url(#ck-body)" opacity="0.85" />
        <rect x="1" y="1" width="16" height={height - 2} rx="5" fill="url(#ck-cap)" opacity="0.55" />
        <rect x={width - 19} y="2.5" width="15" height={height - 5} rx="3.5" fill="#8fb4f6" opacity="0.6" />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 18,
          width: width - 38,
          top: 5,
          textAlign: 'center',
          fontFamily: 'Plex',
          fontSize: 15,
          fontWeight: 400,
          color: 'rgb(122,170,250)',
          lineHeight: '17px',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>
    </div>
  )
})
