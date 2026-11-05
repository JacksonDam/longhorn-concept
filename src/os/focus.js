// Which windows are drawn active, and the cross-fade between the active and inactive looks.
// Pure functions of (time, event log), like everything else.
//
// The active look follows the focus (os/wm.js focusedWindow), with three hand-over rules so a
// focus change moves the look on a frame where little else happens and an animating window
// keeps the look it had when the animation started:
//   close:    the closing window keeps the look while it animates out (it closes as it was); the
//             window that gets the focus shows it once the close is over;
//   minimise: the same: the minimising window keeps the look until it has gone into the taskbar;
//   open:     the window an open takes the focus from keeps the look for the open's first two
//             frames (the new window mounts its live layer then, hidden until its open shows).
// The look cross-fades over FOCUS_FADE frames after each change (activeLevels), except for a
// window that turns active by its own open or restore: it isn't visible yet, so it starts active.
import { FPS } from '../core/clock.js'
import { eventsOf } from './logIndex.js'
import { focusedWindow } from './wm.js'
import { CLOSE_END, MIN_END } from './windowAnim.js'

export const FOCUS_FADE = 4 // video frames
const toRel = (t, t0) => (t - t0) * FPS

// the ids drawn active at time t; list = the session's windows at t (os/wm.js windows(t), plus
// WindowLayer's prewarmed ghosts, which never count)
export function activeIds(list, t) {
  const focus = focusedWindow(t)
  const ids = new Set(focus ? [focus.id] : [])
  // a window animating out (close or minimise) that had the focus when it started keeps the look
  let leaving = null
  for (const w of list) {
    if (w.lastAction === 'close' && w.state === 'closed') {
      if (toRel(t, w.changedAt) < CLOSE_END + 1 && w.focusedAt > (focus ? focus.focusedAt : -Infinity) && (!leaving || w.changedAt > leaving.changedAt)) leaving = w
    } else if (w.lastAction === 'minimize' && w.state === 'minimized' && toRel(t, w.changedAt) < MIN_END + 1) {
      // (minimising clears focusedAt: ask who had the focus just before)
      const before = focusedWindow(w.changedAt - 1e-6)
      if (before && before.id === w.id && (!leaving || w.changedAt > leaving.changedAt)) leaving = w
    }
  }
  // (a later focus change, e.g. a click on another window during the animation, wins)
  if (leaving && !(focus && focus.focusedAt > leaving.changedAt)) return new Set([leaving.id])
  if (focus && focus.lastAction === 'open' && focus.focusedAt === focus.openedAt && toRel(t, focus.openedAt) < 2 - 1e-6) {
    let prev = null
    for (const w of list) if (w !== focus && w.state === 'open' && (!prev || w.focusedAt > prev.focusedAt)) prev = w
    if (prev) ids.add(prev.id)
  }
  return ids
}

// times in (t0, t] at which activeIds can change (sorted): window-manager and session events,
// and the ends of the hand-over rules above (from the log index: O(log n) however long the log)
const WM = ['win.open', 'win.focus', 'win.minimize', 'win.restore', 'win.close', 'win.maximize', 'win.unmaximize', 'music.open', 'music.minimize', 'music.restore', 'music.close', 'login.submit', 'session.logoff', 'session.shutdown']
const MAX_DELAY = (Math.max(CLOSE_END, MIN_END) + 2) / FPS
function candidates(t0, t) {
  const out = []
  for (const type of WM) {
    const a = eventsOf(type)
    let lo = 0, hi = a.length
    while (lo < hi) {
      const m = (lo + hi) >> 1
      if (a[m].t <= t0 - MAX_DELAY) lo = m + 1
      else hi = m
    }
    for (let i = lo; i < a.length && a[i].t <= t; i++) {
      const e = a[i]
      out.push(e.t)
      if (type === 'win.close' || type === 'music.close') out.push(e.t + (CLOSE_END + 1) / FPS)
      else if (type === 'win.minimize' || type === 'music.minimize') out.push(e.t + (MIN_END + 1) / FPS)
      else if (type === 'win.open' || type === 'music.open') out.push(e.t + 2 / FPS)
    }
  }
  return out.filter((x) => x > t0 && x <= t).sort((a, b) => a - b)
}

// Map id -> level of the active look at time t (1 active, 0 inactive): the share of the last
// FOCUS_FADE frames in which the window was drawn active (a linear cross-fade after each change),
// computed exactly between the change times. windowsAt(tt) gives the window list at time tt.
export function activeLevels(windowsAt, t) {
  const list = windowsAt(t)
  const now = activeIds(list, t)
  const span = FOCUS_FADE / FPS
  const t0 = t - span
  const cs = []
  for (const x of candidates(t0, t)) if (!cs.length || x > cs[cs.length - 1]) cs.push(x)
  const levels = new Map()
  for (const w of list) levels.set(w.id, now.has(w.id) ? 1 : 0)
  if (!cs.length) return levels
  // integrate the active set over [t0, t]: piecewise constant between the candidate times
  const acc = new Map()
  const starts = [t0, ...cs]
  for (let i = 0; i < starts.length; i++) {
    const a = starts[i], b = i + 1 < starts.length ? starts[i + 1] : t
    if (b <= a) continue
    const set = i === starts.length - 1 ? now : activeIds(windowsAt(a), a)
    for (const id of set) acc.set(id, (acc.get(id) || 0) + (b - a))
  }
  for (const w of list) {
    let k = Math.min(1, (acc.get(w.id) || 0) / span)
    if (k > 1 - 1e-6) k = 1 // (floating-point sums of the pieces)
    else if (k < 1e-6) k = 0
    // a window made active by its own open or restore starts active (it isn't visible before)
    if (now.has(w.id) && ((w.lastAction === 'open' && w.focusedAt === w.openedAt) || (w.lastAction === 'restore' && w.focusedAt === w.changedAt)) && t - w.changedAt < span + 1e-9) k = 1
    levels.set(w.id, k)
  }
  return levels
}
