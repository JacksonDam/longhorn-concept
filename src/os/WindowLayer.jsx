// All windows of the session (os/wm.js), back to front, each as a PlexWindow of its app.
// DesktopScene renders this between the wallpaper and the sidebar.
import { useTime, useEvents } from '../core/time.jsx'
import { windows, focusedWindow } from './wm.js'
import { getApp } from './apps.js'
import { PlexWindow } from './PlexWindow.jsx'
import { emit } from '../core/events.js'

// dev/test hook: scripted window input (tools, benches)
if (typeof window !== 'undefined') window.__wm = { emit, windows, focusedWindow }

export function WindowLayer() {
  const t = useTime()
  useEvents()
  const list = windows(t)
  const focus = focusedWindow(t)
  return (
    <>
      {list.map((w, i) => (
        <PlexWindow key={w.id + ':' + w.openedAt} win={w} app={getApp(w.app)} t={t} active={focus?.id === w.id} />
      ))}
    </>
  )
}
