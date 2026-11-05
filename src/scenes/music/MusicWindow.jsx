// Compatibility: the my Music window is now the 'music' app of the Plex window system
// (src/apps/music, os/PlexWindow, os/WindowLayer). musicWindowState keeps the old interface
// for the taskbar: { exists, openedAt, minimized, changedAt }.
import { getWindow } from '../../os/wm.js'
import { WindowLayer } from '../../os/WindowLayer.jsx'

export function musicWindowState(t) {
  const w = getWindow(t, 'music')
  if (!w || w.state === 'closed') return { exists: false, minimized: false, closedAt: w ? w.changedAt : undefined }
  return {
    exists: true,
    openedAt: w.openedAt,
    minimized: w.state === 'minimized',
    changedAt: w.lastAction === 'open' ? w.openedAt : w.changedAt,
  }
}

export const MusicWindow = WindowLayer
