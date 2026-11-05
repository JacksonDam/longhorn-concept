// Bottom bar: translucent band with a highlight line, Shut Down button, clock pill.
import { memo } from 'react'
import { asset, preload } from '../../core/preload.js'
import { BAR, SHUTDOWN, CLOCK } from './layout.js'

// The band is a translucent overlay fitted to the reference over the aurora (tools/login/fit_bar.py):
// a soft colour/alpha field (4 px cells across, 1 px rows so the thin top and bottom lines stay sharp).
const BAR_IMG = asset('img/login/bar.png')
preload([BAR_IMG])

export const BarBand = memo(function BarBand() {
  return (
    <img
      src={BAR_IMG}
      alt=""
      draggable={false}
      style={{ position: 'absolute', left: 0, top: BAR.top, width: 960, height: 720 - BAR.top, pointerEvents: 'none' }}
    />
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

export const Clock = memo(function Clock({ text }) {
  const { left, top, width, height } = CLOCK
  return (
    <div style={{ position: 'absolute', left, top, width, height }}>
      <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <linearGradient id="ck-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2b6fea" />
            <stop offset="0.6" stopColor="#3376ee" />
            <stop offset="1" stopColor="#4c8bf2" />
          </linearGradient>
          <linearGradient id="ck-band" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4a86ec" />
            <stop offset="1" stopColor="#5293ef" />
          </linearGradient>
          <linearGradient id="ck-cap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7cabf5" />
            <stop offset="0.6" stopColor="#5f97ef" />
            <stop offset="1" stopColor="#4c84ee" />
          </linearGradient>
        </defs>
        <rect x="0.5" y="0" width={width - 1} height={height} rx="5" fill="url(#ck-body)" />
        <path d={`M5 0.5 H18 L15 ${height - 0.5} H5 Z`} fill="url(#ck-band)" opacity="0.9" />
        <rect x={width - 15} y="1.5" width="12" height={height - 6} rx="3" fill="url(#ck-cap)" />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 16,
          width: width - 32,
          top: 4.5,
          textAlign: 'center',
          fontFamily: 'Libre Franklin',
          fontSize: 14.5,
          fontWeight: 400,
          color: 'rgb(90,156,255)',
          lineHeight: '17px',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>
    </div>
  )
})
