// A message box window: win.open { id: 'dialog:<anything>', app: 'dialog', props: { title, text,
// heading?, icon: 'info' | 'warning' | 'error' | 'question' | 'cd', buttons: [{ label, isDefault,
// emit: [type, data] | [[type, data], ...] }] } }. Every button closes the box after emitting.
// The box sizes to its text (ui/Dialog's layout): 400 px wide (wider for a long heading), as tall
// as the wrapped text needs, 176 px at least.
import { emit } from '../../core/events.js'
import { scoped, Dialog, wrapLines, textWidth, FONT } from '../../ui/index.js'
import { TITLE_H } from '../../os/PlexWindow.jsx'
import { closeWin } from '../lib/common.js'

function MessageBox({ win }) {
  const p = win.props || {}
  const buttons = (p.buttons && p.buttons.length ? p.buttons : [{ label: 'OK', isDefault: true }]).map((b) => ({
    label: b.label,
    isDefault: b.isDefault,
    onClick: () => {
      const list = b.emit ? (Array.isArray(b.emit[0]) ? b.emit : [b.emit]) : []
      for (const [type, data] of list) emit(type, data || {})
      closeWin(win.id)
    },
  }))
  return <Dialog id={win.id} icon={p.icon || 'info'} heading={p.heading} text={p.text || ''} buttons={buttons} />
}

// ui/Dialog: icon and text from 20 px down, the text column from x 76 to 20 px from the right
// (11.5 px lines of 16 px), the heading (17 px light, ~21 px line + 6 px margin) above it, the
// buttons (23 px) 14 px from the bottom
const W = 400
const MIN_H = 176
const sizeCache = new Map()
function size(p) {
  // (keyed by the text's measured width too, so a size measured before the face loaded isn't kept)
  const key = (p.heading || '') + '\u0001' + (p.text || '') + '\u0001' + textWidth(p.text || '', { size: 11.5, f: FONT })
  let s = sizeCache.get(key)
  if (s) return s
  const head = p.heading ? textWidth(p.heading, { size: 17, w: 300, f: FONT }) : 0
  const w = Math.min(560, Math.max(W, Math.ceil(head + 96)))
  const lines = p.text ? wrapLines(p.text, w - 96 - 1, { size: 11.5, f: FONT }).length : 0
  const body = Math.max(40, (p.heading ? 27 : 0) + lines * 16)
  s = { w, h: Math.max(MIN_H, Math.ceil(TITLE_H + 20 + body + 16 + 23 + 14)) }
  if (sizeCache.size > 200) sizeCache.clear()
  sizeCache.set(key, s)
  return s
}

export default {
  id: 'dialog',
  title: (p) => p.title || 'Windows',
  taskbarLabel: (p) => p.title || 'Windows',
  icon: null,
  size,
  // (a tall box moves up so it stays above the taskbar)
  position: (p, s) => ({ x: 230, y: Math.max(40, Math.min(250, 690 - s.h)) }),
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(MessageBox, {}),
}
