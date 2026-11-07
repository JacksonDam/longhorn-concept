// my Music: the video's explorer window, as an app of the Plex window system (os/PlexWindow),
// made fully usable: library with scrolling, thumbnail / tiles / details views, grouping and
// arranging, the Size slider, search, album pages for every album, silent playback through
// os/media.js, task-pane links, menus and drop-downs. The video's frames are the defaults.
import { memo, useEffect } from 'react'
import { FPS } from '../../core/clock.js'
import { emit } from '../../core/events.js'
import { asset } from '../../core/preload.js'
import { Txt } from '../../os/text.jsx'
import { titleBaseline, CAP_BOOK } from '../../os/frame.js'
import { EXPLORER_TOP, PLACES } from '../../os/ExplorerChrome.jsx'
import * as I from '../../os/icons.jsx'
import { scoped, TextField, wid, valueOf, textOf } from '../../ui/index.js'
import { mediaState } from '../../os/media.js'
import { BodyBg, EnjoyGroup, TaskPane, FoldersPane, GridBar, StatusBar, ResizeGrip } from './Body.jsx'
import { AlbumView, GridScrollbar } from './Grid.jsx'
import { Header, INTRO_SHOTS } from './Header.jsx'
import { HEADER, smoothRamp, toRel } from './timeline.js'
import { TWEET_COVER } from './albums.js'
import { warmSlabs } from './SlabCanvas.jsx'
import { DEFAULTS, settings, gridLayout } from './layout.js'
import { viewState, pageAt } from './state.js'
import { musicActions, openT } from './actions.js'
import { rectAt } from './HeaderSlab.jsx'
import { wantPointer } from '../../core/Cursor.jsx'

// compile the 3D slab shader at load (never on the frame a slab first appears)
warmSlabs({ w: 4, h: 4, d: 2, map: TWEET_COVER })

const searchText = (t, win) => textOf(t, wid(win, 'search'))

// which track number is blue: the playing track of this page's album (the video: track 4)
function playingIndex(t, page) {
  if (!page || !page.album) return -1
  const m = mediaState(t)
  const a = page.album
  if (m && m.playing && m.track && m.track.title.startsWith(a.artist + ' - ')) {
    const i = a.tracks.findIndex((tr) => m.track.title === `${a.artist} - ${tr.title}`)
    if (i >= 0) return i
  }
  return a.artist === 'Tweet' ? 3 : -1
}

// the client area (the video's window-local layout, shifted up by the explorer chrome)
function MusicContent({ win, t, live, w, h }) {
  const W = w
  const H = h + EXPLORER_TOP
  const t0 = openT(win)
  const rel = toRel(t, t0)
  const s = settings(t, win)
  const vs = viewState(t, t0)
  const search = searchText(t, win)
  const L = gridLayout(s, W, H, search)
  const A = live ? musicActions(win) : null
  const sec = (name, def) => valueOf(t, wid(win, 'mv.sec.' + name), def)
  const left = s.folders ? 'folders' : s.tasks ? 'tasks' : null
  const n = L.items.length
  const status = search ? `${n} object${n === 1 ? '' : 's'} found` : vs.sel || !vs.deselected ? '1 object selected' : `${n} objects`
  return (
    <div style={{ position: 'absolute', left: 0, top: -EXPLORER_TOP, width: W, height: H }}>
      <BodyBg w={W} h={H} />
      {s.preview && (
        <Header t={t} openT={t0} page={vs.page} next={vs.next} track={vs.track} trackHover={live ? vs.trackHover : -1} playing={playingIndex(t, vs.page)} slabs="none" actions={A} />
      )}
      {left === 'tasks' && (
        <>
          <EnjoyGroup op={smoothRamp(rel, HEADER.enjoy[0], HEADER.enjoy[1])} A={A} collapsed={sec('enjoy', false)} />
          <TaskPane A={A} guide={sec('guide', false)} other={sec('other', true)} />
        </>
      )}
      {left === 'folders' && <FoldersPane A={A} />}
      <GridBar s={s} dx={L.view.x - 200} dy={L.view.y - 362} A={A} win={win} t={t} />
      <AlbumView win={win} t={t} L={L} sel={vs.sel} hover={live ? vs.hover : null} />
      <GridScrollbar win={win} t={t} L={L} x={W - 19} />
      <StatusBar text={status} w={W} h={H} />
      <ResizeGrip x={W - 24} y={H - 30} />
    </div>
  )
}

// the 3D slabs (device / album) on every visible blur copy, rendered once per frame
// (the slabs tilt towards the pointer: while the overlay is mounted the pointer's moves are logged)
function MusicOverlay({ win, t, skip, hidden }) {
  useEffect(() => wantPointer(), [])
  const s = settings(t, win)
  if (!s.preview) return null
  const t0 = openT(win)
  const vs = viewState(t, t0)
  return <Header t={t} openT={t0} page={vs.page} slabs="only" cache skip={skip} hidden={hidden} rect={rectAt(win, music)} />
}

// the content a motion-blur copy shows: the settled state after the latest change (the intro
// at rel 9 / 74 as the video's copies show it, the page and selection once settled, and any
// other change of this window `settle` s after its event)
function snapshot(win, tk, ev, settle) {
  const t0 = openT(win)
  const vk = viewState(tk, t0)
  const pts = INTRO_SHOTS.map((f) => t0 + f / FPS)
  if (vk.sel) pts.push(vk.sel.t + 10 / FPS)
  if (vk.page) pts.push(vk.page.t + 21 / FPS)
  let best = pts[0]
  for (const p of pts) if (p <= tk && p > best) best = p
  return Math.max(best, ev + settle)
}

// the live layer re-renders per frame only while time-driven visuals run (os/PlexWindow
// liveContentT): the header intro, page transitions, and the playing track's number
function liveTime(win, t, base) {
  const t0 = openT(win)
  if (toRel(t, t0) < 80) return t
  let ct = Math.max(base, t0 + 80 / FPS)
  const vs = viewState(t, t0)
  if (vs.page) {
    if (toRel(t, vs.page.t) < 23) return t
    ct = Math.max(ct, vs.page.t + 23 / FPS)
  }
  if (vs.sel) ct = Math.max(ct, Math.min(t, vs.sel.t + 10 / FPS))
  const m = mediaState(t)
  if (m.playing) ct = Math.max(ct, t - m.position)
  return Math.min(t, ct)
}

// what a blur copy shows at time t (copies never show hover): re-render only when it changes
function copyKey(win, t) {
  const t0 = openT(win)
  const rel = toRel(t, t0)
  const vs = viewState(t, t0)
  const s = settings(t, win)
  const stage = rel < 9 ? 'a' + Math.floor(rel * 4) : rel < 74 ? 'b' + Math.floor(rel) : 'c'
  return [stage, vs.sel?.key, vs.page?.album?.key ?? '-', vs.page ? Math.min(23, Math.floor(toRel(t, vs.page.t))) : -1, vs.track,
    s.size, s.view, s.group, s.arrange, s.tasks, s.folders, s.preview, searchText(t, win), valueOf(t, wid(win, 'grid.scroll'), null),
    valueOf(t, wid(win, 'mv.sec.enjoy'), 0), valueOf(t, wid(win, 'mv.sec.guide'), 0), valueOf(t, wid(win, 'mv.sec.other'), 0)].join('|')
}

// title: the equaliser glyph and "my Music" (light "my", heavy "Music"), as measured across;
// vertically centred on the window buttons by its cap height (os/frame.js), the glyph with it
const TITLE_Y = titleBaseline(13.5, CAP_BOOK)
const MusicTitle = memo(function MusicTitle({ w = 777 }) {
  const x = 348 + (w - 777) / 2
  return (
    <>
      <div style={{ position: 'absolute', left: x, top: 4 + TITLE_Y - 13.5, width: 13, height: 10 }}>
        <I.TitleEq />
      </div>
      <Txt x={x + 16} y={TITLE_Y} size={13.5} w={400} sx={0.95} c="#e3f3ff" parts={[['my ', { w: 300 }], ['Music', { w: 600 }]]} />
    </>
  )
})

// the search field in the address bar (filters the albums); a grey hint when empty. x: where the
// field starts, after the breadcrumbs (os/ExplorerChrome)
function MusicSearch({ win, t, x = 389, w = 777 }) {
  const id = wid(win, 'search')
  const text = textOf(t, id)
  return (
    <>
      {!text && (
        <Txt x={x} y={89.5} size={11} w={400} c="#8ab0d8">
          search for…
        </Txt>
      )}
      <TextField id={id} x={x - 3} y={78} w={Math.max(60, w - 21 - (x - 3))} h={17} variant="bare" size={11} pad={3} color="#2a4d80" />
    </>
  )
}

const music = {
  id: 'music',
  title: () => 'my Music',
  taskbarLabel: () => 'My Music',
  icon: asset('img/desktop/ic-mymusic.webp'),
  size: { w: 777, h: 654 },
  position: { x: 45, y: 23 },
  // the header (device / album page, title, buttons, track list) is laid out for the design width
  minSize: { w: 777, h: 520 },
  explorer: {
    crumbs: ['my Computer', 'my Pictures'],
    crumbMenus: [PLACES, PLACES],
    Search: MusicSearch,
    // Back returns from an album page to the device page, Forward goes to the page Back left
    nav: (win, t) => {
      const p = pageAt(t, openT(win))
      return { back: !!p?.album, forward: !!p?.fwd }
    },
    commands: (win, t) => {
      const A = musicActions(win)
      const s = settings(t, win)
      return [
        { id: 'hide', label: s.tasks || s.folders ? 'Hide Music Tasks' : 'Show Music Tasks', icon: 'hide', onClick: A.tasks },
        { id: 'up', label: 'Up a Folder', icon: 'up', onClick: A.up },
        { id: 'folders', label: 'Folders', icon: 'folders', onClick: A.folders },
        { id: 'find', label: 'Find', icon: 'find', onClick: A.find },
        { id: 'preview', label: 'Preview', icon: 'preview', onClick: A.preview },
      ]
    },
    pressed: (win, t) => {
      const s = settings(t, win)
      return [s.preview && 'preview', s.folders && 'folders'].filter(Boolean)
    },
    menus: (win, t) => {
      const A = musicActions(win)
      const s = settings(t, win)
      const sel = viewState(t, openT(win)).sel
      return {
        File: [
          { label: 'Play', onClick: A.playSelected, bold: true },
          { label: 'Play All', onClick: A.playAll },
          '-',
          { label: 'Create Playlist...', onClick: A.createPlaylist },
          { label: 'Burn CD...', onClick: A.burn },
          { label: 'Share Music...', onClick: A.share },
          '-',
          { label: 'Properties', onClick: A.properties, disabled: !sel },
          '-',
          { label: 'Close', onClick: () => emit('win.close', { id: win.id }) },
        ],
        Edit: [
          { label: 'Find...', shortcut: 'Ctrl+F', onClick: A.find },
          '-',
          { label: 'Copy to CD...', onClick: A.burn },
        ],
        View: [
          { label: 'Thumbnails', radio: true, checked: s.view === 'thumbnail', onClick: A.setView('thumbnail') },
          { label: 'Tiles', radio: true, checked: s.view === 'tiles', onClick: A.setView('tiles') },
          { label: 'Details', radio: true, checked: s.view === 'details', onClick: A.setView('details') },
          '-',
          {
            label: 'Arrange Icons By',
            items: [
              { label: 'Date', radio: true, checked: s.arrange === 'date', onClick: A.setArrange('date') },
              { label: 'Name', radio: true, checked: s.arrange === 'name', onClick: A.setArrange('name') },
              { label: 'Artist', radio: true, checked: s.arrange === 'artist', onClick: A.setArrange('artist') },
            ],
          },
          '-',
          { label: 'Preview', checked: s.preview, onClick: A.preview },
          { label: 'Music Tasks', checked: s.tasks && !s.folders, onClick: A.tasks },
          { label: 'Folders', checked: s.folders, onClick: A.folders },
        ],
        Help: [
          { label: 'Help and Support', onClick: () => emit('win.open', { id: 'help', app: 'help' }) },
          '-',
          { label: 'About Windows', onClick: () => emit('win.open', { id: 'about', app: 'about' }) },
        ],
      }
    },
  },
  TitleContent: MusicTitle,
  Content: scoped(MusicContent),
  Overlay: MusicOverlay,
  snapshot,
  liveTime,
  copyKey,
  relevant: (e) => e.type.startsWith('media.') || e.type === 'explorer.nav',
  copies: 10,
}
export default music
export { DEFAULTS }
