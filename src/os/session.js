// Session: who is logged in, which screen the OS shows, and the desktop wallpaper, derived from
// the event log (pure functions of time + events, like everything else). Shared by the login /
// session scenes (owner: login builder) and the shell (desktop builder).
//
// Events
//   'login.select' { id } / 'login.submit' { id }  log in as user id (the login scene; the video's
//                              demo submits as Sondra; no id: the selected tile, else Sondra)
//   'session.logoff'   {}      end the session, back to the login screen (windows close, see wm.js)
//   'session.switch'   {}      Switch User: back to the login screen
//   'session.shutdown' {}      from the login screen or the desktop: shutting-down sequence, then off
//   'session.boot'     {}      from the off screen: boot sequence, then the login screen
//   'desk.wallpaper'   { kind, color? }  Display Properties / Control Panel > Display
//
// currentUser(t)  -> { id, name, email, picture, washed } of the logged-in user, or null
//                    (before the first login and on the login / shutdown / off / boot screens)
// sessionEvent(t) -> the 'login.submit' event that started the current session, or null
// screen(t)       -> { name: 'login' | 'desktop' | 'shutdown' | 'off' | 'boot', t0, from, user }
//                    (t0 = when it started; from = the screen it replaced, for transitions)
// loginSince(t)   -> start of the current login screen (its selection/password state counts from here)
// wallpaper(t)    -> { kind: 'photo' } | { kind: 'color', color }; WALLPAPERS: Display Properties' choices
import { all, last, getVersion } from '../core/events.js'
import { asset } from '../core/preload.js'

export const USERS = [
  { id: 'jenny', name: 'Jenny' },
  { id: 'sondra', name: 'Sondra', email: 'sondra_hsm@hotmail.com' },
  { id: 'tommy', name: 'Tommy' },
  { id: 'kelly', name: 'Kelly' },
  { id: 'angela', name: 'Angela' },
]
const byId = Object.fromEntries(USERS.map((u) => [u.id, u]))
export const userPicture = (id) => asset(`img/login/users/${id}.webp`)
export const userPictureWashed = (id) => asset(`img/login/users/${id}-hover.webp`)

// screen timings (seconds): kept here so the scenes and App agree
export const SHUTDOWN_DUR = 3.2 // "shutting down" screen, then the off screen
export const BOOT_DUR = 3.0 // boot screen, then the login screen fades in
const LEAVE_DUR = 0.6 // longest time a leaving desktop stays visible under the next screen

const TYPES = new Set(['login.submit', 'session.logoff', 'session.switch', 'session.shutdown', 'session.boot'])

// The screen sequence up to t: [{ name, t0, from, user }]. Events that don't apply to the
// current screen (e.g. a submit while already logged in) are ignored.
let memo = { t: NaN, v: -1, out: null }
export function screens(t) {
  const v = getVersion()
  if (memo.t === t && memo.v === v) return memo.out
  const out = build(t)
  memo = { t, v, out }
  return out
}

function build(t) {
  const out = [{ name: 'login', t0: -Infinity, from: null, user: null }]
  const cur = () => out[out.length - 1]
  const push = (name, t0, user = null) => out.push({ name, t0, from: cur().name, user })
  for (const e of all(t, (e) => TYPES.has(e.type))) {
    // timed transitions that completed before this event
    settle(out, e.t)
    const c = cur().name
    if (e.type === 'login.submit' && c === 'login') {
      const sel = last(e.t, (s) => (s.type === 'login.select' || s.type === 'login.deselect') && s.t >= cur().t0)
      const id = e.id || e.user || (sel?.type === 'login.select' ? sel.id : null) || 'sondra'
      out.push({ name: 'desktop', t0: e.t, from: 'login', user: id, event: e })
    }
    else if ((e.type === 'session.logoff' || e.type === 'session.switch') && c === 'desktop') push('login', e.t)
    else if (e.type === 'session.shutdown' && (c === 'login' || c === 'desktop')) push('shutdown', e.t)
    else if (e.type === 'session.boot' && c === 'off') push('boot', e.t)
  }
  settle(out, t)
  return out
}

function settle(out, t) {
  for (;;) {
    const c = out[out.length - 1]
    if (c.name === 'shutdown' && t >= c.t0 + SHUTDOWN_DUR) out.push({ name: 'off', t0: c.t0 + SHUTDOWN_DUR, from: 'shutdown', user: null })
    else if (c.name === 'boot' && t >= c.t0 + BOOT_DUR) out.push({ name: 'login', t0: c.t0 + BOOT_DUR, from: 'boot', user: null })
    else return
  }
}

export function screen(t) {
  const s = screens(t)
  return s[s.length - 1]
}

// the screen before the current one (for cross-fades), or null
export function previousScreen(t) {
  const s = screens(t)
  return s.length > 1 ? s[s.length - 2] : null
}

export function currentUser(t) {
  const list = screens(t)
  let s = list[list.length - 1]
  // while the next screen is still covering the desktop it is leaving, the desktop keeps its user
  if (s.name !== 'desktop' && s.from === 'desktop' && t < s.t0 + LEAVE_DUR) s = list[list.length - 2]
  if (s.name !== 'desktop') return null
  const u = byId[s.user] || byId.sondra
  return { id: u.id, name: u.name, email: u.email || `${u.id}@hotmail.com`, picture: userPicture(u.id), washed: userPictureWashed(u.id) }
}

export function sessionEvent(t) {
  const s = screen(t)
  return s.name === 'desktop' ? s.event : null
}

// start of the current login screen (its state: selection, password, submit, counts from here)
export function loginSince(t) {
  const s = screens(t)
  for (let i = s.length - 1; i >= 0; i--) if (s[i].name === 'login') return s[i].t0
  return -Infinity
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
