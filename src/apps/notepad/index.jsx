// Notepad: plain text in a TextField filling the window; Format > Word Wrap, Edit > Time/Date,
// File > Save logs 'notepad.save' (the title loses its modified mark).
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, valueOf, lastOf, find, TextField, textOf, setText, focusField, C } from '../../ui/index.js'
import { AppTop, appTopHeight, StatusBar } from '../lib/chrome.jsx'
import { closeWin, openWin, messageBox } from '../lib/common.js'

function Notepad({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const field = id('text')
  const wrap = valueOf(t, id('wrap'), true)
  const status = valueOf(t, id('status'), false)
  const te = lastOf(t, 'ui.value', field)
  const [sa, si] = find(t, 'notepad.save', win.id)
  const saved = si >= 0 && sa[si].t >= win.openedAt ? sa[si] : null
  const dirty = !!te && (!saved || te.t > saved.t)
  const text = textOf(t, field)
  const save = () => emit('notepad.save', { id: win.id, name: 'Untitled.txt' })
  const close = () => {
    if (!dirty) return closeWin(win.id)
    messageBox({
      title: 'Notepad',
      icon: 'warning',
      text: 'The text in the Untitled file has changed.\n\nDo you want to save the changes?',
      buttons: [
        { label: 'Yes', isDefault: true, emit: [['notepad.save', { id: win.id, name: 'Untitled.txt' }], ['win.close', { id: win.id }]] },
        { label: 'No', emit: ['win.close', { id: win.id }] },
        { label: 'Cancel' },
      ],
    })
  }
  const menus = [
    { key: 'file', label: 'File', items: [{ label: 'New', shortcut: 'Ctrl+N', onClick: () => setText(field, '') }, { label: 'Open...', onClick: () => openWin('documents', 'documents') }, { label: 'Save', shortcut: 'Ctrl+S', onClick: save }, '-', { label: 'Exit', onClick: close }] },
    {
      key: 'edit',
      label: 'Edit',
      items: [
        { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => focusField(field) },
        { label: 'Time/Date', shortcut: 'F5', onClick: () => setText(field, textOf(now(), field) + '11:31 AM 11/5/2003') },
      ],
    },
    { key: 'format', label: 'Format', items: [{ label: 'Word Wrap', checked: wrap, onClick: () => emit('ui.value', { id: id('wrap'), value: !wrap }) }] },
    { key: 'view', label: 'View', items: [{ label: 'Status Bar', checked: status, onClick: () => emit('ui.value', { id: id('status'), value: !status }) }] },
    { key: 'help', label: 'Help', items: [{ label: 'Help Topics', onClick: () => openWin('help', 'help') }, '-', { label: 'About Notepad', onClick: () => messageBox({ title: 'About Notepad', icon: 'info', text: 'Microsoft® Notepad\nVersion 5.1\nCopyright © 1981-2003 Microsoft Corporation' }) }] },
  ]
  const top = appTopHeight({ toolbar: false })
  const sbH = status ? 20 : 0
  const lines = text.split('\n')
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff' }}>
      <AppTop id={id('m')} w={w} menus={menus} />
      <TextField
        key={wrap ? 'wrap' : 'nowrap'}
        id={field}
        x={0}
        y={top}
        w={w}
        h={h - top - sbH}
        multiline
        variant="bare"
        size={13}
        lineHeight={16}
        pad={6}
        fontFamily="'Lucida Console', 'Courier New', monospace"
        style={{ background: '#fff', whiteSpace: wrap ? undefined : 'pre' }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault()
            save()
          }
        }}
      />
      {status && <StatusBar y={h - 20} w={w} left={<span>{dirty ? 'Modified' : saved ? 'Saved' : ''}</span>} right={<span>Ln {lines.length}, Col {lines[lines.length - 1].length + 1}</span>} />}
      {void C}
    </div>
  )
}

export default {
  id: 'notepad',
  title: () => 'Untitled - Notepad',
  taskbarLabel: () => 'Untitled - Notepad',
  icon: null,
  size: { w: 500, h: 380 },
  position: { x: 200, y: 110 },
  minSize: { w: 300, h: 200 },
  explorer: false,
  background: '#ffffff',
  Content: scoped(Notepad, { watch: ['notepad'] }),
}
