// Session: who is logged in and which screen the OS shows, derived from the event log.
//
// Events
//   'login.submit'     { id }  log in as user id (login scene; the video's demo submits as Sondra)
//   'session.logoff'   {}      end the session, back to the login screen (windows close, see wm.js)
//   'session.switch'   {}      Switch User: back to the login screen
//   'session.shutdown' {}      from the login screen or the desktop: shutting-down sequence, then off
//   'session.boot'     {}      from the off screen: boot sequence, then the login screen
//
// currentUser(t)  -> { id, name, picture } of the logged-in user, or null on the login screen
// screen(t)       -> { name: 'login' | 'desktop' | 'shutdown' | 'off' | 'boot', t0, from, user }
//                    (t0 = when it started; from = the screen it replaced, for transitions)
import { all, getVersion } from '../core/events.js'
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

// screen timings (seconds): kept here so the scenes and App agree
export const SHUTDOWN_DUR = 3.2 // "shutting down" screen, then the off screen
export const BOOT_DUR = 3.0 // boot screen, then the login screen fades in

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
    if (e.type === 'login.submit' && c === 'login') push('desktop', e.t, e.id || 'sondra')
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
  const s = screens(t)
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i].name === 'desktop') {
      const u = byId[s[i].user] || byId.sondra
      return { id: u.id, name: u.name, picture: userPicture(u.id) }
    }
    if (s[i].name !== 'shutdown') return null
  }
  return null
}

// start of the current login screen (its state: selection, password, submit, counts from here)
export function loginSince(t) {
  const s = screens(t)
  for (let i = s.length - 1; i >= 0; i--) if (s[i].name === 'login') return s[i].t0
  return -Infinity
}
