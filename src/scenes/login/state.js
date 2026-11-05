// Login scene state derived from the event log at time t (pure function of time + events).
//
// Events (emitted by real input and by demo/login.js):
//   login.hover    { id, on, big }  pointer entered/left a user tile (big: the enlarged hover)
//   login.select   { id }           a user tile was clicked
//   login.deselect {}               Escape / click on the background
//   login.pw       { len }          password length after a key press
//   login.submit   {}               Enter / go button
import { all, last } from '../../core/events.js'

export const USERS = [
  { id: 'jenny', name: 'Jenny' },
  { id: 'sondra', name: 'Sondra', email: 'sondra_hsm@hotmail.com' },
  { id: 'tommy', name: 'Tommy' },
  { id: 'kelly', name: 'Kelly' },
  { id: 'angela', name: 'Angela' },
]
export const userById = Object.fromEntries(USERS.map((u) => [u.id, u]))

const isSel = (e) => e.type === 'login.select' || e.type === 'login.deselect'

// The selection timeline: [{ t, id|null }] in order (consecutive duplicates dropped).
export function selections(t) {
  const out = []
  for (const e of all(t, isSel)) {
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
  const e = last(t, (e) => e.type === 'login.hover' && e.id === id)
  return e ? { on: !!e.on, big: !!e.big, t: e.t } : { on: false, big: false, t: -Infinity }
}

// Password length typed since the current selection.
export function passwordLength(t) {
  const sel = currentSelection(t)
  const e = last(t, (e) => e.type === 'login.pw' && e.t >= sel.t)
  return e ? e.len : 0
}

export function submitEvent(t) {
  return last(t, (e) => e.type === 'login.submit')
}
