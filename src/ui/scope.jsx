// The time a control draws at, and whether it is the live rendering.
//
// A PlexWindow renders its Content several times: the live layer (t = the clock) and motion-blur
// copies (t = a snapshot that only changes when the content settles on new state). Controls read
// their time from the nearest <UIScope> so a copy re-renders only with its snapshot, and they put
// menus, tooltips and real <input>s on the live layer only. Outside a scope they follow the clock.
//
//   export default { ..., Content: scoped(MyContent) }   wraps an app's Content
//   useUITime(), useLive()
import { createContext, memo, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { now, onFrame } from '../core/clock.js'
import { RUNNING_AT_LOGIN } from '../os/wm.js'
import { useTime } from '../core/time.jsx'
import { lastRelevant } from './state.js'

const UICtx = createContext(null)

export function UIScope({ t, live = true, children }) {
  const v = useMemo(() => ({ t, live }), [t, live])
  return <UICtx.Provider value={v}>{children}</UICtx.Provider>
}

// the scope's time (a control's position inside or outside a scope never changes, so the hook
// order is stable per instance)
export function useUITime() {
  const ctx = useContext(UICtx)
  if (ctx) return ctx.t
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useTime()
}
export const useLive = () => useContext(UICtx)?.live ?? true

// Wrap an app's Content. PlexWindow passes `live` (true on copy 0, the window you interact with);
// rendered elsewhere, the content counts as live.
// The content renders at the time of its window's latest relevant event plus `settle` (hover
// fades, menus and carets run in that span), so other windows' input costs it nothing; `watch`
// adds event families it depends on ('media', 'mail', ...), `alive(win, t)` keeps it running
// while a continuous visual plays (a playing track, a slide show). Gating applies only when an
// options object is passed (scoped(C, {})).
export function scoped(Inner, opts) {
  const { watch = [], settle = 0.8, alive } = opts || {}
  const gate = !!opts // opt-in: without options the content follows the window's time as is
  const M = memo(Inner, sameProps)
  function Scoped(props) {
    const live = props.live ?? true
    const { win, t } = props
    let tt = t
    if (gate && win && !(alive && win.state === 'open' && alive(win, t))) {
      const le = Math.max(win.openedAt, lastRelevant(t, win.id, watch))
      if (t - le > settle) tt = le + settle
    }
    const seq = useSeq(win)
    const ready = useMountGate(win, seq)
    if (!ready) return null
    return (
      <UIScope t={tt} live={live}>
        <M {...props} t={tt} live={live} />
      </UIScope>
    )
  }
  Scoped.displayName = 'Scoped(' + (Inner.displayName || Inner.name || 'Content') + ')'
  return Scoped
}

const winSame = (a, b) =>
  a === b ||
  (!!a && !!b && a.id === b.id && a.openedAt === b.openedAt && a.state === b.state && a.maximized === b.maximized && a.x === b.x && a.y === b.y && a.lastAction === b.lastAction && a.changedAt === b.changedAt && JSON.stringify(a.props) === JSON.stringify(b.props))
function sameProps(a, b) {
  for (const k in a) if (k !== 'win' && a[k] !== b[k]) return false
  for (const k in b) if (!(k in a)) return false
  // a motion-blur copy catches up with window changes when its own snapshot time moves on
  // (PlexWindow staggers those by copy), so a change never re-renders every copy in one frame
  if (b.live === false && a.live === false) return true
  return winSame(a.win, b.win)
}

// ---- staggered mounting of windows nobody has seen yet ----------------------------------------
// The apps already running at login exist minimised from the login frame, each with all its
// motion-blur copies. Mounting all of them in the login transition's frames is a 30 ms spike, so
// the content of a window that has never been shown mounts one copy at a time, a few frames
// apart, in the quiet frames after the desktop has appeared. Anything shown mounts at once.
const GATE_START = 0.7 // s after the window's creation (the login)
const GATE_STEP = 0.07 // s between two mounts (about two video frames)
const seqs = new Map()
function useSeq(win) {
  // window slot (the login order) * 9 + the order this copy was mounted in (copy 0 first)
  const [s] = useState(() => {
    if (!win) return 0
    const k = win.id + '@' + win.openedAt
    const n = seqs.get(k) || 0
    seqs.set(k, n + 1)
    const slot = Math.max(0, RUNNING_AT_LOGIN.findIndex((r) => r.id === win.id))
    return slot * 9 + n
  })
  return s
}
// the clock, read only while `on` (a waiting gate), so idle instances cost nothing per frame
function useTimeWhile(on) {
  const [t, setT] = useState(() => now())
  useEffect(() => (on ? onFrame((tt) => setT(tt)) : undefined), [on])
  return t
}
function useMountGate(win, seq) {
  const hidden = !!win && win.lastAction === 'initial' && win.state === 'minimized'
  const at = win ? win.openedAt + GATE_START + seq * GATE_STEP : 0
  const [ready, setReady] = useState(() => !hidden)
  const due = hidden && !ready
  return useGateClock(due, at, ready, setReady, hidden)
}
function useGateClock(due, at, ready, setReady, hidden) {
  // read the clock only while waiting
  const t = useTimeWhile(due)
  useLayoutEffect(() => {
    if (!ready && (!hidden || t >= at)) setReady(true)
  })
  return ready || !hidden
}
