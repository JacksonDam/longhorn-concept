// The Plex Start menu, after the user's mock-up (ref3/insp1.png, docs/briefs/start-menu-mockup.md):
// a translucent blue glass panel rising out of the taskbar above the start button. Header:
// user picture, big name, "switch user", round red "shut down" and amber "log off" buttons.
// Left column: pinned programs with big icons (title + subtitle), a small-icon list and
// "All Programs & Services". Right column (lighter glass): places, then Search, Control Panel,
// Help & Support, Run..., Windows Tour, Top 10 Tasks. Hover = a light box (the mock-up's thin red
// outline was dropped). Only entries that open something the OS has. The panel is live glass like
// the sidebar and the taskbar: StartGlass blurs whatever is behind it.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { hasApp } from '../../os/apps.js'
import { Popup, popupPhase, popupTravel } from './Popup.jsx'
import { GLASS_BLUR } from './glassFit.js'
import { closePopups, hover, hoverOn, hoverOff } from './shellState.js'
import { launch, openApp } from './appInfo.jsx'
import {
  IEIcon, OutlookIcon, WordIcon, WinampIcon, DocumentsIcon, PicturesIcon, VideosIcon, SharedIcon, ComputerIcon,
  ControlIcon, HelpIcon, SearchIcon, RunIcon, TourIcon, DialogIcon, Xp, appXpIcon,
} from './appIcons.jsx'
import { XpIcon } from '../../os/xp.jsx'

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
  { label: 'my Music', Icon: Xp('mymusic'), go: () => launch.music() },
  ...OPTIONAL.filter((o) => hasApp(o.app)).map((o) => ({ label: o.label, Icon: appXpIcon(o.app) || DialogIcon, go: () => openApp(o.app, o.app) })),
].slice(0, 6)
const RIGHT = [
  { label: 'My Documents', Icon: DocumentsIcon, go: () => launch.documents() },
  { label: 'My Pictures', Icon: PicturesIcon, go: () => launch.pictures(), bold: true },
  { label: 'My Videos', Icon: VideosIcon, go: () => openApp('documents', 'documents', { go: ['my Computer', 'my Documents', 'my Videos'] }) },
  { label: 'My Computer', Icon: ComputerIcon, go: () => launch.computer() },
  { label: 'Shared Documents', Icon: SharedIcon, go: () => openApp('computer', 'computer', { go: ['my Computer', 'Shared Documents'] }) },
  { sep: true },
  { label: 'Search', Icon: SearchIcon, go: () => launch.search() },
  { label: 'Control Panel', Icon: ControlIcon, go: () => launch.control() },
  { label: 'Help & Support', Icon: HelpIcon, go: () => launch.help() },
  { label: 'Run...', Icon: RunIcon, go: () => launch.run() },
  { label: 'Windows Tour', Icon: TourIcon, go: tour },
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
    out.push({ ...it, id: 'sm.r' + i, x: SPLIT + 2, y, w: START.w - SPLIT - 6, h: 25, right: true })
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

// shut down / log off: XP's Start menu buttons (shell32 28 Turn Off Computer, 45 Log Off), 24 px design
function RoundButton({ x, y, icon, label }) {
  return (
    <>
      <XpIcon name={icon} x={x - 2} y={y} size={24} />
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
      <RoundButton x={198} y={14} icon="shutdown" label="shut down" />
      <RoundButton x={198} y={44} icon="logoff" label="log off" />
      {/* columns */}
      {rows()
        .filter((r) => !r.round && !r.plain)
        .map((r) =>
          r.big ? (
            <div key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h }}>
              <r.Icon x={3} y={4} size={32} />
              <Text x={42} y={4} size={11.5} bold>
                {r.label}
              </Text>
              <Text x={42} y={21} size={9}>
                {r.sub}
              </Text>
            </div>
          ) : (
            <div key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h }}>
              {r.Icon && (r.right ? <r.Icon x={4} y={0} size={24} /> : <r.Icon x={7} y={4} size={16} />)}
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
          boxShadow: r.round ? 'inset 0 0 0 1px rgba(255,255,255,0.7)' : 'inset 0 0 0 1px rgba(200,230,255,0.4)',
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

// The panel's live glass (the sidebar's and the taskbar's material, scenes/desktop/Sidebar.jsx
// Glass): one element under the panel that blurs the backdrop with the glass's radius; the
// panel's own translucent layers (in the Popup's blur copies) tint it. It follows the panel's
// rise at the shutter's middle pose with the panel's opacity, and stops at the taskbar's top as
// the panel's clip does. It carries its own position and opacity and is never inside the
// Popup's groups: an ancestor with opacity, a filter, a mask, a clip or isolation would become
// the backdrop root and the blur would see nothing (docs/ARCHITECTURE.md, Glass).
const BLUR = `blur(${GLASS_BLUR}px)`
const BOX = { left: START.x, top: START.y - 4, width: START.w + 12, height: START.h + 4 }
const CLIP_Y = 699 // the taskbar's top: the panel rises from behind it
function StartGlass({ t }) {
  const { st, df, visible, din, dout } = popupPhase(t, 'start', 'rise')
  const p = visible ? popupTravel(st.open, df, din, dout) : null
  const top = START.y + (p ? p.h * BOX.height : 0)
  const h = Math.max(0, Math.min(START.h, CLIP_Y - top))
  const op = p ? p.op : 0
  const on = op > 0 && h > 0
  return (
    <div
      style={{
        position: 'absolute', left: START.x, top: Math.min(top, CLIP_Y), width: START.w, height: h,
        borderRadius: '7px 7px 0 0', backdropFilter: BLUR, WebkitBackdropFilter: BLUR,
        opacity: op, visibility: on ? 'visible' : 'hidden', pointerEvents: 'none',
      }}
    />
  )
}

export function StartMenu({ t, user }) {
  const items = rows()
  return (
    <>
      <StartGlass t={t} />
      <Popup
        t={t}
        id="start"
        kind="rise"
        n={10}
        box={BOX}
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
    </>
  )
}
const EMPTY = []
