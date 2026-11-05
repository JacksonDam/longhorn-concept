// The "my Music" explorer window (owned by the music scene).
//
// Interface used by the desktop scene:
//   <MusicWindow />            rendered by DesktopScene between the wallpaper and the sidebar.
//   musicWindowState(t) -> { exists, openedAt, minimized, changedAt }
//       exists:    the window has been opened (event 'music.open')
//       minimized: currently minimised ('music.minimize' / 'music.restore' events)
//   The taskbar shows a "My Music" button while `exists`; clicking it emits
//   'music.restore' when minimised, 'music.minimize' otherwise.
// Events:
//   'music.open'      emitted by the flyout's "Go to my Music" (desktop scene)
//   'music.minimize'  title-bar minimise button or taskbar button
//   'music.restore'   taskbar button while minimised
//   'music.album' { id } album tile click
import { last } from '../../core/events.js'

export function musicWindowState(t) {
  const open = last(t, (e) => e.type === 'music.open')
  if (!open) return { exists: false, minimized: false }
  const mm = last(t, (e) => (e.type === 'music.minimize' || e.type === 'music.restore') && e.t >= open.t)
  return {
    exists: true,
    openedAt: open.t,
    minimized: mm?.type === 'music.minimize',
    changedAt: mm ? mm.t : open.t,
  }
}

export function MusicWindow() {
  return null
}
