// The Plex Start menu, after the user's mock-up (ref3/insp1.png, docs/briefs/start-menu-mockup.md):
// a translucent blue glass panel rising out of the taskbar above the start button. Header:
// user picture, big name, "switch user", round red "shut down" and amber "log off" buttons.
// Left column: pinned programs with big icons (title + subtitle), a small-icon list and
// "All Programs & Services". Right column (lighter glass): places, then Search, Control Panel,
// Help & Support, Run..., Windows Tour, Top 10 Tasks. Hover = a thin red outline box, as in
// the mock-up. Only entries that open something the OS has.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { hasApp } from '../../os/apps.js'
import { Popup } from './Popup.jsx'
import { closePopups, hover, hoverOn, hoverOff } from './shellState.js'
import { launch, openApp } from './appInfo.jsx'
import {
  IEIcon, OutlookIcon, WordIcon, WinampIcon, DocumentsIcon, PicturesIcon, MusicIcon, ComputerIcon,
  ControlIcon, HelpIcon, SearchIcon, RunIcon, DialogIcon,
} from './appIcons.jsx'

export const START = { x: 0, y: 281, w: 300, h: 418 }
const HEAD = 80
const SPLIT = 152
const font = "'Libre Franklin', Tahoma, sans-serif"
const heavy = "'Franklin Gothic', 'Libre Franklin', sans-serif"
const shadow = '0 1px 2px rgba(0,25,80,0.75)'

// Windows Tour: the Help and Support Center's tour page (reloading into ?demo would end the session)
const tour = () => launch.help({ page: 'tour' })
// optional small programs (shown when the app is registered)
const OPTIONAL = [
  { app: 'notepad', label: 'Notepad' },
  { app: 'calculator', label: 'Calculator' },
  { app: 'paint', label: 'Paint' },
  { app: 'solitaire', label: 'Solitaire' },
]

const PINNED = [
  { label: 'Outlook', sub: 'E-mail', Icon: OutlookIcon, go: () => launch.email() },
  { label: 'Word', sub: 'Word Processor', Icon: WordIcon, go: () => launch.word() },
  { label: 'Internet Explorer', sub: 'Web Browser', Icon: IEIcon, go: () => launch.internet() },
]
const listFor = () => [
  { label: 'Winamp3', Icon: WinampIcon, go: () => launch.winamp() },
  { label: 'my Music', Icon: MusicIcon, go: () => launch.music() },
  ...OPTIONAL.filter((o) => hasApp(o.app)).map((o) => ({ label: o.label, Icon: DialogIcon, go: () => openApp(o.app, o.app) })),
].slice(0, 6)
const RIGHT = [
  { label: 'My Documents', Icon: DocumentsIcon, go: () => launch.documents() },
  { label: 'My Pictures', Icon: PicturesIcon, go: () => launch.pictures(), bold: true },
  { label: 'My Videos', Icon: DocumentsIcon, go: () => openApp('documents', 'documents', { go: ['my Computer', 'my Documents', 'my Videos'] }) },
  { label: 'My Computer', Icon: ComputerIcon, go: () => launch.computer() },
  { label: 'Shared Documents', Icon: DocumentsIcon, go: () => openApp('computer', 'computer', { go: ['my Computer', 'Shared Documents'] }) },
  { sep: true },
  { label: 'Search', Icon: SearchIcon, go: () => launch.search() },
  { label: 'Control Panel', Icon: ControlIcon, go: () => launch.control() },
  { label: 'Help & Support', Icon: HelpIcon, go: () => launch.help() },
  { label: 'Run...', Icon: RunIcon, go: () => launch.run() },
  { label: 'Windows Tour', Icon: HelpIcon, go: tour },
  { label: 'Top 10 Tasks', Icon: HelpIcon, go: () => launch.help({ page: 'tasks' }) },
]

function buildRows() {
  const out = []
  PINNED.forEach((it, i) => out.push({ ...it, id: 'sm.p' + i, x: 4, y: HEAD + 6 + i * 44, w: SPLIT - 8, h: 40, big: true }))
  listFor().forEach((it, i) => out.push({ ...it, id: 'sm.l' + i, x: 4, y: HEAD + 146 + i * 25, w: SPLIT - 8, h: 24 }))
  out.push({ label: 'All Programs & Services', id: 'sm.all', x: 4, y: START.h - 30, w: SPLIT - 8, h: 24, all: true, go: () => openApp('programs', 'programs') })
  let y = HEAD + 8
  RIGHT.forEach((it, i) => {
    if (it.sep) {
      y += 10
      return
    }
    out.push({ ...it, id: 'sm.r' + i, x: SPLIT + 2, y, w: START.w - SPLIT - 6, h: 25 })
    y += 26
  })
  out.push({ label: 'switch user', id: 'sm.switch', x: 70, y: 40, w: 70, h: 16, go: () => emit('session.switch'), plain: true })
  out.push({ label: 'user', id: 'sm.user', x: 6, y: 8, w: 132, h: 30, go: () => launch.control({ applet: 'users' }), plain: true })
  out.push({ label: 'shut down', id: 'sm.shut', x: 196, y: 14, w: 98, h: 24, go: () => emit('session.shutdown'), round: '#d63d2e' })
  out.push({ label: 'log off', id: 'sm.logoff', x: 196, y: 44, w: 98, h: 24, go: () => emit('session.logoff'), round: '#e9a53a' })
  return out
}
// the registry is complete once the app modules have loaded (eager glob in os/apps.js)
let ROWS = null
const rows = () => ROWS || (ROWS = buildRows())

const Text = ({ x, y, size, bold, children, lh }) => (
  <div style={{ position: 'absolute', left: x, top: y, fontFamily: bold ? heavy : font, fontWeight: bold ? 400 : 600, fontSize: size, lineHeight: (lh || size + 4) + 'px', color: '#fff', textShadow: shadow, whiteSpace: 'nowrap' }}>{children}</div>
)

function RoundButton({ x, y, color, label }) {
  return (
    <>
      <svg width="20" height="20" viewBox="0 0 20 20" style={{ position: 'absolute', left: x, top: y + 2 }}>
        <defs>
          <radialGradient id={'dk-rb' + color.slice(1)} cx="0.45" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="0.35" stopColor={color} />
            <stop offset="1" stopColor={color} stopOpacity="0.85" />
          </radialGradient>
        </defs>
        <circle cx="10" cy="10" r="9" fill={`url(#dk-rb${color.slice(1)})`} stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" />
        <path d="M7 6.8 A4.4 4.4 0 1 0 13 6.8 M10 4.6 V9.8" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <Text x={x + 26} y={y + 3} size={11}>
        {label}
      </Text>
    </>
  )
}

const Panel = memo(function Panel({ user, list }) {
  return (
    <div style={{ position: 'absolute', left: START.x, top: START.y, width: START.w, height: START.h }}>
      {/* glass: a darker header, the left column, a lighter right column */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '7px 7px 0 0', background: 'linear-gradient(to bottom, rgba(60,112,205,0.82), rgba(52,104,200,0.72) 30%, rgba(44,96,192,0.7))', boxShadow: 'inset 0 1px 0 rgba(200,225,255,0.7), inset 1px 0 0 rgba(170,205,255,0.4), 3px 0 10px rgba(0,20,60,0.35)' }} />
      <div style={{ position: 'absolute', left: SPLIT, top: HEAD, width: START.w - SPLIT, height: START.h - HEAD, background: 'linear-gradient(to bottom, rgba(150,190,245,0.32), rgba(130,175,240,0.22))', boxShadow: 'inset 1px 0 0 rgba(190,220,255,0.45)' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: START.w, height: HEAD, borderRadius: '7px 7px 0 0', background: 'linear-gradient(to bottom, rgba(130,175,240,0.45), rgba(70,120,210,0.1) 70%, rgba(40,80,170,0.25))' }} />
      <div style={{ position: 'absolute', left: 6, top: HEAD - 1, width: START.w - 12, height: 1, background: 'rgba(200,225,255,0.55)' }} />
      {/* header */}
      {user && (
        <img src={user.picture} alt="" draggable={false} style={{ position: 'absolute', left: 8, top: 12, width: 56, height: 52, objectFit: 'cover', borderRadius: 2, boxShadow: '0 0 0 1.5px rgba(255,255,255,0.8), 2px 3px 6px rgba(0,20,60,0.5)' }} />
      )}
      <Text x={72} y={12} size={21} bold lh={26}>
        {user ? user.name : ''}
      </Text>
      <Text x={72} y={40} size={10.5}>
        switch user
      </Text>
      <RoundButton x={198} y={14} color="#d63d2e" label="shut down" />
      <RoundButton x={198} y={44} color="#e9a53a" label="log off" />
      {/* columns */}
      {rows()
        .filter((r) => !r.round && !r.plain)
        .map((r) =>
          r.big ? (
            <div key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h }}>
              <r.Icon x={4} y={5} size={30} />
              <Text x={42} y={4} size={11.5} bold>
                {r.label}
              </Text>
              <Text x={42} y={21} size={9}>
                {r.sub}
              </Text>
            </div>
          ) : (
            <div key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h }}>
              {r.Icon && <r.Icon x={6} y={3} size={18} />}
              <Text x={r.all ? 6 : 32} y={4} size={10.5} bold={r.bold}>
                {r.label}
              </Text>
              {r.all && (
                <svg width="10" height="12" viewBox="0 0 10 12" style={{ position: 'absolute', left: r.w - 14, top: 6 }}>
                  <path d="M1.5 1 L8.5 6 L1.5 11 Z" fill="#7cc4ff" stroke="#fff" strokeWidth="0.6" />
                </svg>
              )}
            </div>
          ),
        )}
      {list.length === 0 ? null : null}
    </div>
  )
})

function Live({ t }) {
  return rows().map((r) => {
    const lv = hover(t, r.id)
    if (lv <= 0) return null
    return (
      <div
        key={r.id}
        style={{
          position: 'absolute',
          left: START.x + r.x,
          top: START.y + r.y,
          width: r.w,
          height: r.h,
          opacity: lv,
          borderRadius: r.round ? 12 : 2,
          background: 'rgba(170,210,255,0.2)',
          boxShadow: r.round ? 'inset 0 0 0 1px rgba(255,255,255,0.7)' : 'inset 0 0 0 1px rgba(232,72,92,0.95)',
        }}
      />
    )
  })
}

const Hits = memo(function Hits({ items }) {
  return items.map((r) => (
    <div
      key={r.id}
      style={{ position: 'absolute', left: START.x + r.x, top: START.y + r.y, width: r.w, height: r.h, pointerEvents: 'auto' }}
      onPointerEnter={hoverOn(r.id)}
      onPointerLeave={hoverOff(r.id)}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.stopPropagation()
        emit('hover', { id: r.id, on: false })
        closePopups()
        r.go()
      }}
    />
  ))
})
const eater = (
  <div style={{ position: 'absolute', left: START.x, top: START.y, width: START.w, height: START.h, pointerEvents: 'auto' }} onPointerDown={(e) => e.stopPropagation()} />
)

export function StartMenu({ t, user }) {
  const items = rows()
  return (
    <Popup
      t={t}
      id="start"
      kind="rise"
      n={10}
      box={{ left: START.x, top: START.y - 4, width: START.w + 12, height: START.h + 4 }}
      live={<Live t={t} />}
      hits={
        <>
          {eater}
          <Hits items={items} />
        </>
      }
    >
      <Panel user={user} list={EMPTY} />
    </Popup>
  )
}
const EMPTY = []
