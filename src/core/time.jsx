// React bindings for the clock and the event log.
// useTime() / useEvents() subscribe to small external stores (useSyncExternalStore), so a
// clock tick re-renders exactly the components that read them: unlike a context whose value
// changes every frame, React never has to scan the rest of the tree for consumers.
import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { onFrame, now } from './clock.js'
import { onEvents, getVersion } from './events.js'

let renderedT = null
export const lastRenderedTime = () => renderedT

function store(get) {
  const subs = new Set()
  return {
    get,
    subscribe: (fn) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    notify: () => {
      for (const fn of subs) fn()
    },
  }
}
let curT = now()
let curV = getVersion()
const timeStore = store(() => curT)
const eventStore = store(() => curV)

export function TimeProvider({ children }) {
  const t = useSyncExternalStore(timeStore.subscribe, timeStore.get)
  // commit each clock tick synchronously inside its animation frame, so the frame that paints
  // next shows exactly this time (no one-frame lag, no frames committed after the paint)
  useEffect(
    () =>
      onFrame((tt) => {
        if (tt === curT) return
        curT = tt
        flushSync(timeStore.notify)
      }),
    [],
  )
  useEffect(
    () =>
      onEvents(() => {
        curV = getVersion()
        eventStore.notify()
      }),
    [],
  )
  // descendants' layout effects (slab canvases) run before this one, so once it has run the
  // whole tree shows time t: the capture tool waits for this before taking a screenshot
  useLayoutEffect(() => {
    renderedT = t
  })
  return children
}

export const useTime = () => useSyncExternalStore(timeStore.subscribe, timeStore.get)
export const useEvents = () => useSyncExternalStore(eventStore.subscribe, eventStore.get)
