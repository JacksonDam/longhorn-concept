// The time a control draws at, and whether it is the live rendering.
//
// A PlexWindow renders its Content several times: the live layer (t = the clock) and motion-blur
// copies (t = a snapshot that only changes when the content settles on new state). Controls read
// their time from the nearest <UIScope> so a copy re-renders only with its snapshot, and they put
// menus, tooltips and real <input>s on the live layer only. Outside a scope they follow the clock.
//
//   export default { ..., Content: scoped(MyContent) }   wraps an app's Content
//   useUITime(), useLive()
import { createContext, memo, useContext, useMemo } from 'react'
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
// while a continuous visual plays (a playing track, a slide show), and `until(win)` lets an intro
// of the content's own play to that time and holds its end after (my Pictures' header). Gating
// applies only when an options object is passed (scoped(C, {})).
export function scoped(Inner, opts) {
  const { watch = [], settle = 0.8, alive, until } = opts || {}
  const gate = !!opts // opt-in: without options the content follows the window's time as is
  const M = memo(Inner, sameProps)
  function Scoped(props) {
    const live = props.live ?? true
    const { win, t } = props
    let tt = t
    if (gate && win && !(alive && win.state === 'open' && alive(win, t))) {
      const le = Math.max(win.openedAt, lastRelevant(t, win.id, watch))
      if (t - le > settle) tt = le + settle
      if (until) tt = Math.max(tt, Math.min(t, until(win)))
    }
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
