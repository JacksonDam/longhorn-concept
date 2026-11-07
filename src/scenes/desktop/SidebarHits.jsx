// The sidebar's interactive layer: hit areas for every tile and row, and the hover
// highlights drawn under the text. Every tile does something (docs/briefs/os.md, Shell):
// header -> user menu, Seattle -> weather flyout, Mail -> Outlook (on that message), media
// strip -> flyout (title / strip) and play, stop, previous, next (os/media.js), Buddies ->
// status menu, a buddy -> an instant message window, photo -> my Pictures, Go Online ->
// Internet Explorer, the four thumbnails -> my Documents, Display Properties, my Pictures,
// my Computer.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { openMenu, pt, valueOf, lastOf } from '../../ui/index.js'
import { mediaState } from '../../os/media.js'
import { MAIL, MAIL_Y0, MAIL_DY, BUDDIES } from './Sidebar.jsx'
import { hover, togglePopup, closePopups } from './shellState.js'
import { launch } from './appInfo.jsx'
import { toggleFlyout, closeFlyout } from './Flyout.jsx'
import { USER_MENU, STATUS_MENU, besideSidebar } from './sidebarMenus.js'

const X = 858
const W = 102
// the orange display picture has no name in the video; its buddy is Jeff (as in "Hi Jeff")
const buddyName = (b) => b.name || 'Jeff'

export const ROWS = [
  { id: 'sb.user', x: X, y: 0, w: W, h: 24, go: () => openMenu('sb.user', true, besideSidebar(USER_MENU, 2)), tile: true },
  // (toggle: a click on the tile while its flyout is open closes it, like the media strip's;
  // closing the popups first would reopen it, replaying the fly-in on every click)
  { id: 'sb.weather', x: X, y: 25, w: W, h: 38, go: () => togglePopup('weather'), tile: true, toggle: true },
  { id: 'sb.mailhead', x: X, y: 66, w: W, h: 19, go: () => launch.email(), band: true },
  ...MAIL.map((m, i) => ({ id: 'sb.mail.' + i, x: X, y: MAIL_Y0 + i * MAIL_DY - 14.4, w: W, h: MAIL_DY, go: () => openMail(i, m.text), band: true })),
  { id: 'sb.budhead', x: X, y: 318, w: W, h: 19, go: () => openMenu('sb.status', true, besideSidebar(STATUS_MENU, 318)), band: true },
  ...BUDDIES.map((b, i) => ({ id: 'sb.buddy.' + i, x: X, y: b.y - 15, w: W, h: 18.75, go: () => launch.im(buddyName(b)), band: true })),
  { id: 'sb.photo', x: 862, y: 519, w: 96, h: 73, go: () => launch.pictures(), tile: true },
  { id: 'sb.online', x: X, y: 595, w: W, h: 25, go: () => launch.internet('www.msn.com'), band: true },
  { id: 'sb.thumb.0', x: 875, y: 627, w: 33, h: 29, go: () => launch.documents(), tile: true },
  { id: 'sb.thumb.1', x: 912, y: 627, w: 33, h: 29, go: () => launch.display(), tile: true },
  { id: 'sb.thumb.2', x: 875, y: 661, w: 33, h: 29, go: () => launch.pictures(), tile: true },
  { id: 'sb.thumb.3', x: 912, y: 661, w: 33, h: 29, go: () => launch.computer(), tile: true },
]
const MEDIA_BTNS = [
  { id: 'sb.play', x: 866, y: 279, w: 23, h: 23, r: 11.5, go: () => (mediaState(now()).playing ? emit('media.pause') : emit('media.play')) },
  { id: 'sb.stop', x: 894, y: 284, w: 14, h: 14, r: 7, go: () => emit('media.stop') },
  { id: 'sb.prev', x: 914, y: 284, w: 14, h: 14, r: 7, go: () => emit('media.prev') },
  { id: 'sb.next', x: 932, y: 284, w: 14, h: 14, r: 7, go: () => emit('media.next') },
]

const enter = (id) => (e) => emit('hover', { id, on: true, ...pt(e) })
const leave = (id) => () => emit('hover', { id, on: false })

export const SidebarHits = memo(function SidebarHits() {
  return (
    <>
      {ROWS.map((r) => (
        <div
          key={r.id}
          style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, pointerEvents: 'auto' }}
          onPointerEnter={enter(r.id)}
          onPointerLeave={leave(r.id)}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.stopPropagation()
            closeFlyout()
            if (!r.toggle) closePopups()
            r.go(e)
          }}
        />
      ))}
      {/* the media strip: the whole tile keeps the video's 'sb.media' hover; the title and the
          strip open the my Music flyout, the round buttons drive the player */}
      <div
        style={{ position: 'absolute', left: X, top: 258, width: W, height: 50, pointerEvents: 'auto' }}
        onPointerEnter={enter('sb.media')}
        onPointerLeave={leave('sb.media')}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.stopPropagation()
          closePopups()
          toggleFlyout()
        }}
      >
        {MEDIA_BTNS.map((b) => (
          <div
            key={b.id}
            style={{ position: 'absolute', left: b.x - X, top: b.y - 258, width: b.w, height: b.h, borderRadius: '50%', pointerEvents: 'auto' }}
            onPointerEnter={enter(b.id)}
            onPointerLeave={leave(b.id)}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              e.stopPropagation()
              emit('press', { id: b.id, on: true })
              b.go()
            }}
            onPointerUp={() => emit('press', { id: b.id, on: false })}
          />
        ))}
      </div>
    </>
  )
})

// hover highlights (under the text): bands for list rows, a soft glow for tiles and buttons
export function SidebarLive({ t }) {
  const out = []
  for (const r of ROWS) {
    const lv = hover(t, r.id)
    if (lv <= 0) continue
    out.push(
      <div
        key={r.id}
        style={{
          position: 'absolute',
          left: r.x + (r.band ? 2 : 0),
          top: r.y,
          width: r.w - (r.band ? 2 : 0),
          height: r.h,
          opacity: lv,
          borderRadius: r.tile ? 2 : 0,
          background: r.band
            ? 'linear-gradient(to right, rgba(170,210,255,0.42), rgba(150,195,250,0.26) 60%, rgba(150,195,250,0.14))'
            : 'rgba(200,225,255,0.22)',
          boxShadow: r.tile ? 'inset 0 0 0 1px rgba(210,232,255,0.7)' : undefined,
        }}
      />,
    )
  }
  for (const b of MEDIA_BTNS) {
    const lv = hover(t, b.id)
    if (lv <= 0) continue
    out.push(<div key={b.id} style={{ position: 'absolute', left: b.x - 2, top: b.y - 2, width: b.w + 4, height: b.h + 4, borderRadius: '50%', opacity: lv, background: 'radial-gradient(circle, rgba(220,240,255,0.65), rgba(160,210,255,0.25) 60%, rgba(160,210,255,0) 72%)' }} />)
  }
  return out
}

// a mail row: select it, mark it read, open it in Outlook
function openMail(i, subject) {
  const t = now()
  const read = valueOf(t, 'sb.mailread', [])
  emit('ui.value', { id: 'sb.mailsel', value: i })
  if (!read.includes(i)) emit('ui.value', { id: 'sb.mailread', value: [...read, i] })
  launch.email(subject)
}
let mailCache = { key: '', v: null }
// the mail tile's state at t (one object per state, for the memoised tile)
export function mailState(t, since) {
  const s = lastOf(t, 'ui.value', 'sb.mailsel')
  const r = lastOf(t, 'ui.value', 'sb.mailread')
  const sel = s && s.t >= since ? s.value : 1
  const read = r && r.t >= since ? r.value : []
  const key = sel + '|' + read.join(',')
  if (mailCache.key !== key) mailCache = { key, v: { sel, read } }
  return mailCache.v
}
