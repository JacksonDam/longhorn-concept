// An Outlook message window: compose (New / Reply / Reply to All / Forward / a saved draft) or
// read a message (props.mode 'read'). Send logs 'mail.send' (the message appears in Sent Items),
// Save logs 'mail.draft' (Drafts).
//   win.open { id: 'compose:<n>', app: 'compose', props: { mode, ref } }
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, TextField, textOf, C, FONT } from '../../ui/index.js'
import { AppTop, appTopHeight, chromeTop } from '../lib/chrome.jsx'
import { closeWin, messageBox, openWin } from '../lib/common.js'
import { mailState, INBOX } from '../outlook/mail.js'
import { userName } from '../lib/user.js'

const PREFIX = { reply: 'RE: ', replyall: 'RE: ', forward: 'FW: ' }

function initial(mode, m) {
  if (!m) return { to: '', cc: '', subject: '', body: '' }
  if (mode === 'read' || mode === 'draft') return { to: m.own ? m.to : 'Sondra', cc: m.cc || '', subject: m.subject, body: m.body }
  const quote = `\n\n-----Original Message-----\nFrom: ${m.from}\nSent: ${m.when}\nTo: Sondra\nSubject: ${m.subject}\n\n${m.body}`
  return { to: mode === 'forward' ? '' : m.addr, cc: '', subject: PREFIX[mode] + m.subject, body: quote }
}

function stamp() {
  const d = new Date()
  let hh = d.getHours() % 12
  if (!hh) hh = 12
  return `Wed 11/5/2003 ${hh}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`
}

function Compose({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const mode = win.props?.mode || 'new'
  const ms = mailState(t)
  const m = win.props?.ref ? ms.byKey.get(win.props.ref) || INBOX.find((x) => x.key === win.props.ref) : null
  const init = initial(mode, m)
  const read = mode === 'read'
  const now4 = () => ({ to: textOf(now(), id('to'), init.to), cc: textOf(now(), id('cc'), init.cc), subject: textOf(now(), id('subject'), init.subject), body: textOf(now(), id('body'), init.body) })
  const send = () => {
    const v = now4()
    if (!v.to.trim() && !v.cc.trim()) {
      messageBox({ title: 'Microsoft Office Outlook', icon: 'warning', text: 'There must be at least one name or distribution list in the To, Cc, or Bcc box.' })
      return
    }
    emit('mail.send', { ...v, when: stamp(), fromName: userName(now()), draftKey: mode === 'draft' ? m?.key : undefined })
    closeWin(win.id)
  }
  const save = () => emit('mail.draft', { ...now4(), when: stamp(), draftKey: mode === 'draft' ? m?.key : undefined })
  const close = () => {
    const v = now4()
    const dirty = !read && (v.to !== init.to || v.cc !== init.cc || v.subject !== init.subject || v.body !== init.body)
    if (!dirty) return closeWin(win.id)
    messageBox({
      title: 'Microsoft Office Outlook',
      icon: 'question',
      text: 'Do you want to save changes?',
      buttons: [
        { label: 'Yes', isDefault: true, emit: [['mail.draft', { ...v, when: stamp() }], ['win.close', { id: win.id }]] },
        { label: 'No', emit: ['win.close', { id: win.id }] },
        { label: 'Cancel' },
      ],
    })
  }
  const reply = (md) => openWin(`compose:${Math.round(now() * 1000)}`, 'compose', { mode: md, ref: m?.key })
  const toolbar = read
    ? [
        { id: id('reply'), icon: 'reply', label: 'Reply', onClick: () => reply('reply'), disabled: !m || m.own },
        { id: id('replyall'), icon: 'replyall', label: 'Reply to All', onClick: () => reply('replyall'), disabled: !m || m.own },
        { id: id('fwd'), icon: 'fwd', label: 'Forward', onClick: () => reply('forward'), disabled: !m },
        '|',
        { id: id('del'), icon: 'del', tip: 'Delete', onClick: () => m && (emit('mail.delete', { key: m.key }), closeWin(win.id)), disabled: !m },
      ]
    : [
        { id: id('send'), icon: 'send', label: 'Send', onClick: send },
        { id: id('save'), icon: 'save', tip: 'Save', onClick: save },
        '|',
        { id: id('attach'), icon: 'attach', label: 'Attach', onClick: () => messageBox({ title: 'Insert File', icon: 'info', text: 'Attachments can be added from my Documents.\nOpen my Documents, then drag a file into the message.' }) },
      ]
  const menus = [
    { key: 'file', label: 'File', items: read ? [{ label: 'Close', onClick: () => closeWin(win.id) }] : [{ label: 'Send', shortcut: 'Alt+S', onClick: send }, { label: 'Save', shortcut: 'Ctrl+S', onClick: save }, '-', { label: 'Close', onClick: close }] },
    { key: 'edit', label: 'Edit', items: [{ label: 'Undo', shortcut: 'Ctrl+Z', disabled: true }, '-', { label: 'Cut', shortcut: 'Ctrl+X', disabled: true }, { label: 'Copy', shortcut: 'Ctrl+C', disabled: true }, { label: 'Paste', shortcut: 'Ctrl+V', disabled: true }] },
    { key: 'help', label: 'Help', items: [{ label: 'Microsoft Office Outlook Help', onClick: () => openWin('help', 'help', { topic: 'mail' }) }] },
  ]
  const top = appTopHeight()
  const row = (y, label, name) => (
    <>
      <div style={{ position: 'absolute', left: 12, top: y, width: 60, lineHeight: '20px', fontFamily: FONT, fontSize: 11, color: '#5b7299' }}>{label}</div>
      <TextField id={id(name)} def={init[name]} x={76} y={y} w={w - 90} h={20} readOnly={read} />
    </>
  )
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <AppTop id={id('m')} w={w} menus={menus} toolbar={toolbar} />
      {read && m && <div style={{ position: 'absolute', left: 12, top: top + 6, fontFamily: FONT, fontSize: 10.5, color: '#8b91a6' }}>From: {m.own ? 'Sondra' : `${m.from} [${m.addr}]`}    Sent: {m.when}</div>}
      {row(top + (read ? 24 : 10), read ? 'To:' : 'To...', 'to')}
      {row(top + (read ? 48 : 34), read ? 'Cc:' : 'Cc...', 'cc')}
      {row(top + (read ? 72 : 58), 'Subject:', 'subject')}
      <TextField id={id('body')} def={init.body} x={12} y={top + (read ? 100 : 86)} w={w - 26} h={h - top - (read ? 112 : 98)} multiline readOnly={read} size={11.5} lineHeight={17} pad={8} />
    </div>
  )
}

export default {
  id: 'compose',
  title: (p) => {
    const m = p.ref ? INBOX.find((x) => x.key === p.ref) : null
    if (p.mode === 'read') return `${m ? m.subject : 'Message'} - Message`
    if (m && PREFIX[p.mode]) return `${PREFIX[p.mode]}${m.subject} - Message`
    return 'Untitled - Message'
  },
  taskbarLabel: (p) => (p.mode === 'read' ? 'Message' : 'Untitled - Message'),
  icon: null,
  size: { w: 560, h: 430 },
  position: { x: 150, y: 90 },
  minSize: { w: 420, h: 300 },
  explorer: false,
  chromeTop: chromeTop(),
  background: '#f6f9fe',
  Content: scoped(Compose, { watch: ['mail'] }),
}
