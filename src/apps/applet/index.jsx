// Control Panel applets (props.applet): Date and Time, Sounds and Audio Devices, Mouse, User
// Accounts, Network Connections, Add or Remove Programs, Printers and Faxes. Settings are logged
// ('ui.value' scoped to the window; OK / Apply also log 'cpl.apply' { applet, ... }).
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { CAPTURE } from '../../core/clock.js'
import { scoped, wid, valueOf, Tabs, TabPanel, Button, Checkbox, Slider, ListView, selectionOf, C, FONT, HEAVY } from '../../ui/index.js'
import { USERS, userPicture, currentUser } from '../../os/session.js'
import { Ico } from '../lib/icons.jsx'
import { closeWin, messageBox } from '../lib/common.js'
import { VOLUME, MUTE, DEFAULT_VOLUME } from '../../os/sounds.js'
import { LAND, MAP_W, MAP_H } from './worldMap.js'

const DEMO = CAPTURE || new URLSearchParams(location.search).has('demo')
const TITLES = {
  datetime: 'Date and Time Properties',
  sound: 'Sounds and Audio Devices Properties',
  mouse: 'Mouse Properties',
  users: 'User Accounts',
  network: 'Network Connections',
  programs: 'Add or Remove Programs',
  printers: 'Printers and Faxes',
}
const txt = { fontFamily: FONT, fontSize: 11, color: C.text, lineHeight: '16px' }

// the clock: the video's 11:31 am in the demo and captures, the real time otherwise (the wall
// clock, as the taskbar's: the app clock falls behind it by stalls and time in the background)
function clockAt(t, win) {
  if (DEMO) {
    const s = 11 * 3600 + 31 * 60 + Math.max(0, t - win.openedAt)
    return { h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: Math.floor(s) % 60 }
  }
  const d = new Date()
  return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() }
}

const Clock = memo(function Clock({ h, m, s }) {
  const hand = (deg, len, wdt, c) => <line x1="50" y1="50" x2={50 + len * Math.sin((deg * Math.PI) / 180)} y2={50 - len * Math.cos((deg * Math.PI) / 180)} stroke={c} strokeWidth={wdt} strokeLinecap="round" />
  return (
    <svg width="120" height="120" viewBox="0 0 100 100">
      <defs>
        <radialGradient id="cpl-face" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9e6f7" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#cpl-face)" stroke="#7d9fd3" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180
        return <circle key={i} cx={50 + 39 * Math.sin(a)} cy={50 - 39 * Math.cos(a)} r={i % 3 ? 1.3 : 2.4} fill="#2c6cc4" />
      })}
      {hand((h % 12) * 30 + m * 0.5, 22, 3.5, '#1d3557')}
      {hand(m * 6, 32, 2.5, '#1d3557')}
      {hand(s * 6, 36, 1, '#d0442c')}
      <circle cx="50" cy="50" r="2.5" fill="#1d3557" />
    </svg>
  )
})

// The Time Zone tab's world map, after XP's: a shaded flat world (Natural Earth land, Miller
// projection, ./worldMap.js) centred on the selected zone, whose 15-degree band is lit with its
// land picked out. One static SVG (gradients, no filters).
const ZONE = { offset: -8 } // (GMT-08:00) Pacific Time
const SIZE = { w: 420, h: 330 }
const SIZE_DT = { w: 420, h: 360 }
// The Time Zone tab inside its panel (pw x ph): the zone field (14-34), the map 10 px under it
// across the panel's width at the projection's aspect (smaller and centred if the panel is too
// short), the daylight saving checkbox (16 px) 12 px under the map, and at least 16 px of panel
// under the checkbox.
const TZ_MAP_Y = 44
function tzLayout(pw, ph) {
  const maxW = pw - 28
  const maxH = ph - TZ_MAP_Y - 12 - 16 - 16
  let mw = maxW
  let mh = Math.round((mw * MAP_H) / MAP_W)
  if (mh > maxH) {
    mh = maxH
    mw = Math.round((mh * MAP_W) / MAP_H)
  }
  return { x: Math.round((maxW - mw) / 2), w: mw, h: mh, check: TZ_MAP_Y + mh + 12 }
}
const WorldMap = memo(function WorldMap({ w, h, offset }) {
  const cx = 180 + offset * 15 // the zone's centre meridian, map x
  const vx = cx - MAP_W / 2
  const band = { x: cx - 7.5, w: 15 }
  // the land drawn where the view needs it (the map wraps around)
  const copies = [-MAP_W, 0, MAP_W].filter((dx) => dx + MAP_W > vx && dx < vx + MAP_W)
  const land = (fill, extra) => copies.map((dx) => <use key={dx} href="#cpl-tz-land" x={dx} fill={fill} {...extra} />)
  return (
    <svg width={w} height={h} viewBox={`${vx} 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="none" style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <path id="cpl-tz-land" d={LAND} fillRule="evenodd" />
        <linearGradient id="cpl-tz-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5d9be6" />
          <stop offset="0.5" stopColor="#3f7fd6" />
          <stop offset="1" stopColor="#2a62b8" />
        </linearGradient>
        <linearGradient id="cpl-tz-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9d97a" />
          <stop offset="0.45" stopColor="#7fbf55" />
          <stop offset="1" stopColor="#5a9a3a" />
        </linearGradient>
        <linearGradient id="cpl-tz-lit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4ffc4" />
          <stop offset="1" stopColor="#cfe98a" />
        </linearGradient>
        <linearGradient id="cpl-tz-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id="cpl-tz-band">
          <rect x={band.x} y="0" width={band.w} height={MAP_H} />
        </clipPath>
      </defs>
      <rect x={vx} y="0" width={MAP_W} height={MAP_H} fill="url(#cpl-tz-sea)" />
      {/* shallow water around the coasts, the ground with a darker coastline */}
      {land('none', { stroke: 'rgba(170,215,255,0.45)', strokeWidth: 3.2, strokeLinejoin: 'round' })}
      {land('url(#cpl-tz-ground)', { stroke: '#3d7a2c', strokeWidth: 0.7, strokeLinejoin: 'round' })}
      {/* the selected zone */}
      <rect x={band.x} y="0" width={band.w} height={MAP_H} fill="rgba(255,255,255,0.2)" />
      <g clipPath="url(#cpl-tz-band)">{land('url(#cpl-tz-lit)', { stroke: '#8fb84a', strokeWidth: 0.7, strokeLinejoin: 'round' })}</g>
      <path d={`M${band.x} 0 V${MAP_H} M${band.x + band.w} 0 V${MAP_H}`} stroke="rgba(255,255,255,0.65)" strokeWidth="0.5" fill="none" />
      <rect x={vx} y="0" width={MAP_W} height={MAP_H} fill="url(#cpl-tz-sheen)" />
    </svg>
  )
})

function DateTime({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const tab = valueOf(t, id('tab'), 'dt')
  const c = clockAt(t, win)
  const day = valueOf(t, id('day'), 5)
  const dst = valueOf(t, id('dst'), true)
  const tz = tzLayout(w - 20, h - 74)
  return (
    <>
      <Tabs id={id('tab')} tabs={[{ key: 'dt', label: 'Date & Time' }, { key: 'tz', label: 'Time Zone' }]} x={10} y={8} w={w - 20} def="dt" />
      <TabPanel x={10} y={29} w={w - 20} h={h - 74}>
        {tab === 'dt' ? (
          <>
            <div style={{ position: 'absolute', left: 14, top: 12, ...txt, fontFamily: HEAVY, color: '#3b7cc6' }}>Date</div>
            <div style={{ position: 'absolute', left: 14, top: 32, ...txt }}>November 2003</div>
            <div style={{ position: 'absolute', left: 14, top: 54, width: 196, display: 'flex', flexWrap: 'wrap' }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={'h' + i} style={{ width: 28, textAlign: 'center', fontFamily: HEAVY, fontSize: 10, color: '#5b7299' }}>
                  {d}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, i) => {
                const d = i - 5
                const ok = d >= 1 && d <= 30
                return (
                  <div
                    key={i}
                    onPointerDown={() => ok && emit('ui.value', { id: id('day'), value: d })}
                    style={{ width: 28, height: 22, lineHeight: '22px', textAlign: 'center', borderRadius: 3, fontFamily: FONT, fontSize: 10.5, color: d === day ? '#fff' : C.text, background: d === day ? '#3d7bd9' : 'transparent' }}
                  >
                    {ok ? d : ''}
                  </div>
                )
              })}
            </div>
            <div style={{ position: 'absolute', left: 234, top: 12, ...txt, fontFamily: HEAVY, color: '#3b7cc6' }}>Time</div>
            <div style={{ position: 'absolute', left: 240, top: 40 }}>
              <Clock h={c.h} m={c.m} s={c.s} />
            </div>
            <div style={{ position: 'absolute', left: 248, top: 172, width: 104, textAlign: 'center', ...txt, fontFamily: HEAVY }}>
              {((c.h + 11) % 12) + 1}:{String(c.m).padStart(2, '0')}:{String(c.s).padStart(2, '0')} {c.h < 12 ? 'AM' : 'PM'}
            </div>
            <div style={{ position: 'absolute', left: 14, top: 200, right: 14, ...txt, color: '#8b91a6' }}>Current time zone: Pacific Standard Time</div>
          </>
        ) : (
          <>
            <div style={{ position: 'absolute', left: 14, top: 14, right: 14, height: 20, borderRadius: 3, background: '#fff', boxShadow: `inset 0 0 0 1px ${C.border}`, ...txt, lineHeight: '20px', paddingLeft: 6 }}>(GMT-08:00) Pacific Time (US &amp; Canada); Tijuana</div>
            <div style={{ position: 'absolute', left: 14 + tz.x, top: TZ_MAP_Y, width: tz.w, height: tz.h, borderRadius: 3, overflow: 'hidden', boxShadow: `0 0 0 1px ${C.border}` }}>
              <WorldMap w={tz.w} h={tz.h} offset={ZONE.offset} />
            </div>
            <Checkbox id={id('dst')} label="Automatically adjust clock for daylight saving changes" x={14} y={tz.check} def checked={dst} onChange={(v) => emit('ui.value', { id: id('dst'), value: v })} />
          </>
        )}
      </TabPanel>
    </>
  )
}

// the device volume and Mute are the system's (os/sounds.js plays through them), so they hold
// from one opening of the applet to the next
function Sound({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const vol = valueOf(t, VOLUME, DEFAULT_VOLUME)
  const mute = valueOf(t, MUTE, false)
  return (
    <>
      <Tabs id={id('tab')} tabs={[{ key: 'vol', label: 'Volume' }]} x={10} y={8} w={w - 20} />
      <TabPanel x={10} y={29} w={w - 20} h={h - 74}>
        <div style={{ position: 'absolute', left: 14, top: 14 }}>
          <Ico kind="sound" size={40} />
        </div>
        <div style={{ position: 'absolute', left: 64, top: 22, ...txt }}>Speakers (built-in audio)</div>
        <div style={{ position: 'absolute', left: 14, top: 72, ...txt, fontFamily: HEAVY, color: '#3b7cc6' }}>Device volume</div>
        <div style={{ position: 'absolute', left: 14, top: 98, ...txt, color: '#8b91a6' }}>Low</div>
        <Slider id={VOLUME} x={44} y={100} w={w - 120} def={DEFAULT_VOLUME} disabled={mute} />
        <div style={{ position: 'absolute', left: w - 68, top: 98, ...txt, color: '#8b91a6' }}>High</div>
        <Checkbox id={MUTE} label="Mute" x={44} y={130} />
        <Checkbox id={id('tray')} label="Place volume icon in the taskbar" x={44} y={152} def />
        <div style={{ position: 'absolute', left: 14, top: 190, right: 14, ...txt, color: '#8b91a6' }}>Volume: {mute ? 'muted' : `${Math.round(vol * 100)}%`}</div>
      </TabPanel>
    </>
  )
}

function Mouse({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const open = valueOf(t, id('folder'), false)
  return (
    <>
      <Tabs id={id('tab')} tabs={[{ key: 'b', label: 'Buttons' }]} x={10} y={8} w={w - 20} />
      <TabPanel x={10} y={29} w={w - 20} h={h - 74}>
        <div style={{ position: 'absolute', left: 14, top: 12, ...txt, fontFamily: HEAVY, color: '#3b7cc6' }}>Button configuration</div>
        <Checkbox id={id('swap')} label="Switch primary and secondary buttons" x={14} y={36} />
        <div style={{ position: 'absolute', left: 14, top: 80, ...txt, fontFamily: HEAVY, color: '#3b7cc6' }}>Double-click speed</div>
        <div style={{ position: 'absolute', left: 14, top: 102, right: 90, ...txt, color: '#8b91a6' }}>Double-click the folder to test your setting.</div>
        <div style={{ position: 'absolute', left: 14, top: 136, ...txt, color: '#8b91a6' }}>Slow</div>
        <Slider id={id('speed')} x={48} y={138} w={180} def={0.5} />
        <div style={{ position: 'absolute', left: 236, top: 136, ...txt, color: '#8b91a6' }}>Fast</div>
        <div style={{ position: 'absolute', right: 20, top: 100 }} onDoubleClick={() => emit('ui.value', { id: id('folder'), value: !open })}>
          <Ico kind={open ? 'folder-open' : 'folder'} size={44} />
        </div>
      </TabPanel>
    </>
  )
}

function Users({ win, t, w, h }) {
  const me = currentUser(t)
  const sel = selectionOf(t, wid(win, 'list'))[0] || me?.id
  const u = USERS.find((x) => x.id === sel) || USERS[0]
  return (
    <>
      <div style={{ position: 'absolute', left: 14, top: 10, fontFamily: FONT, fontSize: 17.5, fontWeight: 300, color: C.headingLight }}>
        pick an <span style={{ fontWeight: 500, color: C.heading }}>account</span>
      </div>
      <ListView
        id={wid(win, 'list')}
        x={14}
        y={40}
        w={180}
        h={h - 90}
        rowH={36}
        multi={false}
        items={USERS.map((x) => ({ key: x.id, cells: [x.name], icon: <img src={userPicture(x.id)} alt="" style={{ width: 16, height: 16 }} />, bold: x.id === me?.id }))}
      />
      <div style={{ position: 'absolute', left: 210, top: 40, width: 72, height: 72, borderRadius: 6, overflow: 'hidden', boxShadow: '0 0 0 2px #fff, 0 0 0 3px #8fa9cf, 0 3px 6px rgba(30,60,120,0.3)' }}>
        <img src={userPicture(u.id)} alt="" draggable={false} style={{ width: 72, height: 72, objectFit: 'cover' }} />
      </div>
      <div style={{ position: 'absolute', left: 210, top: 122, fontFamily: HEAVY, fontSize: 14, color: '#2c6cc4' }}>{u.name}</div>
      <div style={{ position: 'absolute', left: 210, top: 142, ...txt, color: '#8b91a6' }}>{u.id === me?.id ? 'Computer administrator, logged on' : 'Computer administrator'}</div>
      <div style={{ position: 'absolute', left: 210, top: 160, ...txt, color: '#8b91a6' }}>Password protected</div>
    </>
  )
}

function Network({ win }) {
  const row = (y, name, state, icon) => (
    <div style={{ position: 'absolute', left: 14, top: y, display: 'flex', gap: 10, alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <Ico kind={icon} size={40} />
        <svg width="14" height="14" style={{ position: 'absolute', right: -3, bottom: -2 }}>
          <circle cx="7" cy="7" r="6.5" fill="#d0442c" />
          <path d="M4 4 L10 10 M10 4 L4 10" stroke="#fff" strokeWidth="1.8" />
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: HEAVY, fontSize: 12, color: '#2c6cc4' }}>{name}</div>
        <div style={{ ...txt, color: '#8b91a6' }}>{state}</div>
      </div>
    </div>
  )
  return (
    <>
      <div style={{ position: 'absolute', left: 14, top: 10, fontFamily: FONT, fontSize: 17.5, fontWeight: 300, color: C.headingLight }}>
        network <span style={{ fontWeight: 500, color: C.heading }}>connections</span>
      </div>
      {row(46, 'Local Area Connection', 'Network cable unplugged', 'network')}
      {row(100, 'Wireless Network Connection', 'Not connected', 'network')}
      <Button id={wid(win, 'repair')} label="Repair" x={14} y={164} w={90} h={23} onClick={() => messageBox({ title: 'Repair Local Area Connection', icon: 'warning', text: 'Windows could not finish repairing the problem because the network cable is unplugged.' })} />
      <Button id={wid(win, 'wiz')} label="Internet Options..." x={112} y={164} w={120} h={23} onClick={() => messageBox({ title: 'Internet Options', icon: 'info', text: 'Connection: Local Area Network (LAN)\nAutomatically detect settings: on\n\nThe network cable is unplugged.' })} />
    </>
  )
}

const PROGRAMS = [
  ['Internet Explorer 6', '11.2 MB', 'frequently'],
  ['Microsoft Office Professional Edition 2003', '312 MB', 'frequently'],
  ['MSN Messenger 6.0', '8.42 MB', 'occasionally'],
  ['Winamp3', '6.10 MB', 'frequently'],
  ['Windows Media Player 9 Series', '14.6 MB', 'rarely'],
]
function Programs({ win, t, w, h }) {
  const sel = selectionOf(t, wid(win, 'list'))[0]
  const p = PROGRAMS.find((x) => x[0] === sel)
  return (
    <>
      <div style={{ position: 'absolute', left: 14, top: 10, fontFamily: FONT, fontSize: 17.5, fontWeight: 300, color: C.headingLight }}>
        currently installed <span style={{ fontWeight: 500, color: C.heading }}>programs</span>
      </div>
      <ListView id={wid(win, 'list')} x={14} y={40} w={w - 28} h={h - 130} multi={false} columns={[{ label: 'Name', w: w - 160 }, { label: 'Size', w: 90, align: 'right' }]} items={PROGRAMS.map(([n, s]) => ({ key: n, cells: [n, s], icon: <Ico kind="programs" size={16} /> }))} />
      <div style={{ position: 'absolute', left: 14, top: h - 82, ...txt, color: '#8b91a6' }}>{p ? `Used ${p[2]}. Last used on 11/5/2003.` : 'Select a program to see its details.'}</div>
      <Button id={wid(win, 'remove')} label="Change/Remove" x={w - 134} y={h - 86} w={120} h={23} disabled />
    </>
  )
}

function Printers({ win }) {
  return (
    <>
      <div style={{ position: 'absolute', left: 14, top: 10, fontFamily: FONT, fontSize: 17.5, fontWeight: 300, color: C.headingLight }}>
        printers <span style={{ fontWeight: 500, color: C.heading }}>and faxes</span>
      </div>
      <div style={{ position: 'absolute', left: 14, top: 50, ...txt, color: '#8b91a6' }}>There are no printers or faxes installed.</div>
      <Button id={wid(win, 'add')} label="Add a printer" x={14} y={80} w={110} h={23} onClick={() => messageBox({ title: 'Add Printer Wizard', icon: 'warning', text: 'No printers were found. Make sure the printer is connected and turned on, then try again.' })} />
    </>
  )
}

const BODIES = { datetime: DateTime, sound: Sound, mouse: Mouse, users: Users, network: Network, programs: Programs, printers: Printers }

function Applet(props) {
  const { win, h, w } = props
  const key = win.props?.applet || 'datetime'
  const Body = BODIES[key] || DateTime
  const ok = () => {
    emit('cpl.apply', { applet: key })
    closeWin(win.id)
  }
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <Body {...props} />
      <Button id={wid(win, 'ok')} label="OK" isDefault x={w - 262} y={h - 36} w={78} h={23} onClick={ok} />
      <Button id={wid(win, 'cancel')} label="Cancel" x={w - 178} y={h - 36} w={78} h={23} onClick={() => closeWin(win.id)} />
      <Button id={wid(win, 'apply')} label="Apply" x={w - 94} y={h - 36} w={78} h={23} onClick={() => emit('cpl.apply', { applet: key })} />
    </div>
  )
}

const ticking = (win) => (win.props?.applet || 'datetime') === 'datetime'

export default {
  id: 'applet',
  title: (p) => TITLES[p.applet] || 'Control Panel',
  taskbarLabel: (p) => TITLES[p.applet] || 'Control Panel',
  icon: null,
  // (Date and Time is taller: its Time Zone tab holds the world map)
  size: (p) => (p.applet === 'datetime' ? SIZE_DT : SIZE),
  position: { x: 260, y: 150 },
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(Applet, { watch: ['cpl'], alive: (win) => ticking(win) }),
  liveTime: (win, t, base) => (win.state === 'open' && ticking(win) ? t : base),
}
