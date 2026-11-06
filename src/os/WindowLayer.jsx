// All windows of the session (os/wm.js), back to front, each as a PlexWindow of its app.
// DesktopScene renders this between the wallpaper and the sidebar.
import { useTime, useEvents } from '../core/time.jsx'
import { windows, focusedWindow } from './wm.js'
import { getApp } from './apps.js'
import { PlexWindow, quietKey, beamOf, blurringWindows } from './PlexWindow.jsx'
import { activeIds, activeLevels } from './focus.js'
import { Beam } from './Beam.jsx'
import { now } from '../core/clock.js'
import { emit } from '../core/events.js'

// dev/test hook: scripted window input (tools, benches); looks(): the active look's level per window
if (typeof window !== 'undefined') window.__wm = { emit, windows, focusedWindow, looks: (t = now()) => Object.fromEntries(activeLevels(windows, t)) }

// The windows drawn active and the level of their active look: os/focus.js (the hand-over
// rules for open, close and minimise, and the cross-fade).
export function WindowLayer() {
  const t = useTime()
  useEvents()
  const list = windows(t)
  const active = activeIds(list, t)
  const blurring = blurringWindows(list, t)
  const looks = activeLevels(windows, t)
  // stable DOM order (by id) with the stacking order as z-index, so focusing a window never
  // moves DOM (which would repaint its layers); the layer is one stacking context below the shell
  // (the windows' own stacking numbers, os/wm.js z, not their places in the list: opening or
  // closing a window then never restacks the others)
  let zTop = 1
  const z = new Map(list.map((w) => {
    const v = (w.z || 0) + 2
    zTop = Math.max(zTop, v)
    return [w.id, v]
  }))
  const order = [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  // one beam, always mounted (its layers stay rasterised), driven by the latest window animation
  let beam = null
  let beamT = -Infinity
  for (const w of list) {
    if (w.lastAction === 'initial') continue
    const at = w.lastAction === 'open' ? w.openedAt : w.changedAt
    if (at <= beamT) continue
    const b = beamOf(w, getApp(w.app), t)
    if (b && b.rel != null && b.rel > -2 && b.rel < 20) {
      beam = b
      beamT = at
    }
  }
  return (
    <div style={{ position: 'absolute', inset: 0, isolation: 'isolate', pointerEvents: 'none' }}>
      {order.map((w) => {
        const app = getApp(w.app)
        return <PlexWindow key={w.id} win={w} app={app} t={t} active={active.has(w.id)} look={looks.get(w.id) ?? 0} z={z.get(w.id)} quiet={quietKey(w, app, t)} blurs={!blurring || blurring.has(w.id)} />
      })}
      <div style={{ position: 'absolute', inset: 0, zIndex: zTop + 1, pointerEvents: 'none' }}>
        <Beam {...(beam || { rel: null })} />
      </div>
    </div>
  )
}
