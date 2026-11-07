// Help and Support Center: a home page of topics about this Plex desktop, a search box that
// filters them, Back / Home, and short articles.  win.open { id: 'help', app: 'help', props: { topic? } }
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, valueOf, find, TextField, textOf, Button, ScrollView, hoverKeys, pt, focusField, C, FONT, HEAVY } from '../../ui/index.js'
import { AppTop, appTopHeight, chromeTop } from '../lib/chrome.jsx'
import { Ico } from '../lib/icons.jsx'
import { openWin, closeWin } from '../lib/common.js'

export const TOPICS = [
  { key: 'basics', title: 'Windows basics', icon: 'computer', body: ['To move a window, drag its title bar.', 'To maximize a window, double-click its title bar, or click the Maximize button.', 'To minimize a window to a button on the taskbar, click the Minimize button. To restore it, click its taskbar button.'] },
  { key: 'sidebar', title: 'Using the sidebar', icon: 'display', body: ['To read a message, click its subject under Mail.', 'To send an instant message, click a name under Buddies.', 'To hide or show the sidebar, click the arrow at the right end of the taskbar.'] },
  { key: 'music', title: 'Playing music', icon: 'music', body: ['To play music, open my Music, click an album, and then click a track.', 'To copy music to a CD, click Burn CD in my Music.'] },
  { key: 'pictures', title: 'Pictures and videos', icon: 'picture', body: ['To see the pictures taken on a certain day, month or year, click it under Refine By Date.', 'To see a larger view of a picture, double-click it.', 'To view your pictures as a slide show, click View Slide Show.'] },
  { key: 'mail', title: 'E-mail with Outlook', icon: 'mailbig', body: ['To read a message, click it in the Inbox. The message appears in the Reading Pane.', 'To write a new message, click New. To reply to a message, click Reply.', 'Copies of the messages you send are saved in the Sent Items folder.'] },
  { key: 'word', title: 'Writing with Word', icon: 'doc', body: ['To format text, select it, and then click Bold, Italic or Underline on the toolbar.', 'To save a document, click Save.'] },
  { key: 'internet', title: 'The Internet', icon: 'ie', body: ['To go to a Web page, type its address in the Address bar, and then press ENTER.', 'To see the status of your network connection, open Network Connections in Control Panel.'] },
  { key: 'background', title: 'Changing the desktop background', icon: 'display', body: ['Open Display in Control Panel, or right-click the desktop and click Properties.', 'On the Desktop tab, click a picture in the Background list, and then click OK.'] },
  { key: 'logoff', title: 'Logging off and shutting down', icon: 'users', body: ['To log off, click Start, and then click Log Off.', 'To turn off the computer, click Start, and then click Shut Down.', 'You can also click your name at the top of the sidebar, and then click Switch User, Log Off or Shut Down.'] },
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
        <div style={{ position: 'absolute', left: 12, top: top - 25, lineHeight: '18px', fontFamily: HEAVY, fontSize: 10.5, color: '#cfe6ff' }} onPointerDown={(e) => e.button === 0 && focusField(id('q'))}>Search</div>
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
          <div onPointerDown={(e) => e.button === 0 && openWin('about', 'about')} style={{ position: 'absolute', left: 24, top: top + 16, fontFamily: FONT, fontSize: 13, color: '#4f86d6' }}>Windows</div>
          <div onPointerDown={(e) => e.button === 0 && go(win, 'basics')} style={{ position: 'absolute', left: 22, top: top + 30, fontFamily: FONT, fontSize: 26, fontWeight: 300, color: '#86b4ea', whiteSpace: 'nowrap' }}>
            help <span style={{ fontWeight: 400, color: '#2c6cc4' }}>and support</span>
          </div>
          <div style={{ position: 'absolute', left: 24, top: top + 74, fontFamily: FONT, fontSize: 11, color: '#8b91a6' }} onPointerDown={(e) => e.button === 0 && focusField(id('q'))}>
            {searched ? `${list.length} topic${list.length === 1 ? '' : 's'} found for "${searched}"` : 'Pick a Help topic'}
          </div>
          <TopicList win={win} t={t} list={list} x={24} y={top + 98} />
          <div onPointerDown={(e) => e.button === 0 && go(win, 'basics')} style={{ position: 'absolute', left: 360, top: top + 98, width: w - 390, padding: 14, borderRadius: 6, background: 'rgba(255,255,255,0.7)', boxShadow: `inset 0 0 0 1px ${C.borderLight}`, boxSizing: 'border-box' }}>
            <div style={{ fontFamily: HEAVY, fontSize: 12, color: '#3b7cc6', marginBottom: 6 }}>Did you know?</div>
            <div style={{ fontFamily: FONT, fontSize: 11, lineHeight: '16px', color: C.text }}>Right-click an item to see the commands you can use with it.</div>
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
  chromeTop: chromeTop({ row2: 24 }),
  background: '#f6f9fe',
  Content: scoped(Help, {}),
}
