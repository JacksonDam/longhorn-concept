// The "my Music" explorer window (owned by the music scene).
//
// Interface used by the desktop scene:
//   <MusicWindow />            rendered by DesktopScene between the wallpaper and the sidebar.
//   musicWindowState(t) -> { exists, openedAt, minimized, changedAt }
//       exists:    the window has been opened (event 'music.open') and not closed
//       minimized: currently minimised ('music.minimize' / 'music.restore' events)
//   The taskbar shows a "My Music" button while `exists`; clicking it emits
//   'music.restore' when minimised, 'music.minimize' otherwise.
// Events:
//   'music.open'      emitted by the flyout's "Go to my Music" (desktop scene)
//   'music.minimize'  title-bar minimise button or taskbar button
//   'music.restore'   taskbar button while minimised
//   'music.close'     title-bar close button
//   'music.album' { id } album tile click (id = tile index 0..31, row-major)
import { last, all } from '../../core/events.js'
import { useTime, useEvents } from '../../core/time.jsx'
import { FPS } from '../../core/clock.js'
import { WIN } from './geometry.js'
import { Chrome } from './Chrome.jsx'
import { BodyBg, EnjoyGroup, TaskPane, GridBar, Scrollbar, StatusBar } from './Body.jsx'
import { AlbumGrid } from './Grid.jsx'
import { Header } from './Header.jsx'
import { Beam } from './Beam.jsx'
import { HEADER, PAGE_DELAY, openPose, openMoving, poseCss, smoothRamp, toRel } from './timeline.js'
import { ALBUMS } from './albums.js'

export function musicWindowState(t) {
  const open = last(t, (e) => e.type === 'music.open')
  if (!open) return { exists: false, minimized: false }
  const close = last(t, (e) => e.type === 'music.close' && e.t >= open.t)
  if (close) return { exists: false, minimized: false, closedAt: close.t }
  const mm = last(t, (e) => (e.type === 'music.minimize' || e.type === 'music.restore') && e.t >= open.t)
  return {
    exists: true,
    openedAt: open.t,
    minimized: mm?.type === 'music.minimize',
    changedAt: mm ? mm.t : open.t,
  }
}

// selection, hover and album page, derived from the log (window-session = since music.open)
function viewState(t, openT) {
  const after = (e) => e.t >= openT
  const s = last(t, (e) => e.type === 'music.album' && after(e))
  const tw = last(t, (e) => e.type === 'music.album' && after(e) && ALBUMS[e.id]?.tweet)
  let first = tw
  if (tw) {
    // the page opens on the first Tweet click of this window session
    for (const e of all(t, (e) => e.type === 'music.album' && after(e) && ALBUMS[e.id]?.tweet)) {
      first = e
      break
    }
  }
  const h = last(t, (e) => e.type === 'hover' && after(e) && String(e.id).startsWith('music.album.'))
  return {
    sel: s ? { id: s.id, t: s.t } : null,
    hover: h && h.on ? +String(h.id).slice('music.album.'.length) : -1,
    pageT: first ? first.t + PAGE_DELAY / FPS : null,
  }
}

// One rendering of the whole window at time t (motion-blur copies each get their own t).
function WindowContent({ t, st, vs }) {
  const rel = toRel(t, st.openedAt)
  const pageT = vs.pageT != null && t >= vs.pageT ? vs.pageT : null
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: WIN.w,
        height: WIN.h,
        borderRadius: WIN.r,
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.35)',
      }}
    >
      <Chrome />
      <BodyBg />
      <Header t={t} openT={st.openedAt} pageT={pageT} />
      <EnjoyGroup op={smoothRamp(rel, HEADER.enjoy[0], HEADER.enjoy[1])} />
      <TaskPane />
      <GridBar />
      <AlbumGrid t={t} hover={vs.hover} sel={vs.sel && t >= vs.sel.t ? vs.sel : null} />
      <Scrollbar />
      <StatusBar />
    </div>
  )
}

const winBox = { position: 'absolute', left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h }

// open animation: multi-sample motion blur of the 3D swing-in (fast at first, then settling)
function openBlur(rel) {
  if (rel < 9) return { n: 14, shutter: 1.0 / FPS }
  if (rel < 14) return { n: 6, shutter: 0.7 / FPS }
  return { n: 4, shutter: 0.6 / FPS }
}

// Dev-only comparison aid (?plate): a clean desktop frame of the reference video behind the
// window, so captures of semi-transparent effects can be diffed against the video.
const PLATE = import.meta.env.DEV && new URLSearchParams(location.search).has('plate')
function Plate({ t }) {
  const f = t * FPS + 1
  const n = f < 1353 ? 697 : 1380
  return <img src={`${import.meta.env.BASE_URL}ref/frames/f${String(n).padStart(5, '0')}.png`} alt="" style={{ position: 'absolute', left: 0, top: 0, width: 960, height: 720 }} />
}

export function MusicWindow() {
  const t = useTime()
  useEvents()
  return (
    <>
      {PLATE && <Plate t={t} />}
      <MusicWindowLayer t={t} />
    </>
  )
}

function MusicWindowLayer({ t }) {
  const st = musicWindowState(t)
  if (!st.exists) return null
  const rel = toRel(t, st.openedAt)
  const vs = viewState(t, st.openedAt)
  const beam = <Beam rel={rel} />
  if (rel < 5) return beam
  if (!openMoving(rel)) {
    return (
      <>
        <div style={winBox}>
          <WindowContent t={t} st={st} vs={vs} />
        </div>
        {beam}
      </>
    )
  }
  const { n, shutter } = openBlur(rel)
  const layers = []
  for (let k = 0; k < n; k++) {
    const tt = t + shutter * ((k + 0.5) / n - 0.5)
    const p = openPose(toRel(tt, st.openedAt))
    layers.push(
      <div key={k} style={{ ...winBox, ...poseCss(p), opacity: p.op / n, mixBlendMode: 'plus-lighter' }}>
        <WindowContent t={tt} st={st} vs={vs} />
      </div>,
    )
  }
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}>{layers}</div>
      {beam}
    </>
  )
}
