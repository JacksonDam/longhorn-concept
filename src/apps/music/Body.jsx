// Window body of my Music: background, task pane, grid toolbar, scrollbar and status bar.
// Static (memoised); the album grid and the header are separate components.
import { memo, useRef } from 'react'
import { toStage } from '../../core/Stage.jsx'
import { Txt, abs, useLayer, SX } from '../../os/text.jsx'
import { DropMenu, dropBelow, wid, runsWidth } from '../../ui/index.js'
import { SIZE_MIN, SIZE_MAX } from './layout.js'
import * as I from '../../os/icons.jsx'

const LIGHT = '#a9a9ab'
const DARK = '#717174'
const item = (a, b, swap) => [
  [a, { w: swap ? 560 : 400, c: swap ? DARK : LIGHT }],
  [b, { w: swap ? 400 : 560, c: swap ? LIGHT : DARK }],
]

function Heading({ y, a, b }) {
  return <Txt x={35} y={y} size={17.5} w={300} c="#8ebbe9" parts={[[a + ' ', {}], [b, { w: 500, c: '#3b7cc6' }]]} />
}

export const BodyBg = memo(function BodyBg({ w = 777, h = 654 }) {
  return (
    <div
      style={abs(0, 123, w, h - 123, {
        background: 'linear-gradient(180deg, #ffffff 0, #ffffff 190px, #f3f7fe 270px, #e3eaf7 410px, #cfdcef 490px, #cad7eb 531px)',
      })}
    />
  )
})

// a clickable task-pane row (window-local): hover underlines nothing (Plex rows just brighten)
function Link({ x = 30, y, w = 150, onClick, id }) {
  if (!onClick) return null
  return <div data-hit={id} style={abs(x, y - 12, w, 17, { cursor: 'default' })} onClick={(e) => (e.stopPropagation(), onClick())} />
}
// a section heading that collapses its links
function HeadingHit({ y, onClick, id }) {
  if (!onClick) return null
  return <div data-hit={id} style={abs(30, y - 17, 150, 22)} onClick={(e) => (e.stopPropagation(), onClick())} />
}

// "enjoy music" fades in a little after the rest of the window (op); A = musicActions (live only)
export const EnjoyGroup = memo(function EnjoyGroup({ op = 1, A, collapsed = false }) {
  const LAYER = useLayer()
  if (op <= 0) return null
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, opacity: op, willChange: LAYER }}>
      <Heading y={147.5} a="enjoy" b="music" />
      <HeadingHit y={147.5} id="music.sec.enjoy" onClick={A?.section('enjoy')} />
      {!collapsed && (
        <>
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
          <Link y={169.5} id="music.playall" onClick={A?.playAll} />
          <Link y={189} id="music.playsel" onClick={A?.playSelected} />
          <Link y={208.5} id="music.playlist" onClick={A?.createPlaylist} />
          <Link y={228.5} id="music.copycd" onClick={A?.burn} />
          <Link y={247.5} id="music.burncd" onClick={A?.burn} />
        </>
      )}
    </div>
  )
})

export const TaskPane = memo(function TaskPane({ A, guide = false, other = true }) {
  // collapsed flags: the video shows "music guide" open and "other tasks" closed
  return (
    <>
      <Heading y={354.5} a="music" b="guide" />
      <HeadingHit y={354.5} id="music.sec.guide" onClick={A?.section('guide')} />
      {!guide && (
        <>
          <Txt x={35} y={374.5} size={11} parts={[['Shop  ', { w: 560, c: DARK }], ['Music on MSN', { w: 400, c: LIGHT }]]} />
          <Txt x={35} y={393.5} size={11} parts={item('Read Music ', 'Reviews')} />
          <Txt x={35} y={412.5} size={11} c={LIGHT}>
            Radio Stations
          </Txt>
          <Link y={374.5} id="music.shop" onClick={A?.shop} />
          <Link y={393.5} id="music.reviews" onClick={A?.reviews} />
          <Link y={412.5} id="music.radio" onClick={A?.radio} />
        </>
      )}
      <Heading y={guide ? 395 : 467} a="other" b="tasks" />
      <HeadingHit y={guide ? 395 : 467} id="music.sec.other" onClick={A?.section('other')} />
      {!other &&
        [['my ', 'Documents', 'documents'], ['my ', 'Pictures', 'pictures'], ['my ', 'Computer', 'computer']].map(([a, b, k], i) => {
          const y = (guide ? 395 : 467) + 22 + i * 19.5
          return (
            <div key={k}>
              <Txt x={35} y={y} size={11} parts={item(a, b)} />
              <Link y={y} id={'music.' + k} onClick={A?.[k]} />
            </div>
          )
        })}
    </>
  )
})

// Folders: a small folder tree instead of the task pane
const FOLDERS = [
  ['Desktop', 0, null],
  ['my Documents', 1, 'documents'],
  ['my Music', 2, 'music'],
  ['my Pictures', 2, 'pictures'],
  ['my Computer', 1, 'computer'],
  ['Local Disk (C:)', 2, 'computer'],
  ['Control Panel', 2, 'control'],
  ['Recycle Bin', 1, null],
]
export const FoldersPane = memo(function FoldersPane({ A }) {
  return (
    <>
      <Heading y={147.5} a="my" b="folders" />
      {FOLDERS.map(([label, depth, app], i) => {
        const y = 172 + i * 19
        const cur = app === 'music'
        return (
          <div key={label}>
            {cur && <div style={abs(14 + depth * 12, y - 12, 150 - depth * 12, 17, { borderRadius: 3, background: 'rgba(90,150,235,0.22)' })} />}
            <div style={abs(18 + depth * 12, y - 10, 13, 11, { borderRadius: 2, background: 'linear-gradient(180deg, #ffe08a, #e9b83a)', boxShadow: 'inset 0 0 0 1px #c99a2a' })} />
            <Txt x={36 + depth * 12} y={y} size={11} c={cur ? '#2c5aa0' : DARK}>
              {label}
            </Txt>
            {app && A && <Link x={14 + depth * 12} y={y} w={150 - depth * 12} id={'music.folder.' + i} onClick={() => (app === 'music' ? null : A[app] ? A[app]() : null)} />}
          </div>
        )
      })}
    </>
  )
})

const sel = (a, b) => [
  [a + ' ', { w: 500, c: '#6d8db8' }],
  [b, { w: 400, c: '#8cb8ee' }],
]

const GROUP = { date: 'by date', artist: 'by artist', genre: 'by genre', none: 'none' }
const ARRANGE = { date: 'by date', name: 'by name', artist: 'by artist' }
const VIEW = { thumbnail: 'by thumbnail', tiles: 'by tiles', details: 'by details' }
// a drop-down label's arrow: ARROW_GAP px after its measured text (Txt draws it at SX)
const ARROW_GAP = 6
const arrowAfter = (x, a, b) => Math.round(x + runsWidth(sel(a, b), { size: 11.5, sx: SX }) + ARROW_GAP)
// the bar above the album view (dx, dy: offsets from the video's place); A + win for the menus
export function GridBar({ s, dx = 0, dy = 0, A, win }) {
  const ag = arrowAfter(201, 'Group', GROUP[s.group])
  const aa = arrowAfter(315, 'Arrange', ARRANGE[s.arrange])
  const av = arrowAfter(438, 'View', VIEW[s.view])
  const sz = av + 12 // "Size" and its slider follow the View drop-down
  const drop = (name, map, setter) => (e) => {
    e.stopPropagation()
    dropBelow(wid(win, 'mv.menu.' + name), e.currentTarget, Object.entries(map).map(([k, label]) => ({ label: label[0].toUpperCase() + label.slice(1), radio: true, checked: s[name] === k, onClick: setter(k) })))
  }
  return (
    <div style={{ position: 'absolute', left: dx, top: dy }}>
      <Txt x={201} y={352} size={11.5} parts={sel('Group', GROUP[s.group])} />
      <div style={abs(ag, 348, 7, 4)}>
        <I.DropArrow c="#5a84c4" />
      </div>
      <Txt x={315} y={352} size={11.5} parts={sel('Arrange', ARRANGE[s.arrange])} />
      <div style={abs(aa, 348, 7, 4)}>
        <I.DropArrow c="#5a84c4" />
      </div>
      <Txt x={438} y={352} size={11.5} parts={sel('View', VIEW[s.view])} />
      <div style={abs(av, 348, 7, 4)}>
        <I.DropArrow c="#5a84c4" />
      </div>
      <Txt x={sz} y={352} size={11.5} w={500} c="#6d8db8">
        Size
      </Txt>
      <SizeSlider x={sz + 25} size={s.size} A={A} />
      {A && (
        <>
          <div data-hit="music.group" style={abs(198, 338, ag + 10 - 198, 18)} onClick={drop('group', GROUP, A.setGroup)} />
          <div data-hit="music.arrange" style={abs(312, 338, aa + 10 - 312, 18)} onClick={drop('arrange', ARRANGE, A.setArrange)} />
          <div data-hit="music.view" style={abs(435, 338, av + 10 - 435, 18)} onClick={drop('view', VIEW, A.setView)} />
          <DropMenu id={wid(win, 'mv.menu.group')} items={Object.entries(GROUP).map(([k, l]) => ({ label: l[0].toUpperCase() + l.slice(1), radio: true, checked: s.group === k, onClick: A.setGroup(k) }))} />
          <DropMenu id={wid(win, 'mv.menu.arrange')} items={Object.entries(ARRANGE).map(([k, l]) => ({ label: l[0].toUpperCase() + l.slice(1), radio: true, checked: s.arrange === k, onClick: A.setArrange(k) }))} />
          <DropMenu id={wid(win, 'mv.menu.view')} items={Object.entries(VIEW).map(([k, l]) => ({ label: l[0].toUpperCase() + l.slice(1), radio: true, checked: s.view === k, onClick: A.setView(k) }))} />
        </>
      )}
    </div>
  )
}

// the Size slider: a wedge track with a small knob (the video's knob sits at the default 49 px)
const knobX = (size) => 1 + ((size - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)) * 42
function SizeSlider({ x, size, A }) {
  const drag = useRef(null)
  const set = (e) => {
    const p = toStage(e.clientX, e.clientY)
    const k = Math.max(0, Math.min(1, (p.x - drag.current.x0 - 2) / 42))
    A.setSize(Math.round(SIZE_MIN + k * (SIZE_MAX - SIZE_MIN)))
  }
  const kx = knobX(size)
  return (
    <>
      <svg width="46" height="14" style={{ position: 'absolute', left: x, top: 341, overflow: 'visible' }}>
        <defs>
          <linearGradient id="mw-slider" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3f8ae0" />
            <stop offset="1" stopColor="#8cc4ff" />
          </linearGradient>
        </defs>
        <path d="M1 9 L44 2.5 L44 7.5 L1 10 Z" fill="url(#mw-slider)" />
        <path d={`M${kx - 4} 12.5 L${kx - 2} 8.5 C${kx - 1} 7.5 ${kx + 1} 7.5 ${kx + 2} 8.5 L${kx + 4} 12.5 Z`} fill="#eef4fc" stroke="#9cb2d0" strokeWidth="0.8" />
      </svg>
      {A && (
        <div
          data-hit="music.size"
          style={abs(x - 4, 336, 54, 20)}
          onPointerDown={(e) => {
            e.stopPropagation()
            const r = e.currentTarget.getBoundingClientRect()
            drag.current = { x0: toStage(r.left, r.top).x + 4 }
            e.currentTarget.setPointerCapture(e.pointerId)
            set(e)
          }}
          onPointerMove={(e) => drag.current && set(e)}
          onPointerUp={() => (drag.current = null)}
        />
      )}
    </>
  )
}

// the resize grip in the bottom-right corner
export const ResizeGrip = memo(function ResizeGrip({ x = 753, y = 624 }) {
  return (
    <svg width="22" height="22" style={{ position: 'absolute', left: x, top: y, overflow: 'visible' }}>
      {[
        [16, 4],
        [10, 10],
        [16, 10],
        [4, 16],
        [10, 16],
        [16, 16],
      ].map(([gx, gy], i) => (
        <circle key={i} cx={gx} cy={gy} r="2.3" fill="#f4f8ff" stroke="#b6c4d8" strokeWidth="0.8" />
      ))}
    </svg>
  )
})

// the status bar: its text centred where the video's "1 object selected" sits (x 362 of 777)
export const StatusBar = memo(function StatusBar({ text = '1 object selected', w = 777, h = 654 }) {
  return (
    <>
      <div
        style={abs(0, h - 20, w, 19, {
          background: 'linear-gradient(180deg, rgba(255,255,255,0) 0, rgba(255,255,255,0.18) 2px, rgba(255,255,255,0.05) 19px)',
        })}
      />
      <Txt x={text === '1 object selected' ? 362 + (w - 777) / 2 : w / 2 + 3} y={h - 3} size={11} w={500} sx={0.86} c="#eef4fc" anchor={text === '1 object selected' ? 'start' : 'middle'}>
        {text}
      </Txt>
    </>
  )
})
