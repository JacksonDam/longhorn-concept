// Append-only, time-stamped event log. UI state is derived from the events at or
// before the current clock time, so seeking (capture mode, demo playback) is exact.
import { now } from './clock.js'

let log = []
let version = 0
// epoch: bumps when the log is replaced or an event lands before its end; while it stays, the log
// has only grown at its end (in place), so readers can index it incrementally (os/logIndex.js)
let epoch = 0
const subs = new Set()

export function emit(type, data = {}, t = now()) {
  const e = { t, type, ...data }
  // keep sorted by time (stable for equal stamps); appending (the usual case, live input) is in
  // place and O(1): a long session's log is never copied per event
  const n = log.length
  if (n === 0 || log[n - 1].t <= t) log.push(e)
  else {
    let i = n
    while (i > 0 && log[i - 1].t > t) i--
    log = [...log.slice(0, i), e, ...log.slice(i)]
    epoch++
  }
  version++
  for (const fn of subs) fn()
  return e
}

export function setLog(events) {
  log = [...events].sort((a, b) => a.t - b.t)
  epoch++
  version++
  for (const fn of subs) fn()
}

export const getLog = () => log
export const getVersion = () => version
export const getEpoch = () => epoch
// the number of events at or before t (binary search)
export function countAt(t) {
  let lo = 0, hi = log.length
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (log[m].t <= t) lo = m + 1
    else hi = m
  }
  return lo
}
export function onEvents(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

// helpers over the log at time t
export function until(t) {
  return log.slice(0, countAt(t))
}
export function last(t, pred) {
  for (let i = countAt(t) - 1; i >= 0; i--) if (pred(log[i])) return log[i]
  return null
}
export function all(t, pred) {
  const out = []
  for (let i = 0, n = countAt(t); i < n; i++) if (pred(log[i])) out.push(log[i])
  return out
}
