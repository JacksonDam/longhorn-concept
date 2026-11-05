// UI state from the event log. Every control derives its look from (t, events) only, so the
// demo, ?capture and real-time playback draw the same thing (docs/ARCHITECTURE.md).
//
// Events used by the kit (all carry `id`; ids are plain strings, see wid() for per-window ids):
//   'hover'     { id, on, key?, x?, y? }  pointer over a control (key: row of a list / item of a menu;
//                                       x, y: stage position of the pointer, used by tooltips)
//   'press'     { id, on }              mouse button held on a control
//   'ui.value'  { id, value }           a control's value (checkbox, radio group, slider, tabs,
//                                       list selection, scroll position, text...)
//   'ui.menu'   { id, open, x?, y? }    a menu bar's open menu key / a context menu (null = closed)
//   'ui.focus'  { id: 'kbd', field }    the text field that has the keyboard (null = none)
//
// Lookups go through an index (type|id -> time-sorted events) rebuilt incrementally when the
// log grows, so a control costs a binary search per frame, not a scan of the whole log.
import { getLog, getVersion, emit } from '../core/events.js'
import { FPS, now } from '../core/clock.js'
import { clamp } from '../core/anim.js'
import { toStage } from '../core/Stage.jsx'

let built = { v: -1, len: 0, lastE: null, map: new Map(), owners: new Map() }
const push = (map, k, e) => {
  let a = map.get(k)
  if (!a) map.set(k, (a = []))
  a.push(e)
}
// the window an event belongs to: ids made by wid() ('<win>@<openedAt>/...') and plain window ids;
// events without an id are filed under their type's family ('media', 'mail', ...)
const ownerOf = (e) => (e.id == null ? '#' + e.type.split('.')[0] : String(e.id).split('@')[0])
function build() {
  const v = getVersion()
  if (built.v === v) return built
  const log = getLog()
  let { map, owners } = built
  let start = 0
  // fast path: the new events were appended after the ones already indexed
  if (built.len > 0 && log.length >= built.len && log[built.len - 1] === built.lastE) start = built.len
  else {
    map = new Map()
    owners = new Map()
  }
  for (let i = start; i < log.length; i++) {
    const e = log[i]
    push(owners, ownerOf(e), e)
    if (e.id != null) {
      push(map, e.type + '|' + e.id, e)
      // families of typed events with ids too (e.g. 'mail.read' { key } has none, 'im.send' has)
      push(owners, '#' + e.type.split('.')[0], e)
    }
  }
  built = { v, len: log.length, lastE: log[log.length - 1], map, owners }
  return built
}
const index = () => build().map
const lastIn = (a, t) => {
  if (!a) return -Infinity
  let lo = 0,
    hi = a.length
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (a[m].t <= t) lo = m + 1
    else hi = m
  }
  return lo > 0 ? a[lo - 1].t : -Infinity
}
// time of the latest event at or before t that concerns window `winId`: its own events (win.*,
// explorer.*, ui.* and hovers of controls with wid() ids), keyboard focus changes, and the event
// families in `watch` (e.g. ['media', 'mail'])
export function lastRelevant(t, winId, watch = []) {
  const { owners } = build()
  let m = Math.max(lastIn(owners.get(winId), t), lastIn(owners.get('kbd'), t))
  for (const w of watch) m = Math.max(m, lastIn(owners.get('#' + w), t))
  return m
}

const NONE = []
// [events of (type, id), index of the last one at or before t (-1 if none)]
export function find(t, type, id) {
  const a = index().get(type + '|' + id) || NONE
  let lo = 0,
    hi = a.length
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (a[m].t <= t) lo = m + 1
    else hi = m
  }
  return [a, lo - 1]
}
export function lastOf(t, type, id) {
  const [a, i] = find(t, type, id)
  return i >= 0 ? a[i] : null
}
// all events of (type, id) at or before t (oldest first)
export function allOf(t, type, id) {
  const [a, i] = find(t, type, id)
  return i < 0 ? NONE : a.slice(0, i + 1)
}

// ---- values ------------------------------------------------------------------------------
export function valueOf(t, id, def) {
  const e = lastOf(t, 'ui.value', id)
  return e ? e.value : def
}
export const setValue = (id, value) => emit('ui.value', { id, value })
export const valueAt = (id, def) => valueOf(now(), id, def)

// A window-session scoped id: a reopened window starts from fresh state.
export const wid = (win, name) => (win ? `${win.id}@${win.openedAt}/${name}` : name)

// ---- hover / press ----------------------------------------------------------------------
// fin / fout: fade in / out in video frames (the video's hovers take 1-3 frames)
export const HOVER_IN = 1.5
export const HOVER_OUT = 2.5

const ramp = (df, dur) => (dur <= 0 ? 1 : clamp(df / dur))

function levelAt(a, i, t, fin, fout, depth = 0) {
  const e = a[i]
  const df = (t - e.t) * FPS
  const prev = i > 0 && depth < 6 ? a[i - 1] : null
  if (e.on) {
    // fading in from wherever the last fade out had got to
    let from = 0
    if (prev && !prev.on && (e.t - prev.t) * FPS < fout) from = levelAt(a, i - 1, e.t, fin, fout, depth + 1)
    return from + (1 - from) * ramp(df, fin * (1 - from))
  }
  let reached = 0
  if (prev && prev.on) reached = (e.t - prev.t) * FPS >= fin ? 1 : levelAt(a, i - 1, e.t, fin, fout, depth + 1)
  return reached * (1 - ramp(df, fout))
}

// 0..1 hover highlight of a plain control
export function hoverLevel(t, id, fin = HOVER_IN, fout = HOVER_OUT) {
  const [a, i] = find(t, 'hover', id)
  if (i < 0) return 0
  return levelAt(a, i, t, fin, fout)
}
export function isHover(t, id) {
  const e = lastOf(t, 'hover', id)
  return !!(e && e.on)
}

// Keyed hover (rows of a list, items of a menu: one event stream per list).
// Returns a Map key -> level for the rows that are lit (at most a few fading ones).
export function hoverKeys(t, id, fin = HOVER_IN, fout = HOVER_OUT) {
  const [a, i] = find(t, 'hover', id)
  const out = new Map()
  if (i < 0) return out
  const seen = new Set()
  for (let j = i; j >= 0 && j > i - 8; j--) {
    const e = a[j]
    if (seen.has(e.key)) continue
    seen.add(e.key)
    let lv
    if (e.on) {
      lv = ramp((t - e.t) * FPS, fin)
    } else {
      // find this key's previous 'on' to know how far it got
      let on = null
      for (let k = j - 1; k >= 0 && k > j - 8; k--) {
        if (a[k].key === e.key) {
          on = a[k].on ? a[k] : null
          break
        }
      }
      const reached = on ? ramp((e.t - on.t) * FPS, fin) : 0
      lv = reached * (1 - ramp((t - e.t) * FPS, fout))
    }
    if (lv > 0) out.set(e.key, lv)
    if ((t - e.t) * FPS > Math.max(fin, fout) + 1 && !e.on) break
  }
  return out
}
// the hovered key (or undefined)
export function hoverKey(t, id) {
  const e = lastOf(t, 'hover', id)
  return e && e.on ? e.key : undefined
}

export function isPressed(t, id) {
  const e = lastOf(t, 'press', id)
  return !!(e && e.on)
}
export function pressLevel(t, id, fin = 1, fout = 2) {
  const [a, i] = find(t, 'press', id)
  if (i < 0) return 0
  return levelAt(a, i, t, fin, fout)
}

// pointer handlers that log hover (and optionally the stage pointer position for tooltips)
export function hoverHandlers(id, key) {
  return {
    onPointerEnter: (e) => emit('hover', key === undefined ? { id, on: true, ...pt(e) } : { id, key, on: true, ...pt(e) }),
    onPointerLeave: () => emit('hover', key === undefined ? { id, on: false } : { id, key, on: false }),
  }
}

// ---- keyboard focus --------------------------------------------------------------------------
export const focusedField = (t) => lastOf(t, 'ui.focus', 'kbd')?.field ?? null
export const focusAt = (t) => lastOf(t, 'ui.focus', 'kbd')
export const setFocus = (field) => {
  if (focusedField(now()) !== field) emit('ui.focus', { id: 'kbd', field })
}

// ---- menus ------------------------------------------------------------------------------------
export const menuState = (t, id) => lastOf(t, 'ui.menu', id)
export const openMenu = (id, open, pos) => emit('ui.menu', { id, open, ...(pos || {}) })
export const closeMenu = (id) => {
  const s = menuState(now(), id)
  if (s && s.open != null) emit('ui.menu', { id, open: null })
}

// ---- geometry helpers ----------------------------------------------------------------------
// stage position of a pointer event
export function pt(e) {
  if (!e || e.clientX == null) return {}
  const p = toStage(e.clientX, e.clientY)
  return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }
}
// stage rect of an element
export function stageRect(el) {
  const r = el.getBoundingClientRect()
  const a = toStage(r.left, r.top)
  const b = toStage(r.right, r.bottom)
  const q = (v) => Math.round(v * 10) / 10
  return { x: q(a.x), y: q(a.y), w: q(b.x - a.x), h: q(b.y - a.y) }
}

// frames since an event (or Infinity)
export const framesSince = (t, e) => (e ? (t - e.t) * FPS : Infinity)
