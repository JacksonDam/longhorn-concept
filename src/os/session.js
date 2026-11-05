// Session helpers shared by the shell (desktop scene) and the session/login scene.
// Pure functions of (time, event log), like everything else.
//
//   currentUser(t) -> { id, name, picture, washed, email } | null
//       the user of the current session: the tile selected on the login screen when
//       'login.submit' happened (Sondra when nothing was selected, as in the video).
//       null before the first login and after 'session.logoff' / 'session.shutdown'.
//   wallpaper(t) -> { kind: 'photo' } | { kind: 'color', color: '#rrggbb' }
//       the desktop background, set by 'desk.wallpaper' { kind, color? } (Display Properties,
//       Control Panel > Display). Defaults to the Stonehenge photo.
//   WALLPAPERS: the choices offered by Display Properties.
//
// Events: 'login.select' { id } / 'login.submit' (login scene), 'session.logoff',
// 'session.switch', 'session.shutdown', 'desk.wallpaper' { kind, color }.
import { last } from '../core/events.js'
import { asset } from '../core/preload.js'
import { USERS } from '../scenes/login/state.js'

const byId = Object.fromEntries(USERS.map((u) => [u.id, u]))
const ENDS = new Set(['session.logoff', 'session.switch', 'session.shutdown'])

export const userPicture = (id) => asset(`img/login/users/${id}.webp`)
export const userPictureWashed = (id) => asset(`img/login/users/${id}-hover.webp`)

// the 'login.submit' event that started the current session (or null)
export function sessionEvent(t) {
  const submit = last(t, (e) => e.type === 'login.submit')
  if (!submit) return null
  const end = last(t, (e) => ENDS.has(e.type))
  return end && end.t >= submit.t ? null : submit
}

export function currentUser(t) {
  const submit = sessionEvent(t)
  if (!submit) return null
  const sel = last(submit.t, (e) => e.type === 'login.select' || e.type === 'login.deselect')
  const id = submit.user || (sel?.type === 'login.select' ? sel.id : null) || 'sondra'
  const u = byId[id] || byId.sondra
  return { id: u.id, name: u.name, email: u.email || `${u.id}@hotmail.com`, picture: userPicture(u.id), washed: userPictureWashed(u.id) }
}

export const WALLPAPERS = [
  { kind: 'photo', name: 'Stonehenge' },
  { kind: 'color', color: '#3a6ea5', name: 'Blue' },
  { kind: 'color', color: '#2b4f2b', name: 'Green' },
  { kind: 'color', color: '#5c3b6e', name: 'Plum' },
  { kind: 'color', color: '#7a5230', name: 'Desert' },
  { kind: 'color', color: '#000000', name: 'Black' },
]

export function wallpaper(t) {
  const e = last(t, (e) => e.type === 'desk.wallpaper')
  if (!e || e.kind !== 'color') return { kind: 'photo' }
  return { kind: 'color', color: e.color || '#3a6ea5' }
}
