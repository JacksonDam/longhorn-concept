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

// Wrap an app's Content: the copy that receives the clock's own time is the live one.
export function scoped(Inner) {
  const M = memo(Inner)
  function Scoped(props) {
    const clock = useTime()
    const live = props.live ?? props.t === clock
    return (
      <UIScope t={props.t} live={live}>
        <M {...props} live={live} />
      </UIScope>
    )
  }
  Scoped.displayName = 'Scoped(' + (Inner.displayName || Inner.name || 'Content') + ')'
  return Scoped
}
