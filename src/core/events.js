// Append-only, time-stamped event log. UI state is derived from the events at or
// before the current clock time, so seeking (capture mode, demo playback) is exact.
import { now } from './clock.js'

let log = []
let version = 0
const subs = new Set()

export function emit(type, data = {}, t = now()) {
  const e = { t, type, ...data }
  // keep sorted by time (stable for equal stamps)
  let i = log.length
  while (i > 0 && log[i - 1].t > t) i--
  log = [...log.slice(0, i), e, ...log.slice(i)]
  version++
  for (const fn of subs) fn()
  return e
}

export function setLog(events) {
  log = [...events].sort((a, b) => a.t - b.t)
  version++
  for (const fn of subs) fn()
}

export const getLog = () => log
export const getVersion = () => version
export function onEvents(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

// helpers over the log at time t
export function until(t) {
  let n = 0
  while (n < log.length && log[n].t <= t) n++
  return log.slice(0, n)
}
export function last(t, pred) {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]
    if (e.t <= t && pred(e)) return e
  }
  return null
}
export function all(t, pred) {
  return log.filter((e) => e.t <= t && pred(e))
}
