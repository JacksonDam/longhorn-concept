// The Plex Start menu: rises out of the taskbar above the start button. User picture and
// name on a blue glass header, programs on the left, places on a pale blue pane on the
// right, Log Off / Shut Down on the blue footer (the my Music flyout's colours).
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { Popup } from './Popup.jsx'
import { closePopups, hover, hoverOn, hoverOff } from './shellState.js'
import { launch } from './appInfo.jsx'
import {
  IEIcon, OutlookIcon, WordIcon, WinampIcon, DocumentsIcon, PicturesIcon, MusicIcon, ComputerIcon,
  ControlIcon, HelpIcon, SearchIcon, RunIcon, LogOffIcon, ShutDownIcon,
} from './appIcons.jsx'

export const START = { x: 0, y: 369, w: 300, h: 330 }
const HEAD = 50
const FOOT = 36
const SPLIT = 160
const font = "'Libre Franklin', Tahoma, sans-serif"

const LEFT = [
  { label: 'Internet', sub: 'Internet Explorer', Icon: IEIcon, go: () => launch.internet() },
  { label: 'E-mail', sub: 'Microsoft Outlook', Icon: OutlookIcon, go: () => launch.email() },
  { label: 'Word', sub: 'Microsoft Word', Icon: WordIcon, go: () => launch.word() },
  { label: 'Winamp3', sub: 'Media player', Icon: WinampIcon, go: () => launch.winamp() },
]
const RIGHT = [
  { label: 'my Documents', Icon: DocumentsIcon, go: () => launch.documents() },
  { label: 'my Pictures', Icon: PicturesIcon, go: () => launch.pictures() },
  { label: 'my Music', Icon: MusicIcon, go: () => launch.music() },
  { label: 'my Computer', Icon: ComputerIcon, go: () => launch.computer() },
  { sep: true },
  { label: 'Control Panel', Icon: ControlIcon, go: () => launch.control() },
  { label: 'Help and Support', Icon: HelpIcon, go: () => launch.help() },
  { label: 'Search', Icon: SearchIcon, go: () => launch.search() },
  { label: 'Run...', Icon: RunIcon, go: () => launch.run() },
]
const FOOTER = [
  { label: 'Log Off', Icon: LogOffIcon, go: () => emit('session.logoff'), x: 112, w: 78 },
  { label: 'Shut Down', Icon: ShutDownIcon, go: () => emit('session.shutdown'), x: 196, w: 98 },
]
const LROW = 40
const RROW = 25
const SEP = 9
const leftRows = LEFT.map((it, i) => ({ ...it, x: 0, y: HEAD + 8 + i * LROW, w: SPLIT, h: LROW, id: 'sm.l' + i }))
const rightRows = (() => {
  let y = HEAD + 8
  return RIGHT.map((it, i) => {
    const r = { ...it, x: SPLIT, y, w: START.w - SPLIT, h: it.sep ? SEP : RROW, id: 'sm.r' + i }
    y += r.h
    return r
  })
})()
const footRows = FOOTER.map((it, i) => ({ ...it, y: START.h - FOOT + 5, h: FOOT - 10, id: 'sm.f' + i }))
const ALL = [...leftRows, ...rightRows.filter((r) => !r.sep), ...footRows]

const Panel = memo(function Panel({ user }) {
  const X = START.x
  const Y = START.y
  return (
    <div style={{ position: 'absolute', left: X, top: Y, width: START.w, height: START.h, borderRadius: '6px 6px 0 0', overflow: 'hidden', boxShadow: '3px 0 10px rgba(0,20,60,0.35)' }}>
      {/* header */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: START.w, height: HEAD, background: 'linear-gradient(to bottom, rgb(118,160,232) 0px, rgb(92,148,229) 3px, rgb(78,136,226) 24px, rgb(66,122,218) 46px, rgb(100,160,246) 47px, rgb(76,125,208) 49px, rgb(114,142,195) 50px)' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: 140, height: HEAD - 4, background: 'radial-gradient(ellipse at 20% 40%, rgba(170,205,255,0.5), rgba(170,205,255,0) 70%)' }} />
      {user && (
        <>
          <img src={user.picture} alt="" draggable={false} style={{ position: 'absolute', left: 8, top: 7, width: 34, height: 34, borderRadius: 3, boxShadow: '0 0 0 2px rgba(255,255,255,0.85), 1px 2px 4px rgba(0,20,60,0.5)', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', left: 52, top: 14, fontFamily: font, fontWeight: 700, fontSize: 15, lineHeight: '20px', color: '#fff', textShadow: '0 1px 2px rgba(0,30,90,0.6)' }}>{user.name}</div>
        </>
      )}
      {/* body */}
      <div style={{ position: 'absolute', left: 0, top: HEAD, width: SPLIT, height: START.h - HEAD - FOOT, background: 'linear-gradient(to bottom, rgb(250,253,255), rgb(238,246,255) 70%, rgb(224,236,250))' }} />
      <div style={{ position: 'absolute', left: SPLIT, top: HEAD, width: START.w - SPLIT, height: START.h - HEAD - FOOT, background: 'linear-gradient(to bottom, rgb(222,234,252), rgb(203,221,248))', boxShadow: 'inset 1px 0 0 rgba(120,160,220,0.6)' }} />
      {leftRows.map((r) => (
        <div key={r.id} style={{ position: 'absolute', left: r.x, top: r.y - Y + Y, width: r.w, height: r.h }}>
          <r.Icon x={10} y={8} size={24} />
          <div style={{ position: 'absolute', left: 42, top: 6, fontFamily: font, fontWeight: 700, fontSize: 10.6, lineHeight: '14px', color: 'rgb(48,58,92)', whiteSpace: 'nowrap' }}>{r.label}</div>
          <div style={{ position: 'absolute', left: 42, top: 20, fontFamily: font, fontWeight: 500, fontSize: 9, lineHeight: '12px', color: 'rgb(120,128,150)', whiteSpace: 'nowrap' }}>{r.sub}</div>
        </div>
      ))}
      {rightRows.map((r) =>
        r.sep ? (
          <div key={r.id} style={{ position: 'absolute', left: r.x + 10, top: r.y + 4, width: r.w - 20, height: 1, background: 'rgba(110,145,205,0.5)' }} />
        ) : (
          <div key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h }}>
            <r.Icon x={9} y={4.5} />
            <div style={{ position: 'absolute', left: 32, top: 0, fontFamily: font, fontWeight: 600, fontSize: 10, lineHeight: r.h + 'px', color: 'rgb(30,52,110)', whiteSpace: 'nowrap' }}>{r.label}</div>
          </div>
        ),
      )}
      {/* footer */}
      <div style={{ position: 'absolute', left: 0, top: START.h - FOOT, width: START.w, height: FOOT, background: 'linear-gradient(to bottom, rgb(114,142,195) 0px, rgb(78,128,220) 1px, rgb(61,112,203) 2px, rgb(52,119,222) 4px, rgb(62,118,220) 20px, rgb(56,114,199) 30px, rgb(82,139,226) 31px, rgb(97,155,242) 33px, rgb(89,144,216) 36px)' }} />
      {footRows.map((r) => (
        <div key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h }}>
          <r.Icon x={4} y={5} />
          <div style={{ position: 'absolute', left: 25, top: 0, fontFamily: font, fontWeight: 600, fontSize: 10, lineHeight: r.h + 'px', color: '#fff', whiteSpace: 'nowrap' }}>{r.label}</div>
        </div>
      ))}
    </div>
  )
})

function Live({ t }) {
  return ALL.map((r) => {
    const lv = hover(t, r.id)
    if (lv <= 0) return null
    const foot = r.id.startsWith('sm.f')
    return (
      <div
        key={r.id}
        style={{
          position: 'absolute',
          left: START.x + r.x + 3,
          top: START.y + r.y + 1,
          width: r.w - 6,
          height: r.h - 2,
          opacity: lv,
          borderRadius: 3,
          background: foot ? 'rgba(170,215,255,0.35)' : 'linear-gradient(to bottom, rgba(196,226,255,0.95), rgba(160,206,255,0.95))',
          boxShadow: 'inset 0 0 0 1px rgba(90,150,230,0.5)',
          mixBlendMode: foot ? 'screen' : 'multiply',
        }}
      />
    )
  })
}

const Hits = memo(function Hits() {
  return ALL.map((r) => (
    <div
      key={r.id}
      style={{ position: 'absolute', left: START.x + r.x, top: START.y + r.y, width: r.w, height: r.h, pointerEvents: 'auto' }}
      onPointerEnter={hoverOn(r.id)}
      onPointerLeave={hoverOff(r.id)}
      onPointerDown={(e) => {
        e.stopPropagation()
        closePopups()
        r.go()
      }}
    />
  ))
})
const HITS = <Hits />

export function StartMenu({ t, user }) {
  return (
    <Popup t={t} id="start" kind="rise" n={10} box={{ left: START.x, top: START.y - 4, width: START.w + 12, height: START.h + 4 }} live={<Live t={t} />} hits={HITS}>
      <Panel user={user} />
    </Popup>
  )
}
