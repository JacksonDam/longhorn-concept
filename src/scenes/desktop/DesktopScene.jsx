// Desktop: wallpaper, the my Music window layer, sidebar, taskbar, my Music flyout.
// `since` is the time of 'login.submit'; the desktop's entrance animates from it.
import { MusicWindow } from '../music/MusicWindow.jsx'

export function DesktopScene({ since }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#c8641e' }} data-since={since}>
      <MusicWindow />
    </div>
  )
}
