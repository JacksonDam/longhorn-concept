// Taskbar model: which buttons the taskbar shows (one per wm window that isn't closed), in
// what order, where each sits, and the transition in progress. Pure functions of time.
//
// Order: the windows running at login in the video's order (Inbox, Yahoo.com, Document,
// Winamp3); a newly opened window is inserted in the middle of the group, as My Music is in
// the video (between Yahoo.com and Document); closed windows drop out.
// Layout: the group is centred on x 458 (the video's 5-button layout). The video's two
// layouts (4 and 5 buttons) are kept exactly as measured; any other set is laid out from
// per-button widths (measured for the video's buttons, from the label otherwise).
// Transition: a window's button is inserted 8 frames after it opens (the video's timing);
// the left buttons slide out to make room and the right ones likewise, with the video's
// overshoot curves scaled to the actual distances. Removal: the gap closes over 6 frames.
import { FPS } from '../../core/clock.js'
import { windows, sessionStart, RUNNING_AT_LOGIN } from '../../os/wm.js'
import { taskLabel } from './appInfo.js'

export const INSERT_DELAY = 8 // frames after 'win.open' until the button starts to appear
export const REMOVE_FRAMES = 6
const CENTER = 458
const MIN_X = 66
const MAX_X = 852

// measured button geometry (5-button layout): width, icon and text offsets from the left
// edge, visible text width (tw: the text fades out over its last 12 px)
const MEASURED = {
  inbox: { w: 127, icon: 6.5, text: 25.5, tw: 99 },
  yahoo: { w: 100, icon: 9.5, text: 29.5 },
  music: { w: 118, icon: 17.5, text: 39.5 },
  doc1: { w: 114, icon: 14.5, text: 35.5, tw: 66 },
  winamp: { w: 86, icon: 10.5, text: 27.5 },
}
const LAYOUT4 = {
  x0: 248,
  x1: 675.5,
  buttons: [
    { id: 'inbox', x: 248, w: 131.5, icon: 9, text: 29, tw: 99, sep: true },
    { id: 'yahoo', x: 379.5, w: 102, icon: 8.5, text: 28.5, sep: true },
    { id: 'doc1', x: 481.5, w: 108, icon: 7.5, text: 29.5, tw: 66, sep: true },
    { id: 'winamp', x: 589.5, w: 86, icon: 8.5, text: 27.5 },
  ],
}
const VIDEO5 = ['inbox', 'yahoo', 'music', 'doc1', 'winamp']
// the video draws no separator between My Music and Document
const NO_SEP_AFTER = new Set(['music'])

const approxTextWidth = (s) => s.length * 5.15

function geometry(win) {
  const m = MEASURED[win.id]
  if (m && win.app === ({ inbox: 'outlook', yahoo: 'ie', music: 'music', doc1: 'word', winamp: 'winamp' })[win.id]) return m
  const tw = Math.min(110, Math.ceil(approxTextWidth(taskLabel(win))))
  return { w: Math.round(tw + 40), icon: 9, text: 29, tw: tw >= 110 ? 110 : undefined }
}

// layouts are cached by their content so the buttons' objects stay identical frame to frame
const layoutCache = new Map()
export function layoutFor(list) {
  const key = list.map((w) => w.id + '\u0001' + w.app + '\u0001' + taskLabel(w)).join('\u0002')
  let v = layoutCache.get(key)
  if (!v) {
    v = computeLayout(list)
    if (layoutCache.size > 200) layoutCache.clear()
    layoutCache.set(key, v)
  }
  return v
}

function computeLayout(list) {
  const ids = list.map((w) => w.id)
  if (ids.join() === LAYOUT4.buttons.map((b) => b.id).join() && list.every((w, i) => geometry(w) === MEASURED[ids[i]])) return LAYOUT4
  let geo = list.map(geometry)
  let total = geo.reduce((s, g) => s + g.w, 0)
  const room = MAX_X - MIN_X
  if (total > room) {
    const k = room / total
    geo = geo.map((g) => ({ ...g, w: g.w * k, tw: Math.max(10, Math.min(g.tw ?? g.w, g.w * k - g.text - 6)) }))
    total = room
  }
  let x = Math.max(MIN_X, Math.min(MAX_X - total, CENTER - total / 2))
  if (ids.join() === VIDEO5.join()) x = 185.5
  const x0 = x
  const buttons = list.map((w, i) => {
    const g = geo[i]
    const b = { id: w.id, x, w: g.w, icon: g.icon, text: g.text, tw: g.tw, sep: i < list.length - 1 && !NO_SEP_AFTER.has(w.id) }
    x += g.w
    return b
  })
  return { x0, x1: x, buttons }
}

// ordered entries at time t, plus the latest change (insert / remove) for the transition
function history(t) {
  const wins = windows(t)
  const start = sessionStart(t)
  const atLogin = (w) => w.openedAt === start && RUNNING_AT_LOGIN.some((r) => r.id === w.id)
  const evs = []
  for (const w of wins) {
    if (!atLogin(w)) evs.push({ t: w.openedAt + INSERT_DELAY / FPS, kind: 'insert', w })
    if (w.state === 'closed') evs.push({ t: w.changedAt, kind: 'remove', w })
  }
  evs.sort((a, b) => a.t - b.t)
  let order = RUNNING_AT_LOGIN.map((r) => wins.find((w) => w.id === r.id && atLogin(w))).filter(Boolean)
  let change = null
  for (const e of evs) {
    if (e.t > t) break
    const before = order
    if (e.kind === 'insert') {
      const without = order.filter((w) => w.id !== e.w.id)
      const k = Math.ceil(without.length / 2)
      order = [...without.slice(0, k), e.w, ...without.slice(k)]
    } else order = order.filter((w) => w.id !== e.w.id)
    change = { kind: e.kind, t: e.t, id: e.w.id, before, after: order }
  }
  return { order, change }
}

export function taskbarState(t) {
  const { order, change } = history(t)
  const layout = layoutFor(order)
  let transition = null
  if (change) {
    const rel = (t - change.t) * FPS
    const dur = change.kind === 'insert' ? 15 : REMOVE_FRAMES
    if (rel < dur) {
      const from = layoutFor(change.before)
      transition = { ...change, rel, from, to: layoutFor(change.after) }
    }
  }
  return { order, layout, transition }
}
