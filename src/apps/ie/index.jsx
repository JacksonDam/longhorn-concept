// Internet Explorer 6 in the Plex frame. There is no network: every address shows IE6's offline
// page "The page cannot be displayed" with the requested address in the Address bar.
//
// Navigation is logged per window: 'ie.go' { id, url } (typed address, Home, Favorites, links),
// 'ie.back' / 'ie.fwd' / 'ie.refresh' / 'ie.stop' { id }; 'win.open' with props.url (web links in
// other windows) navigates too. A navigation shows ~0.8 s of "Finding site" before the page.
import { memo } from 'react'
import { emit, getLog, getVersion } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, valueOf, TextField, Button, ScrollView, ContextMenu, contextHandler, focusField, DropMenu, dropBelow } from '../../ui/index.js'
import { AppTop, appTopHeight, StatusBar, label, chromeTop } from '../lib/chrome.jsx'
import { Ico } from '../lib/icons.jsx'
import { normUrl, openWin, closeWin, messageBox } from '../lib/common.js'

const LOAD = 0.8 // s of "Finding site" after a navigation
const HOME = 'http://www.msn.com/'
const FAVORITES = [
  ['MSN.com', 'www.msn.com'],
  ['Radio Station Guide', 'windowsmedia.com/radio'],
  ['Windows Media', 'www.windowsmedia.com'],
  ['Windows Update', 'windowsupdate.microsoft.com'],
  ['Hotmail', 'www.hotmail.com'],
]

// history of this window from the log: { list: [url], pos, at (time of the last navigation), kind }
const navCache = new Map()
export function navState(t, win) {
  const v = getVersion()
  const key = win.id + '@' + win.openedAt
  const c = navCache.get(key)
  if (c && c.v === v && c.t === t) return c.s
  const log = getLog()
  let list = []
  let pos = -1
  let at = win.openedAt
  let stopAt = -Infinity
  let first = true
  for (const e of log) {
    if (e.t > t) break
    if (e.t < win.openedAt || e.id !== win.id) continue
    if (e.type === 'win.open' && e.props?.url) {
      if (first) {
        list = [normUrl(e.props.url)]
        pos = 0
        first = false
      } else {
        list = [...list.slice(0, pos + 1), normUrl(e.props.url)]
        pos = list.length - 1
      }
      at = e.t
    } else if (e.type === 'ie.go') {
      list = [...list.slice(0, pos + 1), normUrl(e.url)]
      pos = list.length - 1
      at = e.t
    } else if (e.type === 'ie.back' && pos > 0) {
      pos--
      at = e.t
    } else if (e.type === 'ie.fwd' && pos < list.length - 1) {
      pos++
      at = e.t
    } else if (e.type === 'ie.refresh') at = e.t
    else if (e.type === 'ie.stop') stopAt = e.t
  }
  if (pos < 0) {
    list = [normUrl(win.props?.url || HOME)]
    pos = 0
  }
  const loading = t - at < LOAD && stopAt < at
  const stopped = stopAt >= at && stopAt - at < LOAD
  const s = { list, pos, url: list[pos], at, loading, stopped }
  navCache.set(key, { v, t, s })
  if (navCache.size > 64) navCache.delete(navCache.keys().next().value)
  return s
}

const go = (win, url) => {
  emit('ie.go', { id: win.id, url })
  emit('win.props', { id: win.id, url })
}

// ---- the offline page (IE6 res://shdoclc.dll/dnserror.htm) -------------------------------------
const pageText = { fontFamily: 'Verdana, Tahoma, sans-serif', fontSize: 11, lineHeight: '14px', color: '#000' }
const li = { margin: '0 0 6px', paddingLeft: 2 }

const InfoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32">
    <defs>
      <radialGradient id="ie-info" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#d8ecff" />
        <stop offset="0.6" stopColor="#3b78d8" />
        <stop offset="1" stopColor="#123f9a" />
      </radialGradient>
    </defs>
    <circle cx="16" cy="16" r="14" fill="url(#ie-info)" stroke="#0f357f" strokeWidth="0.8" />
    <circle cx="16" cy="9" r="2.3" fill="#fff" />
    <rect x="13.8" y="13" width="4.4" height="12" rx="1" fill="#fff" />
  </svg>
)

const Glyph = ({ kind, onClick }) => (
  <span
    onPointerDown={(e) => {
      if (e.button === 0) onClick()
    }}
    style={{ display: 'inline-block', verticalAlign: '-4px', width: 16, height: 16, margin: '0 2px', borderRadius: 3, background: kind === 'refresh' ? '#3a8a2a' : '#2f6cc8' }}
  >
    <Ico kind={kind === 'refresh' ? 'refresh' : 'back'} size={16} />
  </span>
)

const OfflinePage = memo(function OfflinePage({ id, textSize }) {
  const k = [0.8, 0.9, 1, 1.15, 1.3][textSize] ?? 1
  const fs = (n) => Math.round(n * k * 10) / 10
  return (
    <div style={{ ...pageText, fontSize: fs(11), lineHeight: `${fs(14)}px`, padding: '14px 16px 20px', width: 430 * k }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 'none', marginTop: 2 }}>
          <InfoIcon />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: fs(17), lineHeight: `${fs(20)}px`, margin: '6px 0 12px' }}>The page cannot be displayed</div>
          <div>
            The page you are looking for is currently unavailable. The Web site might be experiencing technical difficulties, or you may need to adjust your browser settings.
          </div>
          <div style={{ height: 1, background: '#c0c0c0', margin: '12px 0' }} />
          <div style={{ marginBottom: 8 }}>Please try the following:</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li style={li}>
              Click the <Glyph kind="refresh" onClick={() => emit('ie.refresh', { id })} /> <b>Refresh</b> button, or try again later.
            </li>
            <li style={li}>If you typed the page address in the Address bar, make sure that it is spelled correctly.</li>
            <li style={li}>
              To check your connection settings, click the <b>Tools</b> menu, and then click <b>Internet Options</b>. On the <b>Connections</b> tab, click <b>Settings</b>. The
              settings should match those provided by your local area network (LAN) administrator or Internet service provider (ISP).
            </li>
            <li style={li}>
              See if your Internet connection settings are being detected. You can set Microsoft Windows to examine your network and automatically discover network connection
              settings (if your network administrator has enabled this setting).
              <ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                <li>
                  Click the <b>Tools</b> menu, and then click <b>Internet Options</b>.
                </li>
                <li>
                  On the <b>Connections</b> tab, click <b>LAN Settings</b>.
                </li>
                <li>
                  Select <b>Automatically detect settings</b>, and then click <b>OK</b>.
                </li>
              </ol>
            </li>
            <li style={li}>
              Some sites require 128-bit connection security. Click the <b>Help</b> menu and then click <b>About Internet Explorer</b> to determine what strength security you have
              installed.
            </li>
            <li style={li}>
              If you are trying to reach a secure site, make sure your Security settings can support it. Click the <b>Tools</b> menu, and then click <b>Internet Options</b>. On the{' '}
              <b>Advanced</b> tab, scroll to the Security section and check settings for SSL 2.0, SSL 3.0, TLS 1.0, PCT 1.0.
            </li>
            <li style={li}>
              Click the <Glyph kind="back" onClick={() => emit('ie.back', { id })} /> <b>Back</b> button to try another link.
            </li>
          </ul>
          <div style={{ height: 1, background: '#c0c0c0', margin: '12px 0 8px' }} />
          <div>Cannot find server or DNS Error</div>
          <div>Internet Explorer</div>
        </div>
      </div>
    </div>
  )
})

// the spinning-free IE6 throbber: the logo in the toolbar's right corner, a glint while loading
function Throbber({ x, loading, t, onClick }) {
  const k = loading ? 0.5 + 0.5 * Math.sin(t * 9) : 0
  return (
    <div onPointerDown={(e) => e.button === 0 && onClick()} style={{ position: 'absolute', left: x, top: 3, width: 30, height: 28, borderRadius: 4, background: `rgba(255,255,255,${0.12 + 0.18 * k})`, boxShadow: 'inset 0 0 0 1px rgba(190,228,255,0.45)' }}>
      <div style={{ position: 'absolute', left: 3, top: 2 }}>
        <Ico kind="ie" size={24} />
      </div>
    </div>
  )
}

function IE({ win, t, w, h }) {
  const id = win.id
  const nav = navState(t, win)
  const statusOn = valueOf(t, wid(win, 'status'), true)
  const textSize = valueOf(t, wid(win, 'textsize'), 2)
  const addrId = wid(win, 'addr' + nav.list.length + ':' + nav.pos + ':' + Math.round(nav.at * 1000))
  const canBack = nav.pos > 0
  const canFwd = nav.pos < nav.list.length - 1
  const top = appTopHeight({ row2: 24 })
  const sbH = statusOn ? 20 : 0
  const bodyH = h - top - sbH
  const navTo = (url) => go(win, url)
  const toolbar = [
    { id: wid(win, 'back'), icon: 'back', label: 'Back', onClick: () => emit('ie.back', { id }), disabled: !canBack, iconSize: 22 },
    { id: wid(win, 'fwd'), icon: 'forward', onClick: () => emit('ie.fwd', { id }), disabled: !canFwd, iconSize: 22, tip: 'Forward' },
    { id: wid(win, 'stop'), icon: 'stop', onClick: () => emit('ie.stop', { id }), tip: 'Stop' },
    { id: wid(win, 'refresh'), icon: 'refresh', onClick: () => emit('ie.refresh', { id }), tip: 'Refresh' },
    { id: wid(win, 'home'), icon: 'home', onClick: () => navTo(HOME), tip: 'Home' },
    '|',
    { id: wid(win, 'search'), icon: 'search', label: 'Search', onClick: () => openWin('search', 'search') },
    { id: wid(win, 'favs'), icon: 'star', label: 'Favorites', onClick: () => navTo('www.msn.com') },
    { id: wid(win, 'hist'), icon: 'history', onClick: (e) => dropBelow(wid(win, 'dd.hist'), e.currentTarget, historyItems), tip: 'History' },
    '|',
    { id: wid(win, 'mail'), icon: 'mail', onClick: () => openWin('inbox', 'outlook'), tip: 'Mail' },
    { id: wid(win, 'print'), icon: 'print', onClick: () => printBox(), tip: 'Print' },
  ]
  const menus = [
    {
      key: 'file',
      label: 'File',
      items: [
        { label: 'New Window', shortcut: 'Ctrl+N', onClick: () => openWin('ie:' + Math.round(now() * 1000), 'ie', { url: nav.url }) },
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: () => focusField(addrId) },
        '-',
        { label: 'Print...', shortcut: 'Ctrl+P', onClick: () => printBox() },
        '-',
        { label: 'Work Offline', checked: true, onClick: () => offlineBox() },
        { label: 'Close', onClick: () => closeWin(id) },
      ],
    },
    {
      key: 'edit',
      label: 'Edit',
      items: [{ label: 'Cut', disabled: true }, { label: 'Copy', disabled: true }, { label: 'Paste', disabled: true }, '-', { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => focusField(addrId) }],
    },
    {
      key: 'view',
      label: 'View',
      items: [
        { label: 'Status Bar', checked: statusOn, onClick: () => emit('ui.value', { id: wid(win, 'status'), value: !statusOn }) },
        '-',
        { label: 'Stop', shortcut: 'Esc', onClick: () => emit('ie.stop', { id }) },
        { label: 'Refresh', shortcut: 'F5', onClick: () => emit('ie.refresh', { id }) },
        '-',
        {
          label: 'Text Size',
          items: ['Largest', 'Larger', 'Medium', 'Smaller', 'Smallest'].map((n, i) => ({ label: n, radio: 4 - i === textSize, onClick: () => emit('ui.value', { id: wid(win, 'textsize'), value: 4 - i }) })),
        },
      ],
    },
    {
      key: 'fav',
      label: 'Favorites',
      items: [{ label: 'Add to Favorites...', onClick: () => messageBox({ title: 'Add Favorite', icon: 'info', text: `Internet Explorer will add this page to your Favorites list.\n\n${nav.url}` }) }, '-', ...FAVORITES.map(([n, u]) => ({ label: n, onClick: () => navTo(u) }))],
    },
    {
      key: 'tools',
      label: 'Tools',
      items: [
        { label: 'Mail and News', items: [{ label: 'Read Mail', onClick: () => openWin('inbox', 'outlook') }, { label: 'New Message...', onClick: () => openWin('compose:' + Math.round(now() * 1000), 'compose', { mode: 'new' }) }] },
        { label: 'Windows Update', onClick: () => navTo('windowsupdate.microsoft.com') },
        '-',
        { label: 'Internet Options...', onClick: () => openWin('control', 'control', { applet: 'network' }) },
      ],
    },
    {
      key: 'help',
      label: 'Help',
      items: [
        { label: 'Contents and Index', onClick: () => openWin('help', 'help') },
        '-',
        { label: 'About Internet Explorer', onClick: () => openWin('about-ie', 'about', { product: 'ie' }) },
      ],
    },
  ]
  const linkItems = [
    { label: 'Customize Links', onClick: () => navTo('www.msn.com/links') },
    { label: 'Free Hotmail', onClick: () => navTo('www.hotmail.com') },
    { label: 'Windows', onClick: () => navTo('www.microsoft.com/windows') },
    { label: 'Windows Media', onClick: () => navTo('www.windowsmedia.com') },
  ]
  const historyItems = [
    ...nav.list.map((u, i) => ({ label: hostOf(u), radio: i === nav.pos, onClick: () => (i === nav.pos ? emit('ie.refresh', { id }) : navTo(u)) })),
    '-',
    { label: 'Today', items: nav.list.map((u) => ({ label: hostOf(u), onClick: () => navTo(u) })) },
  ]
  const ctxItems = [
    { label: 'Back', disabled: !canBack, onClick: () => emit('ie.back', { id }) },
    { label: 'Forward', disabled: !canFwd, onClick: () => emit('ie.fwd', { id }) },
    '-',
    { label: 'Select All', onClick: () => focusField(addrId) },
    '-',
    { label: 'Refresh', onClick: () => emit('ie.refresh', { id }) },
    { label: 'Print...', onClick: () => printBox() },
    '-',
    { label: 'Properties', onClick: () => messageBox({ title: 'Properties', icon: 'info', text: `The page cannot be displayed\n\nAddress: ${nav.url}\nZone: Internet` }) },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff' }}>
      <AppTop id={wid(win, 'm')} w={w} menus={menus} toolbar={toolbar} row2={24}>
        <Throbber x={w - 38} loading={nav.loading} t={t} onClick={() => navTo(HOME)} />
        <div style={{ position: 'absolute', left: 12, top: top - 25, ...label(10.5, '#cfe6ff', 600), lineHeight: '18px' }}>Address</div>
        <TextField
          id={addrId}
          def={nav.url}
          x={62}
          y={top - 25}
          w={w - 160}
          h={18}
          variant="chrome"
          size={11}
          pad={9}
          color="#1d3557"
          onEnter={(v) => {
            if (v.trim()) navTo(v.trim())
          }}
        />
        <div style={{ position: 'absolute', left: w - 94, top: top - 26 }}>
          <Button id={wid(win, 'go')} variant="glass" x={0} y={0} w={44} h={20} onClick={() => navTo(valueOf(now(), addrId, null)?.text || nav.url)}>
            <Ico kind="go" size={16} />
            Go
          </Button>
        </div>
        <div style={{ position: 'absolute', left: w - 46, top: top - 25, ...label(10.5, '#cfe6ff', 600), lineHeight: '18px' }} onPointerDown={(e) => e.button === 0 && dropBelow(wid(win, 'dd.links'), e.currentTarget, linkItems)}>
          Links {'\u00bb'}
        </div>
        <DropMenu id={wid(win, 'dd.links')} items={linkItems} />
        <DropMenu id={wid(win, 'dd.hist')} items={historyItems} />
      </AppTop>
      <div style={{ position: 'absolute', left: 0, top, width: w, height: bodyH }} onContextMenu={contextHandler(wid(win, 'ctx'), ctxItems)}>
        {nav.loading ? null : (
          <ScrollView id={wid(win, 'page' + nav.pos)} x={0} y={0} w={w} h={bodyH} bar="always" style={{ background: '#fff' }}>
            <OfflinePage id={id} textSize={textSize} />
          </ScrollView>
        )}
      </div>
      {statusOn && (
        <StatusBar
          y={h - 20}
          w={w}
          left={
            <>
              <Ico kind="ie" size={14} />
              <span>{nav.loading ? `Finding site: ${hostOf(nav.url)}...` : nav.stopped ? 'Action canceled' : 'Done'}</span>
              {nav.loading && <Progress k={(t - nav.at) / LOAD} />}
            </>
          }
          right={
            <>
              <Ico kind="ie" size={14} />
              <span onPointerDown={(e) => e.button === 0 && zoneBox()}>Internet</span>
            </>
          }
        />
      )}
      <ContextMenu id={wid(win, 'ctx')} items={ctxItems} />
    </div>
  )
}

const hostOf = (u) => String(u).replace(/^[a-z]+:\/\//i, '').replace(/\/.*$/, '')

function Progress({ k }) {
  const n = Math.max(0, Math.min(10, Math.floor(k * 12)))
  return (
    <div style={{ display: 'flex', gap: 1, marginLeft: 10 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{ width: 6, height: 9, background: i < n ? '#3f8ae0' : 'transparent' }} />
      ))}
    </div>
  )
}

function zoneBox() {
  messageBox({ title: 'Internet Zone', icon: 'info', text: 'Internet zone\nSecurity level: Medium\n\nThis zone contains all Web sites you haven\u2019t placed in other zones.' })
}
function printBox() {
  messageBox({ title: 'Print', icon: 'warning', text: 'Windows cannot print because no printer is installed.\nTo add a printer, open Printers and Faxes in Control Panel.' })
}
function offlineBox() {
  messageBox({ title: 'Work Offline', icon: 'info', text: 'You are working offline. Pages are not available until the network cable is connected.' })
}

export default {
  id: 'ie',
  title: () => 'The page cannot be displayed - Microsoft Internet Explorer',
  taskbarLabel: () => 'The page cannot be displayed - Microsoft Internet Explorer',
  icon: null,
  size: { w: 700, h: 520 },
  position: { x: 90, y: 50 },
  minSize: { w: 420, h: 260 },
  explorer: false,
  chromeTop: chromeTop({ row2: 24 }),
  background: '#ffffff',
  Content: scoped(IE, {}),
}
