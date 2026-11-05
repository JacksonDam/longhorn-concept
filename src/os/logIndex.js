// Indexed event lookups (the core helpers scan the whole log, which grows with every hover and
// every window move in a long interactive session). Events are grouped by type (and by type + id);
// while the log only grows at its end (core/events.js epoch), new events are added to the groups
// incrementally, so an event costs O(1) here however long the log is. Lookups are binary searches
// by time.
import { getLog, getVersion, getEpoch } from '../core/events.js'

let built = { v: -1, epoch: -1, n: 0, byType: new Map(), byTypeId: new Map() }
function add(byType, byTypeId, e) {
  let a = byType.get(e.type)
  if (!a) byType.set(e.type, (a = []))
  a.push(e)
  if (e.id != null) {
    const k = e.type + '|' + e.id
    let b = byTypeId.get(k)
    if (!b) byTypeId.set(k, (b = []))
    b.push(e)
  }
}
function index() {
  const v = getVersion()
  if (built.v === v) return built
  const log = getLog()
  const ep = getEpoch()
  if (built.epoch !== ep || log.length < built.n) built = { v, epoch: ep, n: 0, byType: new Map(), byTypeId: new Map() }
  for (let i = built.n; i < log.length; i++) add(built.byType, built.byTypeId, log[i])
  built.n = log.length
  built.v = v
  return built
}
const NONE = []
// index of the last event at or before t in a time-sorted array (-1 if none)
function upto(a, t) {
  let lo = 0, hi = a.length
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (a[m].t <= t) lo = m + 1
    else hi = m
  }
  return lo - 1
}
export function eventsOf(type, id) {
  const ix = index()
  return (id == null ? ix.byType.get(type) : ix.byTypeId.get(type + '|' + id)) || NONE
}
// the last event of `type` (and `id`) at or before t, optionally matching `pred`
export function lastOfType(t, type, id, pred) {
  const a = eventsOf(type, id)
  for (let i = upto(a, t); i >= 0; i--) if (!pred || pred(a[i])) return a[i]
  return null
}
// the first event of `type` strictly after time t0 and at or before t
export function firstAfter(t0, t, type) {
  const a = eventsOf(type)
  const i = upto(a, t0) + 1
  return i < a.length && a[i].t <= t ? a[i] : null
}

// how many events of these types there are at or before t: a cheap cache key for state that only
// depends on those types (unlike the log version, it doesn't change with every window move)
export function countOfTypes(t, types) {
  let n = 0
  for (const ty of types) n += upto(eventsOf(ty), t) + 1
  return n
}
// the events of these types in [tMin, t] (and passing pred), in log order
export function allOfTypes(t, types, pred, tMin = -Infinity) {
  const out = []
  for (const ty of types) {
    const a = eventsOf(ty)
    for (let i = upto(a, tMin - 1e-9) + 1, n = upto(a, t) + 1; i < n; i++) if (!pred || pred(a[i])) out.push(a[i])
  }
  if (types.length > 1) out.sort((p, q) => p.t - q.t)
  return out
}
// the last event of these types in [tMin, t] passing pred
export function lastOfTypes(t, types, pred, tMin = -Infinity) {
  let best = null
  for (const ty of types) {
    const a = eventsOf(ty)
    for (let i = upto(a, t); i >= 0; i--) {
      if (a[i].t < tMin || (best && a[i].t < best.t)) break
      if (!pred || pred(a[i])) {
        if (!best || a[i].t >= best.t) best = a[i]
        break
      }
    }
  }
  return best
}
// a key that changes when an event of these types is added (or the log is replaced)
export function typesKey(types) {
  const ix = index()
  let k = ix.epoch + ':'
  for (const ty of types) k += (ix.byType.get(ty)?.length || 0) + ','
  return k
}
