// Window body of my Music: background, task pane, grid toolbar, scrollbar and status bar.
// Static (memoised); the album grid and the header are separate components.
import { memo } from 'react'
import { Txt, abs } from './ui.jsx'
import * as I from './icons.jsx'

const LIGHT = '#a9a9ab'
const DARK = '#717174'
const item = (a, b, swap) => [
  [a, { w: swap ? 560 : 400, c: swap ? DARK : LIGHT }],
  [b, { w: swap ? 400 : 560, c: swap ? LIGHT : DARK }],
]

function Heading({ y, a, b }) {
  return <Txt x={35} y={y} size={17.5} w={300} c="#8ebbe9" parts={[[a + ' ', {}], [b, { w: 500, c: '#3b7cc6' }]]} />
}

export const BodyBg = memo(function BodyBg() {
  return (
    <div
      style={abs(0, 123, 777, 531, {
        background: 'linear-gradient(180deg, #ffffff 0, #ffffff 190px, #f3f7fe 270px, #e3eaf7 410px, #cfdcef 490px, #cad7eb 531px)',
      })}
    />
  )
})

// "enjoy music" fades in a little after the rest of the window (op)
export const EnjoyGroup = memo(function EnjoyGroup({ op = 1 }) {
  if (op <= 0) return null
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, opacity: op }}>
      <Heading y={147.5} a="enjoy" b="music" />
      <div style={abs(11, 156, 18, 18)}>
        <I.PlayAllIcon />
      </div>
      <Txt x={35} y={169.5} size={11} parts={item('Play ', 'All')} />
      <div style={abs(12, 176, 16, 18)}>
        <I.PlaySelectedIcon />
      </div>
      <Txt x={35} y={189} size={11} parts={item('Play ', 'Selected')} />
      <div style={abs(12, 198, 16, 14)}>
        <I.PlaylistIcon />
      </div>
      <Txt x={35} y={208.5} size={11} parts={item('Create ', 'Playlist')} />
      <Txt x={35} y={228.5} size={11} parts={item('Copy ', 'to CD', true)} />
      <Txt x={35} y={247.5} size={11} parts={item('Burn ', 'CD', true)} />
    </div>
  )
})

export const TaskPane = memo(function TaskPane() {
  return (
    <>
      <Heading y={354.5} a="music" b="guide" />
      <Txt x={35} y={374.5} size={11} parts={[['Shop  ', { w: 560, c: DARK }], ['Music on MSN', { w: 400, c: LIGHT }]]} />
      <Txt x={35} y={393.5} size={11} parts={item('Read Music ', 'Reviews')} />
      <Txt x={35} y={412.5} size={11} c={LIGHT}>
        Radio Stations
      </Txt>

      <Heading y={467} a="other" b="tasks" />
    </>
  )
})

const sel = (a, b) => [
  [a + ' ', { w: 500, c: '#6d8db8' }],
  [b, { w: 400, c: '#8cb8ee' }],
]

export const GridBar = memo(function GridBar() {
  return (
    <>
      <Txt x={201} y={352} size={11.5} parts={sel('Group', 'by date')} />
      <div style={abs(268, 348, 7, 4)}>
        <I.DropArrow c="#5a84c4" />
      </div>
      <Txt x={315} y={352} size={11.5} parts={sel('Arrange', 'by date')} />
      <div style={abs(390, 348, 7, 4)}>
        <I.DropArrow c="#5a84c4" />
      </div>
      <Txt x={438} y={352} size={11.5} parts={sel('View', 'by thumbnail')} />
      <div style={abs(526, 348, 7, 4)}>
        <I.DropArrow c="#5a84c4" />
      </div>
      <Txt x={538} y={352} size={11.5} w={500} c="#6d8db8">
        Size
      </Txt>
      {/* size slider: a wedge track with a small knob */}
      <svg width="46" height="14" style={{ position: 'absolute', left: 563, top: 341, overflow: 'visible' }}>
        <defs>
          <linearGradient id="mw-slider" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3f8ae0" />
            <stop offset="1" stopColor="#8cc4ff" />
          </linearGradient>
        </defs>
        <path d="M1 9 L44 2.5 L44 7.5 L1 10 Z" fill="url(#mw-slider)" />
        <path d="M17 12.5 L19 8.5 C20 7.5 22 7.5 23 8.5 L25 12.5 Z" fill="#eef4fc" stroke="#9cb2d0" strokeWidth="0.8" />
      </svg>
    </>
  )
})

export const Scrollbar = memo(function Scrollbar() {
  return (
    <>
      <svg width="16" height="300" style={{ position: 'absolute', left: 758, top: 342, overflow: 'visible' }}>
        <path d="M2 9.5 L8 3.5 L14 9.5 Z" fill="#f8fbff" stroke="#a9b8cc" strokeWidth="1" strokeLinejoin="round" />
        <path d="M2 264 L8 270 L14 264 Z" fill="#f8fbff" stroke="#a9b8cc" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      <div
        style={abs(761, 362, 10, 240, {
          borderRadius: 5,
          background: 'linear-gradient(90deg, rgba(200,214,236,0.55), rgba(246,250,255,0.85) 60%, rgba(220,230,246,0.6))',
        })}
      />
      <div
        style={abs(759.5, 425, 14, 76, {
          borderRadius: 4,
          background: 'linear-gradient(90deg, #f2f6fc, #ffffff 50%, #e8eef8)',
          boxShadow: 'inset 0 0 0 1px #b8c6da, 0 1px 2px rgba(60,90,140,0.2)',
        })}
      />
      {[455, 459, 463, 467].map((y) => (
        <div key={y} style={abs(763, y, 7, 1, { background: '#c8d3e2' })} />
      ))}
      {/* resize grip */}
      <svg width="22" height="22" style={{ position: 'absolute', left: 753, top: 624, overflow: 'visible' }}>
        {[
          [16, 4],
          [10, 10],
          [16, 10],
          [4, 16],
          [10, 16],
          [16, 16],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.3" fill="#f4f8ff" stroke="#b6c4d8" strokeWidth="0.8" />
        ))}
      </svg>
    </>
  )
})

export const StatusBar = memo(function StatusBar() {
  return (
    <>
      <div
        style={abs(0, 634, 777, 19, {
          background: 'linear-gradient(180deg, rgba(255,255,255,0) 0, rgba(255,255,255,0.18) 2px, rgba(255,255,255,0.05) 19px)',
        })}
      />
      <Txt x={362} y={651} size={11} w={500} sx={0.86} c="#eef4fc">
        1 object selected
      </Txt>
    </>
  )
})
