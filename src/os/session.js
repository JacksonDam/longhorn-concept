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
//   'session.boot'     {}      from the off screen: the boot screen (scenes/session/bootScreen.js),
//                              black, the login screen fading in. A log that starts with one at
//                              t <= 0 starts off: the real OS's first boot, whose boot screen is the
//                              page's own while it loads (core/boot.js), so that one only fades in
//   'desk.wallpaper'   { kind, color? }  Display Properties / Control Panel > Display
//
// currentUser(t)  -> { id, name, email, picture, washed } of the logged-in user, or null
//                    (before the first login and on the login / shutdown / off / boot screens)
// sessionEvent(t) -> the 'login.submit' event that started the current session, or null
// screen(t)       -> { name: 'login' | 'desktop' | 'shutdown' | 'off' | 'boot', t0, from, user }
//                    (t0 = when it started; from = the screen it replaced)
// loginSince(t)   -> start of the current login screen (its selection/password state counts from here)
// wallpaper(t)    -> { kind: 'photo' } | { kind: 'image', key, src } | { kind: 'color', color };
//                    WALLPAPERS: Display Properties' choices ('desk.wallpaper' { kind, color?, key? })
// userInfo(id)    -> the (cached, frozen) user record for a login id
import { all, last, getVersion } from '../core/events.js'
import { lastOfType } from './logIndex.js'
import { asset } from '../core/preload.js'
import { FADE as BOOT_FADE, SWEEP as BOOT_SWEEP } from '../scenes/session/bootScreen.js'

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

// Screen timings (seconds), from the second reference video (ref2, days-video.md, f02775-f02888):
// log off is a hard cut from the desktop to the login screen there; here it plays the login
// transition in reverse (LOGOFF_REVERSE: the login layer comes back over the desktop the way it
// left, scenes/login/exit.js, while the desktop stays as it was). Shutting down shows the login
// screen in its shutting-down state (Longhorn 4015's: the background, a white Windows flag and
// "Windows is shutting down...", scenes/login/LoginScene.jsx), coming in the same way from the
// desktop, held 28 frames and faded linearly to black over 61 frames (ref2's hold and fade).
// Booting (in neither video; the second one ends black) shows the Longhorn boot screen for one
// fade-in and one pass of its blocks, then fades the login screen in from black.
const FRAME = 1001 / 30000
export const SHUTDOWN_HOLD = 28 * FRAME
export const SHUTDOWN_FADE = 61 * FRAME
export const BOOT_DUR = 30 * FRAME
export const LOGOFF_REVERSE = 12 * FRAME // the login exit's length (scenes/login/exit.js LOGIN_EXIT)
export const BOOT_SCREEN = BOOT_FADE + BOOT_SWEEP // the power button's boot screen, before BOOT_DUR
export const bootScreenDur = (s) => (s.cold ? 0 : BOOT_SCREEN)
export const shutdownDur = () => SHUTDOWN_HOLD + SHUTDOWN_FADE

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
  // a log that starts with 'session.boot' at t <= 0 starts powered off: the real OS boots at load
  // (core/boot.js), its login screen fading in from black like any boot
  const evs = all(t, (e) => TYPES.has(e.type))
  const first = evs[0]
  const out = [{ name: first?.type === 'session.boot' && first.t <= 0 ? 'off' : 'login', t0: -Infinity, from: null, user: null }]
  const cur = () => out[out.length - 1]
  const push = (name, t0, user = null) => out.push({ name, t0, from: cur().name, user })
  for (const e of evs) {
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
    else if (e.type === 'session.boot' && c === 'off') out.push({ name: 'boot', t0: e.t, from: 'off', user: null, cold: cur().t0 === -Infinity })
  }
  settle(out, t)
  return out
}

function settle(out, t) {
  for (;;) {
    const c = out[out.length - 1]
    if (c.name === 'shutdown' && t >= c.t0 + shutdownDur(c)) out.push({ name: 'off', t0: c.t0 + shutdownDur(c), from: 'shutdown', user: null })
    else if (c.name === 'boot' && t >= c.t0 + bootScreenDur(c) + BOOT_DUR) out.push({ name: 'login', t0: c.t0 + bootScreenDur(c) + BOOT_DUR, from: 'boot', user: null })
    else return
  }
}

export function screen(t) {
  const s = screens(t)
  return s[s.length - 1]
}

// during the reverse login transition when the desktop is left (log off, switch user, shut down):
// the seconds of the login exit still to unwind (LOGOFF_REVERSE down to 0), and the desktop
// screen being left; else null
export function logoffReverse(t) {
  const s = screens(t)
  const cur = s[s.length - 1]
  if ((cur.name !== 'login' && cur.name !== 'shutdown') || cur.from !== 'desktop' || t >= cur.t0 + LOGOFF_REVERSE) return null
  return { k: LOGOFF_REVERSE - (t - cur.t0), desktop: s[s.length - 2] }
}

// the screen before the current one (for cross-fades), or null
export function previousScreen(t) {
  const s = screens(t)
  return s.length > 1 ? s[s.length - 2] : null
}

// one frozen object per user, so callers can memoise on it
const userObjs = new Map()
export function userInfo(id) {
  let o = userObjs.get(id)
  if (!o) {
    const u = byId[id] || byId.sondra
    o = Object.freeze({ id: u.id, name: u.name, email: u.email || `${u.id}@hotmail.com`, picture: userPicture(u.id), washed: userPictureWashed(u.id) })
    userObjs.set(id, o)
  }
  return o
}
export function currentUser(t) {
  const s = screen(t)
  if (s.name !== 'desktop') return null
  return userInfo(s.user)
}

export function sessionEvent(t) {
  const s = screen(t)
  return s.name === 'desktop' ? s.event : null
}

// start of the current login screen (its state: selection, password, submit, counts from here)
// (a visit starts with a login screen, with shutting down from the desktop, or with booting)
export function loginSince(t) {
  const s = screens(t)
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s[i]
    if (c.name === 'login' || c.name === 'boot' || (c.name === 'shutdown' && c.from === 'desktop')) return c.t0
  }
  return -Infinity
}

export const WALLPAPERS = [
  { kind: 'photo', name: 'Stonehenge' },
  // an original green leaf stand-in for the frog-on-a-leaf wallpaper of the second reference
  { kind: 'image', key: 'leaf', name: 'Leaf', src: asset('img/desktop/wallpaper-leaf.webp') },
  { kind: 'color', color: '#3a6ea5', name: 'Blue' },
  { kind: 'color', color: '#2b4f2b', name: 'Green' },
  { kind: 'color', color: '#5c3b6e', name: 'Plum' },
  { kind: 'color', color: '#7a5230', name: 'Desert' },
  { kind: 'color', color: '#000000', name: 'Black' },
]

const PHOTO = { kind: 'photo' }
export function wallpaper(t) {
  const e = lastOfType(t, 'desk.wallpaper')
  if (!e || (e.kind !== 'color' && e.kind !== 'image')) return PHOTO
  if (e.kind === 'image') return WALLPAPERS.find((w) => w.key === e.key) || PHOTO
  return { kind: 'color', color: e.color || '#3a6ea5' }
}
