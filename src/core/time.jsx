// React bindings for the clock and the event log.
// <TimeProvider> re-renders only the components that read useTime()/useEvents();
// its children element is created once by the parent, so static subtrees bail out.
import { createContext, useContext, useEffect, useState } from 'react'
import { onFrame, now } from './clock.js'
import { onEvents, getVersion } from './events.js'

const TimeCtx = createContext(0)
const EventsCtx = createContext(0)

export function TimeProvider({ children }) {
  const [t, setT] = useState(now)
  const [v, setV] = useState(getVersion)
  useEffect(() => onFrame(setT), [])
  useEffect(() => onEvents(() => setV(getVersion())), [])
  return (
    <EventsCtx.Provider value={v}>
      <TimeCtx.Provider value={t}>{children}</TimeCtx.Provider>
    </EventsCtx.Provider>
  )
}

export const useTime = () => useContext(TimeCtx)
export const useEvents = () => useContext(EventsCtx)
