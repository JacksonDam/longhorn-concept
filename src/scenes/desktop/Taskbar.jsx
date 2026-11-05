// The Plex taskbar (y 699-720): translucent blue bar, start button, a centred group of
// task buttons (light blue), the clock and a round chevron under the sidebar.
import { memo } from 'react'
import { asset } from '../../core/preload.js'
import { emit } from '../../core/events.js'
import { Chevron, OutlookIcon, WinampIcon } from './icons.jsx'

export const BAR_TOP = 699

// Per-row colours of the bar (alpha 0.55 over the wallpaper), measured rows 699..719.
const BAR_ROWS = [
  [48, 82, 96], [92, 137, 188], [110, 155, 206], [90, 144, 221], [81, 135, 212], [75, 133, 224],
  [74, 131, 223], [66, 131, 219], [65, 129, 218], [63, 128, 210], [62, 127, 209], [61, 123, 200],
  [59, 121, 198], [58, 118, 191], [55, 115, 188], [55, 113, 180], [53, 110, 178], [50, 108, 174],
  [48, 106, 172], [47, 105, 170], [38, 96, 161],
]
const rowsGradient = (rows, a) =>
  'linear-gradient(to bottom,' +
  rows.map(([r, g, b], i) => `rgba(${r},${g},${b},${a}) ${i}px, rgba(${r},${g},${b},${a}) ${i + 1}px`).join(',') +
  ')'

// Task buttons. Two measured layouts: without and with the "My Music" button.
// x: button left edge, w: width; icon/text offsets are from the left edge.
export const TASKS = {
  // tw: visible text width, the last ~12 px fade out (measured where the video's text fades)
  inbox: { label: 'Inbox - Microsoft Outlook', Icon: OutlookIcon, tw: 99 },
  yahoo: { label: 'Yahoo.com', icon: 'ic-ie.webp' },
  music: { label: 'My Music', icon: 'ic-mymusic.webp' },
  doc: { label: 'Document 12 - Microsoft Word', icon: 'ic-word.svg', tw: 66 },
  winamp: { label: 'Winamp3', Icon: WinampIcon },
}
export const LAYOUT4 = {
  x0: 248,
  x1: 675.5,
  buttons: [
    { id: 'inbox', x: 248, w: 131.5, icon: 9, text: 29, sep: true },
    { id: 'yahoo', x: 379.5, w: 102, icon: 8.5, text: 28.5, sep: true },
    { id: 'doc', x: 481.5, w: 108, icon: 7.5, text: 29.5, sep: true },
    { id: 'winamp', x: 589.5, w: 86, icon: 8.5, text: 27.5 },
  ],
}
export const LAYOUT5 = {
  x0: 185.5,
  x1: 730.5,
  buttons: [
    { id: 'inbox', x: 185.5, w: 127, icon: 6.5, text: 25.5, sep: true },
    { id: 'yahoo', x: 312.5, w: 100, icon: 9.5, text: 29.5, sep: true },
    { id: 'music', x: 412.5, w: 118, icon: 17.5, text: 39.5 },
    { id: 'doc', x: 530.5, w: 114, icon: 14.5, text: 35.5, sep: true },
    { id: 'winamp', x: 644.5, w: 86, icon: 10.5, text: 27.5 },
  ],
}

const btnText = {
  position: 'absolute',
  top: 700,
  height: 16,
  lineHeight: '16px',
  fontFamily: "'Libre Franklin', Tahoma, sans-serif",
  fontSize: 9.9,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.95)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
}

export const TaskButton = memo(function TaskButton({ b, onClick }) {
  const t = TASKS[b.id]
  const textW = t.tw ?? b.w - b.text - 4
  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      {t.Icon ? (
        <t.Icon x={b.x + b.icon} y={702} />
      ) : (
        <img
          src={asset('img/desktop/' + t.icon)}
          alt=""
          style={{ position: 'absolute', left: b.x + b.icon, top: 702, width: 16, height: 16 }}
        />
      )}
      <div
        style={{
          ...btnText,
          left: b.x + b.text,
          width: textW,
          maskImage: `linear-gradient(to right, #000 ${textW - 12}px, transparent ${textW}px)`,
        }}
      >
        {t.label}
      </div>
      {b.sep && (
        <div
          style={{
            position: 'absolute',
            left: b.x + b.w - 0.5,
            top: 705,
            width: 1,
            height: 10,
            background: 'rgba(200,225,255,0.55)',
          }}
        />
      )}
      {onClick && (
        <div
          style={{ position: 'absolute', left: b.x, top: 699, width: b.w, height: 21, pointerEvents: 'auto' }}
          onPointerDown={(e) => {
            e.stopPropagation()
            onClick(b.id)
          }}
          onPointerEnter={() => emit('hover', { id: 'tb.' + b.id, on: true })}
          onPointerLeave={() => emit('hover', { id: 'tb.' + b.id, on: false })}
        />
      )}
    </div>
  )
})

export const GroupBg = memo(function GroupBg({ x0, x1 }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x0,
        top: 698,
        width: x1 - x0,
        height: 22,
        background:
          'linear-gradient(to bottom, rgb(150,190,205) 0px, rgb(172,214,223) 1px, rgb(172,214,223) 2px, rgb(108,178,250) 2px, rgb(112,181,252) 12px, rgb(116,177,242) 13px, rgb(112,173,238) 20px, rgb(84,132,201) 21px, rgb(84,132,201) 22px)',
      }}
    />
  )
})

export const Bar = memo(function Bar() {
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: BAR_TOP, width: 858, height: 21, background: rowsGradient(BAR_ROWS, 0.55) }} />
      <div style={{ position: 'absolute', left: 0, top: 700, width: 60, height: 20, background: 'linear-gradient(to right, rgba(30,40,90,0.22), rgba(30,40,90,0.12) 30px, rgba(30,40,90,0) 60px)' }} />
    </>
  )
})

// The start flag first shows in washed-out colour, then turns white-blue (frames 568.5-574)
export const StartFlag = memo(function StartFlag({ pastel }) {
  return (
    <img
      src={asset('img/desktop/flag.svg')}
      alt=""
      style={{
        position: 'absolute',
        left: 7,
        top: 702,
        width: 17,
        height: 15,
        filter: pastel ? 'saturate(0.55) brightness(1.7) contrast(0.85)' : 'grayscale(1) brightness(2.4) contrast(0.9)',
      }}
    />
  )
})

export const StartLabel = memo(function StartLabel() {
  return (
    <div style={{ position: 'absolute', left: 29, top: 701, fontSize: 13, lineHeight: '17px', fontWeight: 600, color: 'rgba(240,248,255,0.95)' }}>
      start
    </div>
  )
})

export function Clock({ label, old }) {
  // the entrance clock ("7:09 PM", carried over from the login screen) is dim and lighter
  const look = old
    ? { fontWeight: 500, fontSize: 10.6, color: 'rgba(196,212,226,0.55)', top: 702.5 }
    : { fontWeight: 600, fontSize: 11.2, color: 'rgba(222,234,246,0.9)', top: 702.5 }
  return (
    <div style={{ position: 'absolute', left: 858, width: 76, textAlign: 'right', fontFamily: "'Libre Franklin', Tahoma, sans-serif", lineHeight: '16px', ...look }}>
      {label}
    </div>
  )
}

// While the taskbar is still being built (frames ~520-574) it glows around the task group
// and is darker towards both ends; measured as two overlays on the final bar.
export const EarlyBarTint = memo(function EarlyBarTint() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 699,
          width: 858,
          height: 21,
          background:
            'linear-gradient(to right, rgba(10,20,35,0.5) 0px, rgba(10,20,35,0.5) 40px, rgba(10,20,35,0.45) 60px, rgba(10,20,35,0.25) 100px, rgba(10,20,35,0.05) 140px, rgba(10,20,35,0) 160px, rgba(10,20,35,0) 780px, rgba(10,20,35,0.08) 820px, rgba(10,20,35,0.22) 858px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 699,
          width: 858,
          height: 21,
          background:
            'linear-gradient(to right, rgba(160,210,255,0) 140px, rgba(160,210,255,0.08) 170px, rgba(160,210,255,0.16) 200px, rgba(160,210,255,0.25) 248px, rgba(160,210,255,0.25) 676px, rgba(160,210,255,0.13) 724px, rgba(160,210,255,0.04) 772px, rgba(160,210,255,0) 800px)',
        }}
      />
    </>
  )
})

export const ShutDot = memo(function ShutDot() {
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        top: 704,
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 35%, #c9d6ff, #5f78d8 60%, #3c55b8)',
      }}
    />
  )
})

export const ClockChevron = memo(function ClockChevron() {
  return <Chevron x={943} y={702} />
})
