// Control Panel: an explorer window of applets. Display opens the shell's Display Properties
// (win 'display'); the others open an applet window (app 'applet', props.applet). The shell may
// open it on an applet: win.open { id: 'control', app: 'control', props: { applet } }.
import { memo, useEffect } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, valueOf, hoverKeys, pt, find, selectionOf, C, FONT, HEAVY } from '../../ui/index.js'
import { Ico } from '../lib/icons.jsx'
import { openWin, openUrl } from '../lib/common.js'
import { getWindow } from '../../os/wm.js'

export const APPLETS = [
  { key: 'display', label: 'Display', desc: 'Change the desktop background and the look of your screen', icon: 'display' },
  { key: 'datetime', label: 'Date and Time', desc: 'Set the date, time and time zone', icon: 'clock' },
  { key: 'sound', label: 'Sounds and Audio Devices', desc: 'Change the speaker volume', icon: 'sound' },
  { key: 'mouse', label: 'Mouse', desc: 'Customize your mouse buttons and double-click speed', icon: 'mouse' },
  { key: 'users', label: 'User Accounts', desc: 'See the people who use this computer', icon: 'users' },
  { key: 'network', label: 'Network Connections', desc: 'See your network and Internet connections', icon: 'network' },
  { key: 'programs', label: 'Add or Remove Programs', desc: 'See the programs installed on this computer', icon: 'programs' },
  { key: 'printers', label: 'Printers and Faxes', desc: 'Add a printer or see the ones installed', icon: 'printer' },
]
export function openApplet(key) {
  if (key === 'display') openWin('display', 'display')
  else openWin('cpl:' + key, 'applet', { applet: key })
}

const Tile = memo(function Tile({ a, lit, sel }) {
  return (
    <div style={{ position: 'relative', width: 250, height: 58 }}>
      {(lit > 0 || sel) && <div style={{ position: 'absolute', inset: 0, borderRadius: 5, opacity: sel ? 1 : lit, background: sel ? C.rowSel : C.rowHover, boxShadow: sel ? `inset 0 0 0 1px ${C.rowSelEdge}` : 'none' }} />}
      <div style={{ position: 'absolute', left: 6, top: 7 }}>
        <Ico kind={a.icon} size={42} />
      </div>
      <div style={{ position: 'absolute', left: 58, top: 9, fontFamily: HEAVY, fontSize: 12, color: '#2c6cc4', whiteSpace: 'nowrap' }}>{a.label}</div>
      <div style={{ position: 'absolute', left: 58, top: 26, width: 186, fontFamily: FONT, fontSize: 10, lineHeight: '13px', color: '#8b91a6' }}>{a.desc}</div>
    </div>
  )
})

const Icon = memo(function Icon({ a, lit, sel }) {
  return (
    <div style={{ position: 'relative', width: 80, height: 76 }}>
      {(lit > 0 || sel) && <div style={{ position: 'absolute', inset: 0, borderRadius: 5, opacity: sel ? 1 : lit, background: sel ? C.rowSel : C.rowHover }} />}
      <div style={{ position: 'absolute', left: 21, top: 6 }}>
        <Ico kind={a.icon} size={38} />
      </div>
      <div style={{ position: 'absolute', left: 2, right: 2, top: 48, textAlign: 'center', fontFamily: FONT, fontSize: 10.5, lineHeight: '13px', color: '#3a4260' }}>{a.label}</div>
    </div>
  )
})

const Pane = memo(function Pane({ classic, onClassic, fold, onFold }) {
  const link = (k, label, icon, fn, y) => (
    <div key={k} style={{ position: 'absolute', left: 14, top: y, display: 'flex', gap: 6, alignItems: 'center', fontFamily: FONT, fontSize: 11, color: C.textDark, whiteSpace: 'nowrap' }} onPointerDown={(e) => e.button === 0 && fn()}>
      <Ico kind={icon} size={16} />
      {label}
    </div>
  )
  const head = (k, a, b, y) => (
    <div key={k} style={{ position: 'absolute', left: 14, top: y, width: 170, fontFamily: FONT, fontSize: 17.5, fontWeight: 300, color: C.headingLight }} onPointerDown={(e) => e.button === 0 && onFold(k)}>
      {a} <span style={{ fontWeight: 500, color: C.heading }}>{b}</span>
      <svg width="9" height="6" style={{ position: 'absolute', right: 4, top: 9 }}>
        <path d={fold[k] ? 'M0 0 L9 0 L4.5 6 Z' : 'M0 6 L9 6 L4.5 0 Z'} fill="#8ebbe9" />
      </svg>
    </div>
  )
  let y = 18
  const out = [head('cp', 'control', 'panel', y)]
  y += 28
  if (!fold.cp) {
    out.push(link('classic', classic ? 'Switch to Category View' : 'Switch to Classic View', 'programs', onClassic, y))
    y += 24
    out.push(<div key="d" style={{ position: 'absolute', left: 14, top: y, width: 160, fontFamily: FONT, fontSize: 10.5, lineHeight: '15px', color: C.textDark }} onPointerDown={(e) => e.button === 0 && onClassic()}>Pick a task below to change how your computer looks and works.</div>)
    y += 40
  }
  y += 14
  out.push(head('sa', 'see', 'also', y))
  y += 28
  if (!fold.sa) {
    out.push(link('wu', 'Windows Update', 'ie', () => openUrl('windowsupdate.microsoft.com'), y))
    out.push(link('help', 'Help and Support', 'help', () => openWin('help', 'help', { topic: 'background' }), y + 20))
    out.push(link('pc', 'my Computer', 'computer', () => openWin('computer', 'computer'), y + 40))
  }
  return out
})

function Control({ win, t, h, live }) {
  const id = wid(win, 'tiles')
  const lit = hoverKeys(t, id + ':h')
  const sel = selectionOf(t, id)[0]
  useAppletProp(win, t, live)
  const classic = valueOf(t, wid(win, 'classic'), false)
  const fold = { cp: valueOf(t, wid(win, 'fold:cp'), false), sa: valueOf(t, wid(win, 'fold:sa'), false) }
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <Pane classic={classic} onClassic={() => emit('ui.value', { id: wid(win, 'classic'), value: !classic })} fold={fold} onFold={(k) => emit('ui.value', { id: wid(win, 'fold:' + k), value: !fold[k] })} />
      <div style={{ position: 'absolute', left: 200, top: 18, fontFamily: FONT, fontSize: 17.5, fontWeight: 300, color: C.headingLight }} onPointerDown={(e) => e.button === 0 && emit('ui.value', { id: wid(win, 'classic'), value: !classic })}>
        {classic ? 'all' : 'pick a'} <span style={{ fontWeight: 500, color: C.heading }}>{classic ? 'applets' : 'category'}</span>
      </div>
      {APPLETS.map((a, i) => (
        <div
          key={a.key}
          style={classic ? { position: 'absolute', left: 200 + (i % 6) * 86, top: 52 + Math.floor(i / 6) * 84, width: 80, height: 76 } : { position: 'absolute', left: 196 + (i % 2) * 262, top: 50 + Math.floor(i / 2) * 66 }}
          onPointerEnter={(e) => emit('hover', { id: id + ':h', key: a.key, on: true, ...pt(e) })}
          onPointerLeave={() => emit('hover', { id: id + ':h', key: a.key, on: false })}
          onPointerDown={(e) => e.button === 0 && emit('ui.value', { id: id + ':sel', value: { keys: [a.key], anchor: a.key } })}
          onClick={() => openApplet(a.key)}
        >
          {classic ? <Icon a={a} lit={lit.get(a.key) || 0} sel={sel === a.key} /> : <Tile a={a} lit={lit.get(a.key) || 0} sel={sel === a.key} />}
        </div>
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: h - 20, height: 20, lineHeight: '20px', textAlign: 'center', fontFamily: FONT, fontWeight: 500, fontSize: 11, color: '#7f8db0' }}>{APPLETS.length} objects</div>
    </div>
  )
}

function controlMenus(win, t) {
  const sel = selectionOf(t, wid(win, 'tiles'))[0]
  return {
    File: [{ label: 'Open', disabled: !sel, onClick: () => sel && openApplet(sel) }, '-', { label: 'Close', onClick: () => emit('win.close', { id: win.id }) }],
    Edit: [{ label: 'Select All', disabled: true }],
    View: [{ label: 'Tiles', radio: true }],
    Help: [{ label: 'Help and Support Center', onClick: () => openWin('help', 'help') }, '-', { label: 'About Windows', onClick: () => openWin('about', 'about') }],
    Favorites: [{ label: 'MSN.com', onClick: () => openUrl('www.msn.com') }],
  }
}

// win.open { props: { applet } } (shell calendar, Run box): open that applet once
function useAppletProp(win, t, live) {
  const [a, i] = find(t, 'win.open', win.id)
  const e = i >= 0 && a[i].t >= win.openedAt && a[i].props?.applet ? a[i] : null
  const key = e ? e.t : null
  useEffect(() => {
    if (!live || !e || now() - e.t > 0.5) return
    const target = e.props.applet === 'display' ? 'display' : 'cpl:' + e.props.applet
    const w = getWindow(now(), target)
    if (!w || w.state === 'closed' || w.openedAt < e.t) openApplet(e.props.applet)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, live])
  // the chrome's Up a Folder: my Computer
  const [ca, ci] = find(t, 'explorer.command', win.id)
  const up = ci >= 0 && ca[ci].t >= win.openedAt && ca[ci].command === 'up' ? ca[ci] : null
  useEffect(() => {
    if (live && up && now() - up.t < 0.5) openWin('computer', 'computer')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [up?.t, live])
}

export default {
  id: 'control',
  title: () => 'Control Panel',
  taskbarLabel: () => 'Control Panel',
  icon: null,
  size: { w: 730, h: 470 },
  position: { x: 90, y: 70 },
  minSize: { w: 720, h: 420 },
  explorer: { crumbs: ['my Computer', 'Control Panel'], search: 'search for…', commands: [{ id: 'up', label: 'Up a Folder', icon: 'up' }], pressed: () => null, menus: (win, t) => controlMenus(win, t) },
  Content: scoped(Control, {}),
}
