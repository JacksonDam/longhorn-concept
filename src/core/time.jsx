// React bindings for the clock and the event log.
// <TimeProvider> re-renders only the components that read useTime()/useEvents();
// its children element is created once by the parent, so static subtrees bail out.
import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { onFrame, now } from './clock.js'
import { onEvents, getVersion } from './events.js'

let renderedT = null
export const lastRenderedTime = () => renderedT

const TimeCtx = createContext(0)
const EventsCtx = createContext(0)

export function TimeProvider({ children }) {
  const [t, setT] = useState(now)
  const [v, setV] = useState(getVersion)
  // commit each clock tick synchronously inside its animation frame, so the frame that paints
  // next shows exactly this time (no one-frame lag, no frames committed after the paint)
  useEffect(() => onFrame((t) => flushSync(() => setT(t))), [])
  useEffect(() => onEvents(() => setV(getVersion())), [])
  // children's layout effects (slab canvases) run before this one, so once it has run the
  // whole tree shows time t: the capture tool waits for this before taking a screenshot
  useLayoutEffect(() => {
    renderedT = t
  })
  return (
    <EventsCtx.Provider value={v}>
      <TimeCtx.Provider value={t}>{children}</TimeCtx.Provider>
    </EventsCtx.Provider>
  )
}

export const useTime = () => useContext(TimeCtx)
export const useEvents = () => useContext(EventsCtx)
