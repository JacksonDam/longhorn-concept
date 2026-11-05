// Login scene state derived from the event log at time t (pure function of time + events).
//
// Events (emitted by real input and by demo/login.js):
//   login.hover    { id, on, big }  pointer entered/left a user tile (big: the enlarged hover)
//   login.select   { id }           a user tile was clicked
//   login.deselect {}               Escape / click on the background
//   login.pw       { len }          password length after a key press
//   login.submit   { id }           Enter / go button (logs in as the selected user)
// Each visit to the login screen (start, log off, switch user, boot) starts afresh: only events
// since the current login screen began count (os/session.js loginSince).
import { all, last } from '../../core/events.js'
import { USERS, loginSince } from '../../os/session.js'

export { USERS }
export const userById = Object.fromEntries(USERS.map((u) => [u.id, u]))

const isSel = (e) => e.type === 'login.select' || e.type === 'login.deselect'

// The selection timeline: [{ t, id|null }] in order (consecutive duplicates dropped).
export function selections(t) {
  const out = []
  const since = loginSince(t)
  for (const e of all(t, (e) => isSel(e) && e.t >= since)) {
    const id = e.type === 'login.select' ? e.id : null
    if (out.length && out[out.length - 1].id === id) continue
    out.push({ t: e.t, id })
  }
  return out
}

export function currentSelection(t) {
  const s = selections(t)
  return s.length ? s[s.length - 1] : { t: -Infinity, id: null }
}

// Hover state of tile `id` at t: { on, big, t } (t = time of the last change)
export function hoverOf(t, id) {
  const since = loginSince(t)
  const e = last(t, (e) => e.type === 'login.hover' && e.id === id && e.t >= since)
  return e ? { on: !!e.on, big: !!e.big, t: e.t } : { on: false, big: false, t: -Infinity }
}

// Password length typed since the current selection.
export function passwordLength(t) {
  const sel = currentSelection(t)
  const e = last(t, (e) => e.type === 'login.pw' && e.t >= sel.t)
  return e ? e.len : 0
}

export function submitEvent(t) {
  const since = loginSince(t)
  return last(t, (e) => e.type === 'login.submit' && e.t >= since)
}

// hover events of tile `id` on the current login screen
export function hoversOf(t, id) {
  const since = loginSince(t)
  return all(t, (e) => e.type === 'login.hover' && e.id === id && e.t >= since)
}
