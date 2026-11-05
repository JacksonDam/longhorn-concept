// A message box window: win.open { id: 'dialog:<anything>', app: 'dialog', props: { title, text,
// heading?, icon: 'info' | 'warning' | 'error' | 'question' | 'cd', buttons: [{ label, isDefault,
// emit: [type, data] | [[type, data], ...] }] } }. Every button closes the box after emitting.
import { emit } from '../../core/events.js'
import { scoped, Dialog } from '../../ui/index.js'
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

export default {
  id: 'dialog',
  title: (p) => p.title || 'Windows',
  taskbarLabel: (p) => p.title || 'Windows',
  icon: null,
  size: { w: 400, h: 176 },
  position: { x: 230, y: 250 },
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(MessageBox),
}
