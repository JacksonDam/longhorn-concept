// Window manager: the desktop session's windows, derived from the event log (so playback,
// seeking and capture stay exact). Pure data; rendering lives in os/PlexWindow.jsx and the
// taskbar in scenes/desktop.
//
// Events (all carry the window `id`; `app` picks the registered app, see os/apps.js):
//   'win.open'       { id, app, props? }  open a window (or restore + focus it if it exists)
//   'win.focus'      { id }               bring to front
//   'win.minimize'   { id }               animate into its taskbar button
//   'win.restore'    { id }               animate back out of the taskbar
//   'win.maximize'   { id } / 'win.unmaximize' { id }
//   'win.close'      { id }
//   'win.move'       { id, x, y }         new top-left (stage px), emitted while dragging
//   'win.resize'     { id, w, h }         new size (stage px), emitted while dragging the resize grip
//   'win.props'      { id, ...props }     app-level state that should survive (e.g. url, page)
//   'session.logoff' / 'session.shutdown' all windows go away (login scene takes over)
// Legacy aliases (the video's demo input): 'music.open' / 'music.minimize' / 'music.restore' /
// 'music.close' act on id 'music' with app 'music'.
//
// Session start ('login.submit'): a session starts with no windows. The video's starts with four
// apps already in its taskbar: its input log says so ('login.submit' { running: [ids] }, the
// demo's and the scripted scenarios' that follow the video), and those exist minimised from the
// first frame (no animation), as RUNNING_AT_LOGIN describes them. A real login never has them.
import { getLog, getVersion, getEpoch, countAt } from '../core/events.js'
import { LOGOFF_REVERSE } from './session.js'

export const RUNNING_AT_LOGIN = [
  { id: 'inbox', app: 'outlook' },
  { id: 'yahoo', app: 'ie', props: { url: 'yahoo.com' } },
  { id: 'doc1', app: 'word' },
  { id: 'winamp', app: 'winamp' },
]

const LEGACY = { 'music.open': 'win.open', 'music.minimize': 'win.minimize', 'music.restore': 'win.restore', 'music.close': 'win.close' }

function normalise(e) {
  const type = LEGACY[e.type]
  if (!type) return e
  return { ...e, type, id: 'music', app: 'music' }
}

// window record:
// { id, app, props, x, y (null = app default position), z, openedAt, state: 'open' | 'minimized' | 'closed',
//   changedAt (time of the last open/minimize/restore/close), lastAction ('open' | 'minimize' | 'restore' | 'close' | 'initial'),
//   maximized, maximizedAt, focusedAt, initial (true for RUNNING_AT_LOGIN windows never shown yet),
//   w, h (resized size, absent = the app's default) }
// folds log[from..to) into st = { wins: Map, z, session (time of the current login.submit) }
function foldInto(st, log, from, to) {
  const wins = st.wins
  const touch = (w, t) => {
    w.z = ++st.z
    w.focusedAt = t
  }
  for (let i = from; i < to; i++) {
    const e = normalise(log[i])
    const t = e.t
    switch (e.type) {
      case 'login.submit':
        wins.clear()
        st.session = t
        st.ended = null
        for (const r of RUNNING_AT_LOGIN.filter((r) => e.running?.includes(r.id))) {
          wins.set(r.id, {
            id: r.id, app: r.app, props: { ...(r.props || {}) }, x: null, y: null, z: ++st.z,
            openedAt: t, state: 'minimized', changedAt: t, lastAction: 'initial', maximized: false,
            maximizedAt: null, focusedAt: -Infinity, initial: true,
          })
        }
        break
      case 'session.logoff':
      case 'session.switch':
      case 'session.shutdown':
        // the windows stay, frozen, under the login screen coming back (os/session.js
        // LOGOFF_REVERSE); stateAt drops them once it has
        st.session = null
        st.ended = t
        break
      case 'win.open': {
        const w = wins.get(e.id)
        if (w && w.state !== 'closed') {
          if (e.props) w.props = { ...w.props, ...e.props }
          if (w.state === 'minimized') {
            w.state = 'open'
            w.changedAt = t
            w.lastAction = 'restore'
            w.initial = false
          }
          touch(w, t)
        } else {
          wins.set(e.id, {
            id: e.id, app: e.app || w?.app, props: { ...(e.props || {}) }, x: null, y: null, z: 0,
            openedAt: t, state: 'open', changedAt: t, lastAction: 'open', maximized: false,
            maximizedAt: null, focusedAt: t, initial: false,
          })
          touch(wins.get(e.id), t)
        }
        break
      }
      case 'win.focus': {
        const w = wins.get(e.id)
        if (w && w.state === 'open') touch(w, t)
        break
      }
      case 'win.minimize': {
        const w = wins.get(e.id)
        if (w && w.state === 'open') {
          w.state = 'minimized'
          w.changedAt = t
          w.lastAction = 'minimize'
          w.focusedAt = -Infinity
        }
        break
      }
      case 'win.restore': {
        const w = wins.get(e.id)
        if (w && w.state === 'minimized') {
          w.state = 'open'
          w.changedAt = t
          w.lastAction = 'restore'
          w.initial = false
          touch(w, t)
        }
        break
      }
      case 'win.maximize':
      case 'win.unmaximize': {
        const w = wins.get(e.id)
        if (w && w.state === 'open') {
          w.maximized = e.type === 'win.maximize'
          w.maximizedAt = t
          touch(w, t)
        }
        break
      }
      case 'win.close': {
        const w = wins.get(e.id)
        if (w && w.state !== 'closed') {
          w.state = 'closed'
          w.changedAt = t
          w.lastAction = 'close'
        }
        break
      }
      case 'win.move': {
        const w = wins.get(e.id)
        if (w) {
          w.x = e.x
          w.y = e.y
        }
        break
      }
      case 'win.resize': {
        const w = wins.get(e.id)
        if (w) {
          w.w = e.w
          w.h = e.h
        }
        break
      }
      case 'win.props': {
        const w = wins.get(e.id)
        if (w) {
          const { t: _t, type: _ty, id: _id, ...rest } = e
          w.props = { ...w.props, ...rest }
        }
        break
      }
    }
  }
  return st
}
const freshState = () => ({ wins: new Map(), z: 0, session: null, ended: null })
// a copy of a fold state (records are replaced, never their props objects mutated, so a shallow
// copy of each record is enough)
const cloneState = (st) => ({ wins: new Map([...st.wins].map(([k, w]) => [k, { ...w }])), z: st.z, session: st.session, ended: st.ended })

// The state after the first n events, cached per n (a few entries, so looking back in time, as
// os/focus.js does during a cross-fade, doesn't evict the current frame's state). While the log
// only grows at its end (core/events.js epoch), the fold continues from where it got to, with
// checkpoints every CHECK events for looking back: an event costs O(1) however long the log is.
const CHECK = 256
let fold = { epoch: -1, n: 0, st: freshState(), checks: [] }
let cacheV = -1
const cache = new Map() // n -> value
function stateAt(t) {
  const log = getLog()
  const lo = countAt(t)
  const v = getVersion()
  if (cacheV !== v) {
    cache.clear()
    cacheV = v
  }
  const hit = cache.get(lo)
  if (hit) return hit
  const ep = getEpoch()
  if (fold.epoch !== ep || fold.n > log.length) fold = { epoch: ep, n: 0, st: freshState(), checks: [{ n: 0, st: freshState() }] }
  if (lo < fold.n) {
    // back in time: from the last checkpoint at or before lo
    let c = fold.checks[0]
    for (const k of fold.checks) if (k.n <= lo) c = k
    fold.n = c.n
    fold.st = cloneState(c.st)
  }
  while (fold.n < lo) {
    const to = Math.min(lo, (Math.floor(fold.n / CHECK) + 1) * CHECK)
    foldInto(fold.st, log, fold.n, to)
    fold.n = to
    if (to % CHECK === 0 && !fold.checks.some((k) => k.n === to)) fold.checks.push({ n: to, st: cloneState(fold.st) })
  }
  const r = fold.st
  // freeze copies so callers can't mutate the cache (a logged-off session's windows: none once
  // the login screen has come back over them)
  const gone = r.session == null && r.ended != null && t >= r.ended + LOGOFF_REVERSE
  const list = gone ? [] : [...r.wins.values()].map((w) => Object.freeze({ ...w, props: Object.freeze({ ...w.props }) }))
  const value = { list, byId: new Map(list.map((w) => [w.id, w])), session: r.session }
  if (cache.size >= 6) cache.delete(cache.keys().next().value)
  // (cached per event count, except after a log off: whether its windows still show depends on t)
  if (r.ended == null) cache.set(lo, value)
  return value
}

// all windows of the current session (including closed ones until the session ends), sorted by z
export function windows(t) {
  return [...stateAt(t).list].sort((a, b) => a.z - b.z)
}
export function getWindow(t, id) {
  return stateAt(t).byId.get(id) || null
}
// the focused window: the open window with the latest focus
export function focusedWindow(t) {
  let best = null
  for (const w of stateAt(t).list) if (w.state === 'open' && (!best || w.focusedAt > best.focusedAt)) best = w
  return best
}
export const sessionStart = (t) => stateAt(t).session
