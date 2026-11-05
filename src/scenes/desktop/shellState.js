// Shell UI state from the event log: which popup (Start menu, menus, flyouts) is open,
// the sidebar's visibility, hover levels.
//
// Events:
//   'shell.popup'   { id, open, x?, y?, data? }  open / close a popup. Only one popup is open at
//                   a time: opening one closes the others (each animates out from that moment).
//   'shell.sidebar' { visible }                 the clock chevron hides / shows the sidebar
//   'shell.check'   { id, value }               menu check / radio state (e.g. Arrange Icons By)
//   'desk.refresh'                               desktop context menu > Refresh
import { emit, last, all } from '../../core/events.js'
import { now, FPS } from '../../core/clock.js'
import { clamp } from '../../core/anim.js'

const isPopup = (e) => e.type === 'shell.popup'

// { open, at (time of the last change for this popup), data (the opening event) }
export function popupState(t, id) {
  const e = last(t, isPopup)
  if (!e) return { open: false, at: -Infinity, data: null }
  if (e.open && e.id === id) return { open: true, at: e.t, data: e }
  const o = last(t, (ev) => isPopup(ev) && ev.open && ev.id === id)
  if (!o) return { open: false, at: -Infinity, data: null }
  // it closed at the first popup event after it opened
  let closedAt = e.t
  for (const ev of all(t, isPopup)) {
    if (ev.t > o.t || (ev.t === o.t && ev !== o && ev.id !== id)) {
      closedAt = ev.t
      break
    }
  }
  return { open: false, at: closedAt, data: o }
}

export function openPopupId(t) {
  const e = last(t, isPopup)
  return e && e.open ? e.id : null
}

export function openPopup(id, extra) {
  emit('shell.popup', { id, open: true, ...extra })
}
export function closePopups() {
  const id = openPopupId(now())
  if (id) emit('shell.popup', { id, open: false })
}
export function togglePopup(id, extra) {
  if (openPopupId(now()) === id) closePopups()
  else openPopup(id, extra)
}

export function sidebarVisible(t) {
  const e = last(t, (e) => e.type === 'shell.sidebar')
  return { visible: e ? !!e.visible : true, at: e ? e.t : -Infinity }
}
export function toggleSidebar() {
  emit('shell.sidebar', { visible: !sidebarVisible(now()).visible })
}

export function checkValue(t, id, def) {
  const e = last(t, (e) => e.type === 'shell.check' && e.id === id)
  return e ? e.value : def
}

// a hover level in [0, 1] for 'hover' events with this id (fades over fin / fout frames)
export function hover(t, id, fin = 1.5, fout = 2) {
  const e = last(t, (e) => e.type === 'hover' && e.id === id)
  if (!e) return 0
  const df = (t - e.t) * FPS
  if (e.on) return clamp(df / fin)
  const on = last(e.t - 1e-9, (x) => x.type === 'hover' && x.id === id)
  const reached = on?.on ? clamp(((e.t - on.t) * FPS) / fin) : 0
  return reached * (1 - clamp(df / fout))
}
export const hoverOn = (id) => () => emit('hover', { id, on: true })
export const hoverOff = (id) => () => emit('hover', { id, on: false })
