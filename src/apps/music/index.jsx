// my Music: the video's explorer window, as an app of the Plex window system (os/PlexWindow).
// The video's animations (header intro, album page, minimise/restore) are unchanged.
import { memo } from 'react'
import { last, all } from '../../core/events.js'
import { FPS } from '../../core/clock.js'
import { asset } from '../../core/preload.js'
import { Txt } from '../../os/text.jsx'
import { EXPLORER_TOP } from '../../os/ExplorerChrome.jsx'
import { OPEN_DELAY } from '../../os/windowAnim.js'
import * as I from '../../os/icons.jsx'
import { BodyBg, EnjoyGroup, TaskPane, GridBar, Scrollbar, StatusBar } from '../../scenes/music/Body.jsx'
import { AlbumGrid } from '../../scenes/music/Grid.jsx'
import { Header } from '../../scenes/music/Header.jsx'
import { HEADER, PAGE_DELAY, smoothRamp, toRel } from '../../scenes/music/timeline.js'
import { ALBUMS } from '../../scenes/music/albums.js'

// the window's reference time: rel 0 = music.open + OPEN_DELAY (video frame 694)
const openT = (win) => win.openedAt + OPEN_DELAY / FPS

// selection, hover and album page, derived from the log (window session = since it opened)
export function viewState(t, t0) {
  const after = (e) => e.t >= t0
  const s = last(t, (e) => e.type === 'music.album' && after(e))
  let first = null
  for (const e of all(t, (e) => e.type === 'music.album' && after(e) && ALBUMS[e.id]?.tweet)) {
    first = e
    break
  }
  const h = last(t, (e) => e.type === 'hover' && after(e) && String(e.id).startsWith('music.album.'))
  const th = last(t, (e) => e.type === 'hover' && after(e) && String(e.id).startsWith('music.track.'))
  const tr = last(t, (e) => e.type === 'music.track' && after(e))
  return {
    sel: s ? { id: s.id, t: s.t } : null,
    hover: h && h.on ? +String(h.id).slice('music.album.'.length) : -1,
    track: tr ? tr.n : 2,
    trackHover: th && th.on ? +String(th.id).slice('music.track.'.length) : -1,
    pageT: first ? first.t + PAGE_DELAY / FPS : null,
  }
}

// the client area (window-local layout of the video, shifted up by the explorer chrome)
function MusicContent({ win, t }) {
  const t0 = openT(win)
  const rel = toRel(t, t0)
  const vs = viewState(t, t0)
  const pageT = vs.pageT != null && t >= vs.pageT ? vs.pageT : null
  return (
    <div style={{ position: 'absolute', left: 0, top: -EXPLORER_TOP, width: 777, height: 654 }}>
      <BodyBg />
      <Header t={t} openT={t0} pageT={pageT} track={vs.track} trackHover={vs.trackHover} slabs="none" />
      <EnjoyGroup op={smoothRamp(rel, HEADER.enjoy[0], HEADER.enjoy[1])} />
      <TaskPane />
      <GridBar />
      <AlbumGrid t={t} hover={vs.hover} sel={vs.sel && t >= vs.sel.t ? vs.sel : null} />
      <Scrollbar />
      <StatusBar />
    </div>
  )
}

// the 3D slabs (device / album) live on every visible blur copy, rendered once per frame
function MusicOverlay({ win, t, skip }) {
  const t0 = openT(win)
  const vs = viewState(t, t0)
  const pageT = vs.pageT != null && t >= vs.pageT ? vs.pageT : null
  return <Header t={t} openT={t0} pageT={pageT} slabs="only" cache skip={skip} />
}

// the content a motion-blur copy shows: the settled state after the latest change
function snapshot(win, tk) {
  const t0 = openT(win)
  const vk = viewState(tk, t0)
  const pts = [t0 + 9 / FPS, t0 + 74 / FPS]
  if (vk.sel) pts.push(vk.sel.t + 10 / FPS)
  if (vk.pageT != null) pts.push(vk.pageT + 21 / FPS)
  let best = pts[0]
  for (const p of pts) if (p <= tk && p > best) best = p
  return best
}

// title: the equaliser glyph and "my Music" (light "my", heavy "Music"), as measured
const MusicTitle = memo(function MusicTitle() {
  return (
    <>
      <div style={{ position: 'absolute', left: 348, top: 4, width: 13, height: 10 }}>
        <I.TitleEq />
      </div>
      <Txt x={364} y={13.5} size={13.5} w={400} sx={0.95} c="#e3f3ff" parts={[['my ', { w: 300 }], ['Music', { w: 600 }]]} />
    </>
  )
})

export default {
  id: 'music',
  title: () => 'my Music',
  taskbarLabel: () => 'My Music',
  icon: asset('img/desktop/ic-mymusic.webp'),
  size: { w: 777, h: 654 },
  position: { x: 45, y: 23 },
  explorer: { crumbs: ['my Computer', 'my Pictures'], search: 'search my for...' },
  TitleContent: MusicTitle,
  Content: MusicContent,
  Overlay: MusicOverlay,
  snapshot,
  copies: 16,
  settle: 2.5,
}
