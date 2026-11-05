// All windows of the session (os/wm.js), back to front, each as a PlexWindow of its app.
// DesktopScene renders this between the wallpaper and the sidebar.
import { useTime, useEvents } from '../core/time.jsx'
import { windows, focusedWindow, sessionStart } from './wm.js'
import { getApp, listApps } from './apps.js'
import { PlexWindow, MOUNT_EVERY, DEFAULT_COPIES, quietKey, beamOf } from './PlexWindow.jsx'
import { activeIds, activeLevels } from './focus.js'
import { Beam } from './Beam.jsx'
import { FPS } from '../core/clock.js'
import { emit } from '../core/events.js'

// dev/test hook: scripted window input (tools, benches)
if (typeof window !== 'undefined') window.__wm = { emit, windows, focusedWindow }

// Apps with `prewarm: true` (my Music, which the video opens) get a hidden "ghost" window from
// the session start: its layers mount and paint while nothing is happening, and the real window
// takes them over when it opens (same React key, content memoised on time since its open).
function withGhosts(list, S) {
  if (S == null) return list
  const out = [...list]
  for (const app of listApps()) {
    if (!app.prewarm || list.some((w) => w.id === app.id)) continue
    out.unshift({
      id: app.id, app: app.id, props: {}, x: null, y: null, z: 0, openedAt: S, state: 'closed', changedAt: S,
      lastAction: 'ghost', maximized: false, maximizedAt: null, focusedAt: -Infinity, initial: false,
    })
  }
  // one background mount queue: from 1 s after the session start (the desktop entrance is over),
  // the ghosts first, then the windows running at login, one copy every MOUNT_EVERY frames
  let at = S + 1
  return out.map((w) => {
    const app = getApp(w.app)
    if (!(w.lastAction === 'ghost' || w.initial || app.prewarm)) return w
    const r = { ...w, mountStart: at }
    at += ((app.copies ?? DEFAULT_COPIES) - 1) * (MOUNT_EVERY / FPS)
    return r
  })
}

// The windows drawn active and the level of their active look: os/focus.js (the hand-over
// rules for open, close and minimise, and the cross-fade).
export function WindowLayer() {
  const t = useTime()
  useEvents()
  const list = withGhosts(windows(t), sessionStart(t))
  const active = activeIds(list, t)
  const looks = activeLevels(windows, t)
  // stable DOM order (by id) with the stacking order as z-index, so focusing a window never
  // moves DOM (which would repaint its layers); the layer is one stacking context below the shell
  const z = new Map(list.map((w, i) => [w.id, i + 1]))
  const order = [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  // one beam, always mounted (its layers stay rasterised), driven by the latest window animation
  let beam = null
  let beamT = -Infinity
  for (const w of list) {
    if (w.lastAction === 'ghost' || w.lastAction === 'initial') continue
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
        return <PlexWindow key={w.id} win={w} app={app} t={t} active={active.has(w.id)} look={looks.get(w.id) ?? 0} z={z.get(w.id)} quiet={quietKey(w, app, t)} />
      })}
      <div style={{ position: 'absolute', inset: 0, zIndex: list.length + 1, pointerEvents: 'none' }}>
        <Beam {...(beam || { rel: null })} />
      </div>
    </div>
  )
}
