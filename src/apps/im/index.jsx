// Instant message window for a sidebar buddy: history, input box, Send. Sent messages appear in
// the history ('im.send' { id, buddy, text }); buddies never reply, a status line says they are
// away instead.  win.open { id: 'im:<name>', app: 'im', props: { buddy } }
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { asset } from '../../core/preload.js'
import { scoped, wid, valueOf, TextField, textOf, setText, Button, ScrollView, scrollTo, find, C, FONT, HEAVY } from '../../ui/index.js'
import { AppTop, appTopHeight, chromeTop } from '../lib/chrome.jsx'
import { Ico } from '../lib/icons.jsx'
import { closeWin, messageBox, openWin } from '../lib/common.js'
import { userName } from '../lib/user.js'

const PICS = { Hank: 'buddy-kick.webp', Anthony: 'buddy-dog.webp', RogerCC: 'buddy-duck.webp' }
const AWAY = new Set(['Harold', 'Kathy', 'Gmonster', 'Justin'])
const emailOf = (b) => `${String(b || 'buddy').toLowerCase().replace(/\s+/g, '')}@hotmail.com`

const BuddyPic = memo(function BuddyPic({ buddy, size = 48 }) {
  const f = PICS[buddy]
  return (
    <div style={{ width: size, height: size, borderRadius: 4, overflow: 'hidden', background: 'linear-gradient(180deg, #dbe9fb, #a9c4ea)', boxShadow: '0 0 0 1px #fff, 0 0 0 2px #8fa9cf, 0 2px 4px rgba(30,60,120,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {f ? <img src={asset('img/desktop/' + f)} alt="" draggable={false} style={{ width: size, height: size, objectFit: 'cover' }} /> : <Ico kind="users" size={size - 12} />}
    </div>
  )
})

const History = memo(function History({ buddy, msgs, me, w, blocked }) {
  const status = (k) => (
    <div key={k} style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 10.5, color: '#8b91a6', margin: '4px 0 8px', lineHeight: '14px' }}>
      {AWAY.has(buddy) ? `${buddy} is away and may not reply.` : `${buddy} appears to be away from the computer and may not reply.`}
    </div>
  )
  return (
    <div style={{ padding: '8px 10px', width: w - 20 }}>
      <div style={{ fontFamily: FONT, fontSize: 10.5, color: '#8b91a6', lineHeight: '14px', marginBottom: 6 }}>Never give out your password or credit card number in an instant message conversation.</div>
      {status('s0')}
      {msgs.map((m, i) => (
        <div key={i}>
          <div style={{ fontFamily: FONT, fontSize: 10.5, color: '#8b91a6' }}>{me} says:</div>
          <div style={{ fontFamily: FONT, fontSize: 12, color: '#1d3557', paddingLeft: 10, marginBottom: 4, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>{m.text}</div>
          {i === msgs.length - 1 && (
            <div style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 10.5, color: '#8b91a6', margin: '2px 0 8px' }}>
              {blocked ? `${buddy} is blocked and will not receive your messages.` : `${buddy} is away. Your message will be delivered when ${buddy} returns.`}
            </div>
          )}
        </div>
      ))}
    </div>
  )
})

function IM({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const buddy = win.props?.buddy || 'Buddy'
  const [a, i] = find(t, 'im.send', win.id)
  const msgs = []
  for (let j = 0; j <= i; j++) if (a[j].t >= win.openedAt) msgs.push(a[j])
  const blocked = valueOf(t, id('block'), false)
  const me = userName(t)
  const top = appTopHeight()
  const field = id('input')
  const histH = h - top - 140
  const send = () => {
    const tx = textOf(now(), field).trim()
    if (!tx) return
    emit('im.send', { id: win.id, buddy, text: tx })
    setText(field, '')
    scrollTo(id('hist'), 100000)
  }
  const toolbar = [
    { id: id('files'), icon: 'attach', label: 'Send Files', onClick: () => messageBox({ title: 'Send a File', icon: 'info', text: `${buddy} is away. Files can be sent when ${buddy} is online.` }) },
    { id: id('emo'), icon: 'emoticon', label: 'Emoticons', onClick: () => setText(field, textOf(now(), field) + ' :)') },
    { id: id('blk'), icon: 'block', label: blocked ? 'Unblock' : 'Block', onClick: () => emit('ui.value', { id: id('block'), value: !blocked }), active: blocked },
  ]
  const menus = [
    { key: 'file', label: 'File', items: [{ label: 'Save As...', disabled: !msgs.length, onClick: () => messageBox({ title: 'Save As', icon: 'info', text: `The conversation was saved to my Documents\\${buddy} conversation.txt.` }) }, '-', { label: 'Close', onClick: () => closeWin(win.id) }] },
    { key: 'edit', label: 'Edit', items: [{ label: 'Clear Message', onClick: () => setText(field, '') }] },
    { key: 'actions', label: 'Actions', items: [{ label: blocked ? 'Unblock' : 'Block', onClick: () => emit('ui.value', { id: id('block'), value: !blocked }) }, { label: 'Send E-mail...', onClick: () => openWin(`compose:${Math.round(now() * 1000)}`, 'compose', { mode: 'new' }) }] },
    { key: 'help', label: 'Help', items: [{ label: 'Help Topics', onClick: () => openWin('help', 'help', { topic: 'sidebar' }) }] },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <AppTop id={id('m')} w={w} menus={menus} toolbar={toolbar} />
      <div onPointerDown={(e) => e.button === 0 && openWin(`compose:${Math.round(now() * 1000)}`, 'compose', { mode: 'new' })} style={{ position: 'absolute', left: 12, top: top + 8, fontFamily: FONT, fontSize: 11, color: '#5b7299', whiteSpace: 'nowrap' }}>
        To: <span style={{ fontFamily: HEAVY, color: '#2c6cc4' }}>{buddy}</span> <span style={{ color: '#8b91a6' }}>&lt;{emailOf(buddy)}&gt;</span>
      </div>
      <div style={{ position: 'absolute', left: 10, top: top + 28, width: w - 78, height: histH, borderRadius: 4, background: '#fff', boxShadow: `inset 0 0 0 1px ${C.borderLight}` }} />
      <ScrollView id={id('hist')} x={11} y={top + 29} w={w - 80} h={histH - 2}>
        <History buddy={buddy} msgs={msgs} me={me} w={w - 80} blocked={blocked} />
      </ScrollView>
      <div style={{ position: 'absolute', right: 10, top: top + 28 }}>
        <BuddyPic buddy={buddy} />
      </div>
      <div style={{ position: 'absolute', left: 12, top: top + 36 + histH, fontFamily: FONT, fontSize: 10, color: '#8b91a6', whiteSpace: 'nowrap' }}>
        {msgs.length ? `${msgs.length} message${msgs.length > 1 ? 's' : ''} sent. ${buddy} is away.` : `${buddy} is away.`}
      </div>
      <TextField id={field} x={10} y={top + 52 + histH} w={w - 78} h={64} multiline onEnter={send} />
      <Button id={id('send')} label="Send" isDefault x={w - 62} y={top + 52 + histH} w={52} h={64} disabled={!textOf(t, field).trim()} onClick={send} />
    </div>
  )
}

export default {
  id: 'im',
  title: (p) => `${p.buddy || 'Buddy'} - Conversation`,
  taskbarLabel: (p) => `${p.buddy || 'Buddy'} - Conversation`,
  icon: null,
  size: { w: 400, h: 430 },
  position: { x: 440, y: 150 },
  minSize: { w: 320, h: 320 },
  explorer: false,
  chromeTop: chromeTop(),
  background: '#f6f9fe',
  Content: scoped(IM, { watch: ['im'] }),
}
