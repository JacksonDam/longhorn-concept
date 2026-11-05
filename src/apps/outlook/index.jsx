// Inbox - Microsoft Outlook: folders, the message list (the sidebar's mail subjects), the reading
// pane; New / Reply / Reply to All / Forward open a compose window that "sends" into Sent Items.
// win.open { id: 'inbox', app: 'outlook', props: { message: <subject | index> } } shows that message.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, valueOf, find, lastOf, ListView, select, selectionOf, ContextMenu, contextHandler, TextField, textOf, Button, ScrollView, hoverKeys, pt, C, FONT, HEAVY } from '../../ui/index.js'
import { AppTop, appTopHeight, StatusBar } from '../lib/chrome.jsx'
import { Ico } from '../lib/icons.jsx'
import { openWin, closeWin, messageBox } from '../lib/common.js'
import { mailState, messageFor, FOLDERS } from './mail.js'

const NAV_W = 168
const LIST_W = 262

let composeN = 0
export const compose = (mode, ref) => openWin(`compose:${Math.round(now() * 1000)}:${composeN++}`, 'compose', { mode, ref })

const Envelope = ({ open }) =>
  open ? (
    <svg width="16" height="14" viewBox="0 0 16 14">
      <path d="M1 6 L8 1.5 L15 6 V13 H1 Z" fill="#f4f7fb" stroke="#8a9bb8" strokeWidth="0.8" />
      <path d="M1 6 L8 10 L15 6" fill="none" stroke="#8a9bb8" strokeWidth="0.8" />
    </svg>
  ) : (
    <svg width="16" height="12" viewBox="0 0 16 12">
      <rect x="0.5" y="0.5" width="15" height="11" rx="1" fill="#f6e9a8" stroke="#a88a2a" strokeWidth="0.8" />
      <path d="M1 1 L8 6.5 L15 1" fill="none" stroke="#a88a2a" strokeWidth="0.8" />
    </svg>
  )

const Row = memo(function Row({ m, unread, w }) {
  return (
    <div style={{ position: 'relative', width: w, height: 36, lineHeight: '15px', whiteSpace: 'nowrap' }}>
      <div style={{ position: 'absolute', left: 7, top: 4 }}>
        <Envelope open={!unread} />
      </div>
      <div style={{ position: 'absolute', left: 30, top: 3, width: w - 120, overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: unread ? HEAVY : FONT, fontSize: 11, color: '#2d3550' }}>{m.own ? `To: ${m.to || '(none)'}` : m.from}</div>
      <div style={{ position: 'absolute', right: 8, top: 3, fontFamily: FONT, fontSize: 10, color: '#8b91a6' }}>{m.when.replace(/^\w+ /, '')}</div>
      <div style={{ position: 'absolute', left: 30, top: 18, width: w - 40, overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: unread ? HEAVY : FONT, fontSize: 11, color: unread ? '#2c6cc4' : '#6a7088' }}>{m.subject}</div>
    </div>
  )
})

const Reading = memo(function Reading({ m, w }) {
  if (!m) return <div style={{ position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center', fontFamily: FONT, fontSize: 11, color: C.textDim }}>Select an item to read.</div>
  return (
    <div style={{ padding: '10px 14px', width: w - 30 }}>
      <div style={{ fontFamily: HEAVY, fontSize: 15, color: '#2d3550', lineHeight: '20px' }}>{m.subject}</div>
      <div style={{ fontFamily: FONT, fontSize: 11, color: '#3b7cc6', marginTop: 4 }}>
        {m.own ? 'Sondra' : m.from} <span style={{ color: '#8b91a6' }}>[{m.own ? 'sondra@hotmail.com' : m.addr}]</span>
      </div>
      <div style={{ fontFamily: FONT, fontSize: 10.5, color: '#8b91a6', marginTop: 2 }}>Sent: {m.when}</div>
      <div style={{ fontFamily: FONT, fontSize: 10.5, color: '#8b91a6' }}>To: {m.own ? m.to : 'Sondra'}</div>
      {m.cc && <div style={{ fontFamily: FONT, fontSize: 10.5, color: '#8b91a6' }}>Cc: {m.cc}</div>}
      <div style={{ height: 1, background: C.borderLight, margin: '10px 0' }} />
      <div style={{ fontFamily: FONT, fontSize: 11.5, lineHeight: '17px', color: '#2d3550', whiteSpace: 'pre-wrap' }}>{m.body}</div>
    </div>
  )
})

function NavPane({ win, t, folder, ms, top, h }) {
  const lit = hoverKeys(t, wid(win, 'nav:h'))
  const unreadIn = (k) => (k === 'unread' ? ms.folders.inbox : ms.folders[k] || []).filter((m) => ms.isUnread(m)).length
  const rows = [
    ['sub', 'Favorite Folders'],
    ['inbox', 'Inbox'],
    ['unread', 'Unread Mail'],
    ['sent', 'Sent Items'],
    ['sub', 'All Mail Folders'],
    ['root', 'Personal Folders'],
    ...FOLDERS.map((f) => ['f:' + f.key, f.label]),
  ]
  let y = top + 34
  return (
    <>
      <div style={{ position: 'absolute', left: 12, top: top + 8, fontFamily: FONT, fontSize: 17.5, fontWeight: 300, color: C.headingLight }}>
        my <span style={{ fontWeight: 500, color: C.heading }}>Mail</span>
      </div>
      {rows.map(([k, label], i) => {
        const yy = y
        y += k === 'sub' ? 22 : 19
        if (k === 'sub') return <div key={i} style={{ position: 'absolute', left: 12, top: yy + 5, fontFamily: HEAVY, fontSize: 10.5, color: '#5b7299' }}>{label}</div>
        const fk = k.startsWith('f:') ? k.slice(2) : k
        const indent = k === 'root' ? 18 : k.startsWith('f:') ? 34 : 18
        const n = k === 'root' ? 0 : unreadIn(fk)
        const on = fk === folder && k !== 'root'
        const l = lit.get(k) || 0
        return (
          <div
            key={i}
            style={{ position: 'absolute', left: 4, top: yy, width: NAV_W - 10, height: 18 }}
            onPointerEnter={(e) => emit('hover', { id: wid(win, 'nav:h'), key: k, on: true, ...pt(e) })}
            onPointerLeave={() => emit('hover', { id: wid(win, 'nav:h'), key: k, on: false })}
            onPointerDown={(e) => e.button === 0 && k !== 'root' && emit('ui.value', { id: wid(win, 'folder'), value: fk })}
          >
            {(on || l > 0) && <div style={{ position: 'absolute', inset: 0, borderRadius: 3, background: on ? C.rowSel : C.rowHover, opacity: on ? 1 : l, boxShadow: on ? `inset 0 0 0 1px ${C.rowSelEdge}` : 'none' }} />}
            <div style={{ position: 'absolute', left: indent - 14, top: 2 }}>
              <Ico kind={k === 'root' ? 'computer' : fk === 'inbox' || fk === 'unread' ? 'mailbig' : fk === 'deleted' ? 'recycle' : 'folder'} size={14} />
            </div>
            <div style={{ position: 'absolute', left: indent + 4, top: 0, lineHeight: '18px', fontFamily: n ? HEAVY : FONT, fontSize: 11, color: on ? '#1d3f78' : '#3a4260', whiteSpace: 'nowrap' }}>
              {label}
              {n > 0 && <span style={{ color: '#2c6cc4' }}> ({n})</span>}
            </div>
          </div>
        )
      })}
    </>
  )
}

function Outlook({ win, t, w, h, active }) {
  const id = (n) => wid(win, n)
  const ms = mailState(t)
  // the latest win.open on a message (sidebar) wins over the window's own folder / selection
  const [oa, oi] = find(t, 'win.open', win.id)
  const oe = oi >= 0 && oa[oi].t >= win.openedAt && oa[oi].props?.message != null ? oa[oi] : null
  const fe = lastOf(t, 'ui.value', id('folder'))
  let folder = fe ? fe.value : 'inbox'
  if (oe && (!fe || oe.t > fe.t)) folder = 'inbox'
  const listId = id('list:' + folder)
  const selE = lastOf(t, 'ui.value', listId + ':sel')
  let selKey = selE ? selE.value.keys[selE.value.keys.length - 1] : null
  const fromProps = oe && (!selE || oe.t > selE.t) && (!fe || oe.t > fe.t) ? messageFor(oe.props.message) : null
  if (fromProps) selKey = fromProps.key
  const finder = valueOf(t, id('find'), false)
  const q = finder ? textOf(t, id('q')).trim().toLowerCase() : ''
  const newest = valueOf(t, id('newest'), true)
  const reading = valueOf(t, id('reading'), true)
  let msgs = folder === 'unread' ? ms.folders.inbox.filter((m) => ms.isUnread(m)) : ms.folders[folder] || []
  if (q) msgs = msgs.filter((m) => (m.subject + ' ' + m.from + ' ' + m.body).toLowerCase().includes(q))
  if (!newest) msgs = [...msgs].reverse()
  const sel = selKey ? ms.byKey.get(selKey) : null
  const selIn = sel && msgs.some((m) => m.key === sel.key) ? sel : null
  const top = appTopHeight()
  const sbH = 20
  const listTop = top + 52 + (finder ? 26 : 0)
  const listW = reading ? LIST_W : w - NAV_W - 4
  const name = FOLDERS.find((f) => f.key === folder)?.label || (folder === 'unread' ? 'Unread Mail' : 'Inbox')
  const onSelect = (keys) => {
    const k = keys[keys.length - 1]
    const m = k && ms.byKey.get(k)
    if (m && ms.isUnread(m)) emit('mail.read', { key: k })
  }
  const del = (m) => m && emit('mail.delete', { key: m.key, from: folder })
  const reply = (mode) => selIn && compose(mode, selIn.key)
  const sendRecv = () =>
    messageBox({
      title: 'Outlook Send/Receive Progress',
      icon: 'error',
      text: "Task 'Hotmail - Sending and Receiving' reported error (0x800CCC0E): 'Outlook cannot connect to your mail server. The network cable is unplugged.'",
    })
  const toolbar = [
    { id: id('new'), icon: 'newmail', label: 'New', onClick: () => compose('new') },
    { id: id('print'), icon: 'print', onClick: () => noPrinter(), tip: 'Print' },
    { id: id('del'), icon: 'del', onClick: () => del(selIn), disabled: !selIn, tip: 'Delete' },
    '|',
    { id: id('reply'), icon: 'reply', label: 'Reply', onClick: () => reply('reply'), disabled: !selIn },
    { id: id('replyall'), icon: 'replyall', label: 'Reply to All', onClick: () => reply('replyall'), disabled: !selIn },
    { id: id('fwd'), icon: 'fwd', label: 'Forward', onClick: () => reply('forward'), disabled: !selIn },
    '|',
    { id: id('sr'), icon: 'sendrecv', label: 'Send/Receive', onClick: sendRecv },
    { id: id('findb'), icon: 'find', label: 'Find', onClick: () => emit('ui.value', { id: id('find'), value: !finder }), active: finder },
  ]
  const goF = (k) => () => emit('ui.value', { id: id('folder'), value: k })
  const menus = [
    { key: 'file', label: 'File', items: [{ label: 'New', items: [{ label: 'Mail Message', shortcut: 'Ctrl+N', onClick: () => compose('new') }] }, { label: 'Open', disabled: !selIn, onClick: () => selIn && openWin('read:' + selIn.key, 'compose', { mode: 'read', ref: selIn.key }) }, '-', { label: 'Print...', onClick: noPrinter }, '-', { label: 'Work Offline', checked: true, onClick: sendRecv }, { label: 'Exit', onClick: () => closeWin(win.id) }] },
    { key: 'edit', label: 'Edit', items: [{ label: 'Delete', shortcut: 'Ctrl+D', disabled: !selIn, onClick: () => del(selIn) }, '-', { label: 'Mark as Read', disabled: !selIn, onClick: () => selIn && emit('mail.read', { key: selIn.key }) }, { label: 'Mark as Unread', disabled: !selIn, onClick: () => selIn && emit('mail.unread', { key: selIn.key }) }, '-', { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => select(listId, msgs.map((m) => m.key)) }] },
    { key: 'view', label: 'View', items: [{ label: 'Reading Pane', checked: reading, onClick: () => emit('ui.value', { id: id('reading'), value: !reading }) }, '-', { label: 'Newest on Top', radio: newest, onClick: () => emit('ui.value', { id: id('newest'), value: true }) }, { label: 'Oldest on Top', radio: !newest, onClick: () => emit('ui.value', { id: id('newest'), value: false }) }] },
    { key: 'go', label: 'Go', items: FOLDERS.map((f) => ({ label: f.label, radio: folder === f.key, onClick: goF(f.key) })) },
    { key: 'tools', label: 'Tools', items: [{ label: 'Send/Receive', shortcut: 'F9', onClick: sendRecv }, { label: 'Find', checked: finder, onClick: () => emit('ui.value', { id: id('find'), value: !finder }) }, '-', { label: 'Empty "Deleted Items" Folder', disabled: !ms.folders.deleted.length, onClick: () => ms.folders.deleted.forEach((m) => emit('mail.purge', { key: m.key })) }] },
    { key: 'actions', label: 'Actions', items: [{ label: 'New Mail Message', onClick: () => compose('new') }, '-', { label: 'Reply', disabled: !selIn, onClick: () => reply('reply') }, { label: 'Reply to All', disabled: !selIn, onClick: () => reply('replyall') }, { label: 'Forward', disabled: !selIn, onClick: () => reply('forward') }] },
    { key: 'help', label: 'Help', items: [{ label: 'Microsoft Office Outlook Help', onClick: () => openWin('help', 'help', { topic: 'mail' }) }, '-', { label: 'About Microsoft Office Outlook', onClick: () => messageBox({ title: 'About Microsoft Office Outlook', icon: 'info', text: 'Microsoft® Office Outlook® 2003\nPart of Microsoft Office Professional Edition 2003\nCopyright © 1995-2003 Microsoft Corporation.' }) }] },
  ]
  const ctxItems = () => {
    const k = selectionOf(now(), listId)
    const m = k.length ? ms.byKey.get(k[k.length - 1]) : null
    if (!m) return [{ label: 'New Mail Message', onClick: () => compose('new') }]
    const base = [
      { label: 'Open', bold: true, onClick: () => openWin('read:' + m.key, 'compose', { mode: 'read', ref: m.key }) },
      { label: 'Print', onClick: noPrinter },
      '-',
      { label: 'Reply', onClick: () => compose('reply', m.key) },
      { label: 'Reply to All', onClick: () => compose('replyall', m.key) },
      { label: 'Forward', onClick: () => compose('forward', m.key) },
      '-',
      ms.isUnread(m) ? { label: 'Mark as Read', onClick: () => emit('mail.read', { key: m.key }) } : { label: 'Mark as Unread', onClick: () => emit('mail.unread', { key: m.key }) },
    ]
    if (folder === 'deleted') return [...base, '-', { label: 'Move to Inbox', onClick: () => emit('mail.restore', { key: m.key }) }, { label: 'Delete', onClick: () => emit('mail.purge', { key: m.key }) }]
    if (folder === 'drafts') return [{ label: 'Open Draft', bold: true, onClick: () => openWin('draft:' + m.key, 'compose', { mode: 'draft', ref: m.key }) }, '-', { label: 'Delete', onClick: () => del(m) }]
    return [...base, { label: 'Delete', onClick: () => del(m) }]
  }
  const unreadCount = msgs.filter((m) => ms.isUnread(m)).length
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <AppTop id={id('m')} w={w} menus={menus} toolbar={toolbar} />
      <div style={{ position: 'absolute', left: 0, top, width: NAV_W, height: h - top - sbH, background: 'linear-gradient(90deg, rgba(225,235,250,0.6), rgba(240,246,255,0.3))', boxShadow: `inset -1px 0 0 ${C.borderLight}` }} />
      <NavPane win={win} t={t} folder={folder} ms={ms} top={top} h={h} />
      <div style={{ position: 'absolute', left: NAV_W + 10, top: top + 6, fontFamily: FONT, fontSize: 17.5, fontWeight: 500, color: C.heading, whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ position: 'absolute', left: NAV_W + 10, top: top + 32, fontFamily: FONT, fontSize: 10.5, color: '#8b91a6', whiteSpace: 'nowrap' }} onPointerDown={(e) => e.button === 0 && emit('ui.value', { id: id('newest'), value: !newest })}>
        Arranged By: <span style={{ color: '#5b7299', fontWeight: 560 }}>Date</span>
        <span style={{ marginLeft: 30, color: '#5b7299' }}>{newest ? 'Newest on top' : 'Oldest on top'} {'▾'}</span>
      </div>
      {finder && (
        <>
          <div style={{ position: 'absolute', left: NAV_W + 10, top: top + 54, fontFamily: FONT, fontSize: 10.5, color: '#5b7299' }}>Look for:</div>
          <TextField id={id('q')} x={NAV_W + 60} y={top + 51} w={listW - 130} h={18} size={10.5} />
          <Button id={id('qclear')} label="Clear" x={NAV_W + listW - 64} y={top + 50} w={56} h={20} onClick={() => emit('ui.value', { id: id('q'), value: { text: '', a: 0, b: 0, sx: 0, sy: 0 } })} />
        </>
      )}
      <ListView
        key={folder}
        id={listId}
        x={NAV_W + 4}
        y={listTop}
        w={listW}
        h={h - listTop - sbH - 2}
        rowH={36}
        multi
        active={active}
        items={msgs.map((m) => ({ key: m.key, cells: [<Row key="r" m={m} unread={ms.isUnread(m)} w={listW - 22} />] }))}
        onSelect={onSelect}
        selected={fromProps ? [fromProps.key] : undefined}
        onOpen={(it) => openWin((folder === 'drafts' ? 'draft:' : 'read:') + it.key, 'compose', { mode: folder === 'drafts' ? 'draft' : 'read', ref: it.key })}
        onContext={contextHandler(id('ctx'), ctxItems)}
        emptyText={`There are no items to show in this view.`}
      />
      {reading && (
        <>
          <div style={{ position: 'absolute', left: NAV_W + LIST_W + 6, top: top + 4, width: w - NAV_W - LIST_W - 10, height: h - top - sbH - 8, borderRadius: 4, background: '#fff', boxShadow: `inset 0 0 0 1px ${C.borderLight}` }} />
          <ScrollView key={selIn?.key || 'none'} id={id('read:' + (selIn?.key || ''))} x={NAV_W + LIST_W + 7} y={top + 5} w={w - NAV_W - LIST_W - 12} h={h - top - sbH - 10}>
            <Reading m={selIn} w={w - NAV_W - LIST_W - 12} />
          </ScrollView>
        </>
      )}
      <StatusBar y={h - sbH} w={w} left={<span>{msgs.length} Items{unreadCount ? `, ${unreadCount} Unread` : ''}</span>} right={<span>Offline</span>} />
      <ContextMenu id={id('ctx')} items={ctxItems} />
    </div>
  )
}

const noPrinter = () => messageBox({ title: 'Print', icon: 'warning', text: 'Windows cannot print because no printer is installed.\nTo add a printer, open Printers and Faxes in Control Panel.' })

export default {
  id: 'outlook',
  title: () => 'Inbox - Microsoft Outlook',
  taskbarLabel: () => 'Inbox - Microsoft Outlook',
  icon: null,
  size: { w: 760, h: 530 },
  position: { x: 50, y: 40 },
  minSize: { w: 600, h: 380 },
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(Outlook, { watch: ['mail'] }),
}
