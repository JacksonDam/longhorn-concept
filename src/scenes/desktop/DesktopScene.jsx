// Desktop: wallpaper, the my Music window layer, sidebar, taskbar, my Music flyout.
// `since` is the time of 'login.submit'; the desktop's entrance animates from it.
import { memo } from 'react'
import { MusicWindow } from '../music/MusicWindow.jsx'
import { useTime, useEvents } from '../../core/time.jsx'
import { asset, preload } from '../../core/preload.js'
import { IconDefs } from './icons.jsx'
import { Sidebar } from './Sidebar.jsx'
import { TaskbarLayer } from './TaskbarLayer.jsx'
import { Flyout, flyoutState, toggleFlyout, closeFlyout, hoverLevel } from './Flyout.jsx'
import { framesSince, ramp } from './timing.js'

const IMAGES = [
  'wallpaper.webp',
  'glass.webp',
  'user-sondra.webp',
  'buddy-dog.webp',
  'buddy-duck.webp',
  'buddy-kick.webp',
  'photo-standin.webp',
  'ic-ie.webp',
  'ic-mymusic.webp',
  'ic-word.svg',
  'flag.svg',
  'album-standin.webp',
].map((f) => asset('img/desktop/' + f))
preload(IMAGES)

// The wallpaper photo is the 4:3 crop x 94..1459 of the 1536x1024 source, mapped onto the
// stage at scale 0.70315 (fitted with SIFT against the reference frames).
const Wallpaper = memo(function Wallpaper() {
  return (
    <img
      src={asset('img/desktop/wallpaper.webp')}
      alt=""
      draggable={false}
      style={{ position: 'absolute', left: 0.16, top: 0.58, width: 959.8, height: 720.04 }}
    />
  )
})

// Tile entrance (absolute video frames; each tile fades in over one frame, measured as
// half opacity on the frame it first shows): see docs/desktop-spec.md.
function sidebarOpacity(f) {
  return {
    panel: ramp(f, 515, 520.5),
    header: ramp(f, 520.4, 521.2),
    headerColor: ramp(f, 568.5, 574),
    name: ramp(f, 568.5, 574),
    seattle: ramp(f, 522.5, 523.5),
    mail: ramp(f, 523.5, 524.5),
    media: ramp(f, 524.5, 525.5),
    buddies: ramp(f, 525.5, 526.5),
    photo: ramp(f, 526.4, 527.5),
    online: ramp(f, 527.4, 528.5),
    thumbs: ramp(f, 528.4, 529.5),
  }
}

export function DesktopScene({ since }) {
  const t = useTime()
  useEvents()
  const f = framesSince(t, since)
  const op = sidebarOpacity(f)
  const haze = Math.min(ramp(f, 516, 518), 1 - ramp(f, 518, 520.5)) * 0.1
  const fly = flyoutState(t)
  // media strip hover highlight: fades in over 3.1 frames, out over 5.5 (the brighter
  // flashes around the flyout's opening and closing are its own motion-blurred ghost)
  const mediaHL = { hover: hoverLevel(t, 'sb.media', 3.1, 5.5) }
  return (
    <div
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
      onPointerDown={() => {
        if (fly.open) closeFlyout()
      }}
    >
      <IconDefs />
      <Wallpaper />
      <MusicWindow />
      <Sidebar opacity={op} haze={haze} onMedia={toggleFlyout} mediaHL={mediaHL} />
      <TaskbarLayer t={t} f={f} />
      <Flyout t={t} />
    </div>
  )
}
