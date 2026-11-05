// Help and Support Center: a home page of topics about this Plex desktop, a search box that
// filters them, Back / Home, and short articles.  win.open { id: 'help', app: 'help', props: { topic? } }
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, valueOf, find, TextField, textOf, Button, ScrollView, hoverKeys, pt, C, FONT, HEAVY } from '../../ui/index.js'
import { AppTop, appTopHeight } from '../lib/chrome.jsx'
import { Ico } from '../lib/icons.jsx'
import { openWin, closeWin } from '../lib/common.js'

export const TOPICS = [
  { key: 'basics', title: 'Windows basics', icon: 'computer', body: ['Every program opens in its own window. Drag a window by its title bar to move it, and double-click the title bar to maximize it.', 'The three buttons at the top right of a window minimize it into its taskbar button, maximize it, or close it.', 'Click a button on the taskbar to restore a minimized window or to switch to it.'] },
  { key: 'sidebar', title: 'Using the sidebar', icon: 'display', body: ['The sidebar on the right of the screen shows your name, the weather, your newest mail, what is playing, your buddies and a picture.', 'Click a mail subject to read it in Outlook, a buddy to send an instant message, or the media strip to see your music.', 'The arrow at the bottom right of the taskbar hides and shows the sidebar.'] },
  { key: 'music', title: 'Playing music', icon: 'music', body: ['Open my Music from the Start menu or the sidebar to see your albums. Click an album to see its tracks, and click a track to play it.', 'Winamp3 and the sidebar media strip show the track that is playing. Use their buttons to pause, skip or go back.', 'Burn CD and Share Music are on the my Music window.'] },
  { key: 'pictures', title: 'Pictures and videos', icon: 'picture', body: ['my Pictures & Videos groups your pictures by the day they were taken. Refine By Date narrows the list to a day, a month or a year.', 'Double-click a picture to see its details, then Edit to rotate it or adjust it. View Slide Show shows your pictures full screen.', 'Create an Album collects pictures into an album you can play as a slide show.'] },
  { key: 'mail', title: 'E-mail with Outlook', icon: 'mailbig', body: ['Outlook shows your Inbox with a reading pane. Click a message to read it.', 'New, Reply and Forward open a message window. Click Send to send it; it is kept in Sent Items.', 'This computer is not connected to a network, so Send/Receive cannot reach the mail server.'] },
  { key: 'word', title: 'Writing with Word', icon: 'doc', body: ['Click in the page and type. Select text, then use the buttons for bold, italic, underline, fonts, sizes, colors, alignment and bullets.', 'Click Save to keep your changes. Word asks before closing a document with unsaved changes.'] },
  { key: 'internet', title: 'The Internet', icon: 'ie', body: ['Internet Explorer opens Web pages. Type an address in the Address bar and press Enter.', 'This computer is working offline: the network cable is unplugged, so every page shows "The page cannot be displayed".', 'See Network Connections in Control Panel for the connection status.'] },
  { key: 'background', title: 'Changing the desktop background', icon: 'display', body: ['Right-click the desktop and click Properties, or open Display in Control Panel.', 'Pick a background in the list and click Apply or OK.'] },
  { key: 'logoff', title: 'Logging off and shutting down', icon: 'users', body: ['Click your name at the top of the sidebar, or open the Start menu, and choose Log Off, Switch User or Shut Down.', 'Logging off returns to the welcome screen, where any user can log on.'] },
]

function TopicList({ win, t, list, x, y }) {
  const lit = hoverKeys(t, wid(win, 'tl'))
  return list.map((tp, i) => {
    const l = lit.get(tp.key) || 0
    return (
      <div
        key={tp.key}
        style={{ position: 'absolute', left: x, top: y + i * 26, width: 300, height: 24, display: 'flex', alignItems: 'center', gap: 8 }}
        onPointerEnter={(e) => emit('hover', { id: wid(win, 'tl'), key: tp.key, on: true, ...pt(e) })}
        onPointerLeave={() => emit('hover', { id: wid(win, 'tl'), key: tp.key, on: false })}
        onPointerDown={(e) => e.button === 0 && go(win, tp.key)}
      >
        <Ico kind={tp.icon} size={20} />
        <span style={{ fontFamily: FONT, fontSize: 12, color: l > 0.5 ? C.link : '#3a4260', textDecoration: l > 0.5 ? 'underline' : 'none' }}>{tp.title}</span>
      </div>
    )
  })
}

const Article = memo(function Article({ tp, w }) {
  return (
    <div style={{ padding: '14px 22px', width: w - 60 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Ico kind={tp.icon} size={32} />
        <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 400, color: C.heading }}>{tp.title}</div>
      </div>
      {tp.body.map((p, i) => (
        <p key={i} style={{ margin: '0 0 10px', fontFamily: FONT, fontSize: 12, lineHeight: '18px', color: C.text }}>
          {p}
        </p>
      ))}
    </div>
  )
})

// navigation: 'help.go' { id, topic } (null = home), back via 'help.back'; win.open props.topic too
function navOf(t, win) {
  const evs = []
  for (const type of ['help.go', 'help.back', 'win.open']) {
    const [a, i] = find(t, type, win.id)
    for (let j = 0; j <= i; j++) if (a[j].t >= win.openedAt) evs.push(a[j])
  }
  evs.sort((p, q) => p.t - q.t)
  let stack = [win.props?.topic && evs.every((e) => e.type !== 'win.open') ? win.props.topic : null]
  for (const e of evs) {
    if (e.type === 'help.go') stack = [...stack, e.topic]
    else if (e.type === 'help.back' && stack.length > 1) stack = stack.slice(0, -1)
    else if (e.type === 'win.open') stack = [...stack, e.props?.topic ?? null]
  }
  return stack
}
const go = (win, topic) => emit('help.go', { id: win.id, topic })

function Help({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const stack = navOf(t, win)
  const cur = stack[stack.length - 1]
  const tp = TOPICS.find((x) => x.key === cur)
  const searched = valueOf(t, id('searched'), '')
  const list = searched ? TOPICS.filter((x) => (x.title + ' ' + x.body.join(' ')).toLowerCase().includes(searched)) : TOPICS
  const top = appTopHeight({ row2: 24 })
  const search = () => {
    emit('ui.value', { id: id('searched'), value: textOf(now(), id('q')).trim().toLowerCase() })
    go(win, null)
  }
  const toolbar = [
    { id: id('back'), icon: 'back', label: 'Back', disabled: stack.length < 2, onClick: () => emit('help.back', { id: win.id }), iconSize: 22 },
    { id: id('home'), icon: 'home', label: 'Home', onClick: () => (emit('ui.value', { id: id('searched'), value: '' }), go(win, null)) },
    { id: id('index'), icon: 'bullets', label: 'Index', onClick: () => (emit('ui.value', { id: id('searched'), value: '' }), go(win, null)) },
  ]
  const menus = [
    { key: 'file', label: 'File', items: [{ label: 'Close', onClick: () => closeWin(win.id) }] },
    { key: 'go', label: 'Go', items: [{ label: 'Home', onClick: () => go(win, null) }, '-', ...TOPICS.map((x) => ({ label: x.title, radio: x.key === cur, onClick: () => go(win, x.key) }))] },
    { key: 'help', label: 'Help', items: [{ label: 'About Windows', onClick: () => openWin('about', 'about') }] },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <AppTop id={id('m')} w={w} menus={menus} toolbar={toolbar} row2={24}>
        <div style={{ position: 'absolute', left: 12, top: top - 25, lineHeight: '18px', fontFamily: HEAVY, fontSize: 10.5, color: '#cfe6ff' }}>Search</div>
        <TextField id={id('q')} x={62} y={top - 25} w={w - 150} h={18} variant="chrome" pad={9} size={11} onEnter={search} />
        <div style={{ position: 'absolute', left: w - 82, top: top - 26 }}>
          <Button id={id('go')} variant="glass" x={0} y={0} w={70} h={20} onClick={search}>
            <Ico kind="go" size={16} />
            Search
          </Button>
        </div>
      </AppTop>
      {tp ? (
        <ScrollView key={tp.key} id={id('art:' + tp.key)} x={0} y={top} w={w} h={h - top}>
          <Article tp={tp} w={w} />
        </ScrollView>
      ) : (
        <>
          <div style={{ position: 'absolute', left: 24, top: top + 16, fontFamily: FONT, fontSize: 13, color: '#4f86d6' }}>Windows</div>
          <div style={{ position: 'absolute', left: 22, top: top + 30, fontFamily: FONT, fontSize: 26, fontWeight: 300, color: '#86b4ea', whiteSpace: 'nowrap' }}>
            help <span style={{ fontWeight: 400, color: '#2c6cc4' }}>and support</span>
          </div>
          <div style={{ position: 'absolute', left: 24, top: top + 74, fontFamily: FONT, fontSize: 11, color: '#8b91a6' }}>
            {searched ? `${list.length} topic${list.length === 1 ? '' : 's'} found for "${searched}"` : 'Pick a help topic'}
          </div>
          <TopicList win={win} t={t} list={list} x={24} y={top + 98} />
          <div style={{ position: 'absolute', left: 360, top: top + 98, width: w - 390, padding: 14, borderRadius: 6, background: 'rgba(255,255,255,0.7)', boxShadow: `inset 0 0 0 1px ${C.borderLight}`, boxSizing: 'border-box' }}>
            <div style={{ fontFamily: HEAVY, fontSize: 12, color: '#3b7cc6', marginBottom: 6 }}>Did you know?</div>
            <div style={{ fontFamily: FONT, fontSize: 11, lineHeight: '16px', color: C.text }}>You can right-click almost anything, the desktop, a file, a message or a picture, to see what you can do with it.</div>
          </div>
        </>
      )}
    </div>
  )
}

export default {
  id: 'help',
  title: () => 'Help and Support Center',
  taskbarLabel: () => 'Help and Support Center',
  icon: null,
  size: { w: 640, h: 500 },
  position: { x: 140, y: 60 },
  minSize: { w: 520, h: 360 },
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(Help),
}
