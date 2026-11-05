// Helpers shared by the apps: opening windows, web links, message boxes, per-window events.
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { find } from '../../ui/state.js'
import { getWindow } from '../../os/wm.js'
import './benchScript.js'

// dev-only test hook: the app registry (tests swap Content for Proxy to check the copies' look);
// imported lazily, apps.js imports every app
if (import.meta.env.DEV && typeof window !== 'undefined') window.__apps = { app: async (id) => (await import('../../os/apps.js')).getApp(id) }

export const openWin = (id, app, props) => emit('win.open', props ? { id, app, props } : { id, app })
export const closeWin = (id) => emit('win.close', { id })
export const setProps = (id, props) => emit('win.props', { id, ...props })

// every web destination: Internet Explorer on its offline page, with the address in the bar
export const normUrl = (u) => {
  let s = String(u || '').trim()
  if (!s) return 'about:blank'
  if (/^[a-z]+:/i.test(s)) return s.replace(/\/$/, '')
  if (!/^www\./i.test(s) && /^[^.\s]+\.[a-z]{2,}/i.test(s)) s = 'www.' + s
  return 'http://' + s.replace(/\/$/, '') + '/'
}
export const openUrl = (url) => openWin('ie', 'ie', { url })

// a message box window (os app 'dialog'): buttons [{ label, emit?: [type, data] | [[type, data], ...], isDefault }]
let dlgN = 0
export function messageBox({ title = 'Windows', text, heading, icon = 'info', buttons = [{ label: 'OK', isDefault: true }] }) {
  const id = `dialog:${Math.round(now() * 1000)}:${dlgN++}`
  openWin(id, 'dialog', { title, text, heading, icon, buttons })
  return id
}

// events of `type` addressed to this window (e.id === win.id) since it opened, at or before t
export function winEvents(t, win, type) {
  const [a, i] = find(t, type, win.id)
  const out = []
  for (let j = 0; j <= i; j++) if (a[j].t >= win.openedAt) out.push(a[j])
  return out
}
export function lastWinEvent(t, win, type) {
  const [a, i] = find(t, type, win.id)
  return i >= 0 && a[i].t >= win.openedAt ? a[i] : null
}

export const isOpen = (id) => {
  const w = getWindow(now(), id)
  return !!w && w.state !== 'closed'
}

// short dates in the late-2003 setting
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
