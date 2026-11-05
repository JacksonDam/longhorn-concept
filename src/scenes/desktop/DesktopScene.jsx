// Desktop: wallpaper, the my Music window layer, sidebar, taskbar, my Music flyout.
// `since` is the time of 'login.submit'; the desktop's entrance animates from it.
import { memo } from 'react'
import { MusicWindow } from '../music/MusicWindow.jsx'
import { useTime, useEvents } from '../../core/time.jsx'
import { asset, preload } from '../../core/preload.js'
import { IconDefs } from './icons.jsx'
import { Sidebar } from './Sidebar.jsx'
import { TaskbarLayer } from './TaskbarLayer.jsx'
import { Flyout, flyoutState, toggleFlyout, closeFlyout } from './Flyout.jsx'
import { framesSince, ramp } from './timing.js'

const IMAGES = [
  'wallpaper.webp',
  'glass.webp',
  'user-sondra.webp',
  'buddy-dog.webp',
  'buddy-duck.webp',
  'buddy-kick.webp',
  'photo-standin.webp',
  'ic-outlook.webp',
  'ic-ie.webp',
  'ic-mymusic.webp',
  'ic-word.svg',
  'ic-winamp3.webp',
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

function sidebarOpacity(f) {
  return {
    panel: ramp(f, 513, 520),
    header: ramp(f, 520, 521),
    name: ramp(f, 569, 573),
    seattle: ramp(f, 522, 524),
    mail: ramp(f, 523, 525),
    media: ramp(f, 524, 526),
    buddies: ramp(f, 525, 527),
    photo: ramp(f, 525.5, 527),
    online: ramp(f, 527, 529),
    thumbs: ramp(f, 527, 529.5),
  }
}

export function DesktopScene({ since }) {
  const t = useTime()
  useEvents()
  const f = framesSince(t, since)
  const op = sidebarOpacity(f)
  const haze = Math.min(ramp(f, 515, 518), 1 - ramp(f, 519, 521)) * 0.35
  const fly = flyoutState(t)
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
      <Sidebar opacity={op} haze={haze} onMedia={toggleFlyout} />
      <TaskbarLayer t={t} f={f} />
      <Flyout t={t} />
    </div>
  )
}
