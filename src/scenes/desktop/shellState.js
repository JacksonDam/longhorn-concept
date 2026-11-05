// Shell UI state from the event log: which popup (Start menu, menus, flyouts) is open,
// the sidebar's visibility, hover levels.
//
// Events:
//   'shell.popup'   { id, open, x?, y?, data? }  open / close a popup. Only one popup is open at
//                   a time: opening one closes the others (each animates out from that moment).
//   'shell.sidebar' { visible }                 the clock chevron hides / shows the sidebar
//   'desk.refresh'                               desktop context menu > Refresh
import { emit } from '../../core/events.js'
import { now, FPS } from '../../core/clock.js'
import { clamp } from '../../core/anim.js'
import { lastOfType, firstAfter } from '../../os/logIndex.js'

const CLOSED = { open: false, at: -Infinity, data: null }

// Shell state counts from the start of the current desktop session (the desktop stays mounted
// across logins): DesktopScene sets the floor every render.
let floor = -Infinity
export function setSessionFloor(t0) {
  floor = t0
}
export const sessionFloor = () => floor
const inSession = (e) => (e && e.t >= floor ? e : null)

// { open, at (time of the last change for this popup), data (the opening event) }
export function popupState(t, id) {
  const e = inSession(lastOfType(t, 'shell.popup'))
  if (!e) return CLOSED
  if (e.open && e.id === id) return { open: true, at: e.t, data: e }
  const o = inSession(lastOfType(t, 'shell.popup', id, (ev) => ev.open))
  if (!o) return CLOSED
  // it closed at the first popup event after it opened
  const c = firstAfter(o.t, t, 'shell.popup')
  return { open: false, at: c ? c.t : e.t, data: o }
}

export function openPopupId(t) {
  const e = inSession(lastOfType(t, 'shell.popup'))
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
  const e = inSession(lastOfType(t, 'shell.sidebar'))
  return { visible: e ? !!e.visible : true, at: e ? e.t : -Infinity }
}
export function toggleSidebar() {
  emit('shell.sidebar', { visible: !sidebarVisible(now()).visible })
}

// a hover level in [0, 1] for 'hover' events with this id (fades over fin / fout frames)
export function hover(t, id, fin = 1.5, fout = 2) {
  const e = inSession(lastOfType(t, 'hover', id))
  if (!e) return 0
  const df = (t - e.t) * FPS
  if (e.on) return clamp(df / fin)
  const on = lastOfType(e.t - 1e-9, 'hover', id)
  const reached = on?.on ? clamp(((e.t - on.t) * FPS) / fin) : 0
  return reached * (1 - clamp(df / fout))
}
export const hoverOn = (id) => () => emit('hover', { id, on: true })
export const hoverOff = (id) => () => emit('hover', { id, on: false })
