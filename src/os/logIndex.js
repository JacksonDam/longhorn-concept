// Indexed event lookups for the shell (the core helpers scan the whole log, which grows with
// every hover in a long interactive session). Events are grouped by type (and by type + id)
// once per log version; lookups are binary searches by time.
import { getLog, getVersion } from '../../core/events.js'

let built = { v: -1, byType: new Map(), byTypeId: new Map() }
function index() {
  const v = getVersion()
  if (built.v === v) return built
  const byType = new Map()
  const byTypeId = new Map()
  for (const e of getLog()) {
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
  built = { v, byType, byTypeId }
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
