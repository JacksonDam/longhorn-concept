// Desktop shell: wallpaper, the window layer, sidebar, taskbar, the my Music flyout, the
// Start menu, the shell's flyouts and menus.
// `since` is the time of 'login.submit'; the desktop's entrance animates from it.
import { memo, useEffect, useRef } from 'react'
import { WindowLayer } from '../../os/WindowLayer.jsx'
import { useTime, useEvents } from '../../core/time.jsx'
import { FPS } from '../../core/clock.js'
import { lastOfType } from '../../os/logIndex.js'
import { asset, preload } from '../../core/preload.js'
import { clamp, ease } from '../../core/anim.js'
import { ContextMenu, DropMenu, contextHandler, closeMenu } from '../../ui/index.js'
import { userInfo, wallpaper } from '../../os/session.js'
import { mediaState } from '../../os/media.js'
import { IconDefs } from './icons.jsx'
import { Sidebar, PANEL } from './Sidebar.jsx'
import { SidebarHits, SidebarLive, mailState } from './SidebarHits.jsx'
import { TaskbarLayer } from './TaskbarLayer.jsx'
import { Flyout, flyoutState, closeFlyout, hoverLevel } from './Flyout.jsx'
import { StartMenu } from './StartMenu.jsx'
import { WeatherFlyout, CalendarFlyout } from './Flyouts.jsx'
import { closePopups, sidebarVisible, setSessionFloor } from './shellState.js'
import { USER_MENU, STATUS_MENU } from './sidebarMenus.js'
import { DESK_MENU } from './deskMenu.js'
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
  'wallpaper-leaf.webp',
].map((f) => asset('img/desktop/' + f))
preload(IMAGES)

// The wallpaper photo is the 4:3 crop x 94..1459 of the 1536x1024 source, mapped onto the
// stage at scale 0.70315 (fitted with SIFT against the reference frames). Display Properties
// can swap it for a plain colour (os/session.js wallpaper()).
const Photo = memo(function Photo() {
  return (
    <img
      src={asset('img/desktop/wallpaper.webp')}
      alt=""
      draggable={false}
      style={{ position: 'absolute', left: 0.16, top: 0.58, width: 959.8, height: 720.04 }}
    />
  )
})
const PHOTO = <Photo />
function Wallpaper({ wp, dim }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: wp.kind === 'color' ? wp.color : '#000', visibility: wp.kind === 'color' ? 'visible' : 'hidden' }} />
      <div style={{ position: 'absolute', inset: 0, visibility: wp.kind === 'photo' ? 'visible' : 'hidden' }}>{PHOTO}</div>
      {wp.kind === 'image' && <img src={wp.src} alt="" draggable={false} style={{ position: 'absolute', left: 0, top: 0, width: 960, height: 720, objectFit: 'cover' }} />}
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: dim, visibility: dim > 0 ? 'visible' : 'hidden' }} />
    </>
  )
}

// marquee offset of the strip's title while a track plays (20 px/s, a 40 px gap)
const marquee = (title, pos) => (pos * 20) % (title.length * 4.3 + 40)

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

const SIDEBAR_HITS = <SidebarHits />

// since: the session's 'login.submit' time, Infinity between sessions (the scene stays mounted
// under the login screen and draws nothing of the shell); user: the session's login id.
export function DesktopScene({ since, user: userId }) {
  const t = useTime()
  useEvents()
  const pendingEl = useRef(null)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      closePopups()
      closeFlyout()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])
  const pending = since === Infinity
  // between sessions nothing changes: reuse the element tree (React bails out on it)
  if (pending && pendingEl.current) return pendingEl.current
  if (!pending) pendingEl.current = null
  setSessionFloor(since)
  const f = framesSince(t, since)
  const op = sidebarOpacity(f)
  const haze = Math.min(ramp(f, 516, 518), 1 - ramp(f, 518, 520.5)) * 0.1
  const fly = flyoutState(t)
  // media strip hover highlight: fades in over 3.1 frames, out over 5.5 (the brighter
  // flashes around the flyout's opening and closing are its own motion-blurred ghost)
  const mediaHL = { hover: hoverLevel(t, 'sb.media', 3.1, 5.5) }
  const user = userId ? userInfo(userId) : null
  const ms = mediaState(t)
  const media = { title: ms.track.display, playing: ms.playing, scroll: ms.playing || ms.position > 0 ? marquee(ms.track.display, ms.position) : 0 }
  // the clock's chevron slides the sidebar out to the right and back (6 frames)
  const sb = sidebarVisible(t)
  const k = ease.inOut(clamp(((t - sb.at) * FPS) / 6))
  const slide = PANEL.w * (sb.visible ? 1 - k : k) * (sb.at === -Infinity ? 0 : 1)
  // desktop context menu > Refresh: a short dip of the wallpaper
  const rf = lastOfType(t, 'desk.refresh')
  const rdf = rf ? (t - rf.t) * FPS : Infinity
  const dim = rdf < 6 ? 0.25 * (1 - Math.abs(rdf - 1.5) / 4.5) * (rdf < 1.5 ? rdf / 1.5 : 1) : 0
  const el = (
    <div
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
      onPointerDown={() => {
        if (fly.open) closeFlyout()
        closePopups()
      }}
    >
      <IconDefs />
      <Wallpaper wp={wallpaper(t)} dim={Math.max(0, dim)} />
      {/* the desktop surface: right-click opens the desktop menu */}
      <div style={{ position: 'absolute', inset: 0 }} onContextMenu={contextHandler('desk.ctx', DESK_MENU, () => closePopups())} />
      <WindowLayer />
      <Sidebar opacity={op} haze={haze} mediaHL={mediaHL} user={user} media={media} slide={slide} mail={mailState(t, since)} live={<SidebarLive t={t} />} hits={SIDEBAR_HITS} />
      <TaskbarLayer t={t} f={f} sidebarHidden={!sb.visible} sidebarAt={sb.at} />
      <Flyout t={t} />
      <StartMenu t={t} user={user} />
      <WeatherFlyout t={t} />
      <CalendarFlyout t={t} />
      <ContextMenu id="desk.ctx" items={DESK_MENU} />
      <DropMenu id="sb.user" items={USER_MENU} />
      <DropMenu id="sb.status" items={STATUS_MENU} />
    </div>
  )
  if (pending) pendingEl.current = el
  return el
}

void closeMenu
