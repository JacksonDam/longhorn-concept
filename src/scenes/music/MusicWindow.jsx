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
//   'music.track' { n }  track click on the album page (n = 0..9)
//   'hover' { id: 'music.album.<i>' | 'music.track.<n>', on }
import { last, all } from '../../core/events.js'
import { useTime, useEvents } from '../../core/time.jsx'
import { FPS } from '../../core/clock.js'
import { WIN } from './geometry.js'
import { Chrome } from './Chrome.jsx'
import { BodyBg, EnjoyGroup, TaskPane, GridBar, Scrollbar, StatusBar } from './Body.jsx'
import { AlbumGrid } from './Grid.jsx'
import { Header } from './Header.jsx'
import { Beam } from './Beam.jsx'
import { HEADER, PAGE_DELAY, OPEN_END, openLight, OPEN_DELAY, RESTORE_DELAY, openPose, openMoving, poseCss, smoothRamp, toRel, minimizePose, restorePose, MIN_END, RESTORE_END } from './timeline.js'
import { ALBUMS } from './albums.js'

export function musicWindowState(t) {
  const open = last(t, (e) => e.type === 'music.open')
  if (!open) return { exists: false, minimized: false }
  const close = last(t, (e) => e.type === 'music.close' && e.t >= open.t)
  if (close) return { exists: false, minimized: false, openedAt: open.t, closedAt: close.t }
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

// One rendering of the whole window at time t (motion-blur copies each get their own t).
function WindowContent({ t, st, vs, copy = false }) {
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
      <Header t={t} openT={st.openedAt} pageT={pageT} copy={copy} track={vs.track} trackHover={vs.trackHover} />
      <EnjoyGroup op={smoothRamp(rel, HEADER.enjoy[0], HEADER.enjoy[1])} />
      <TaskPane />
      <GridBar />
      <AlbumGrid t={t} hover={vs.hover} sel={vs.sel && t >= vs.sel.t ? vs.sel : null} />
      <Scrollbar />
      <StatusBar />
      <OpenLight rel={rel} />
    </div>
  )
}

function OpenLight({ rel }) {
  const l = openLight(rel)
  if (!l || rel < 4) return null
  const [a, d] = l
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `linear-gradient(90deg, rgba(255,255,255,${a}) 0px, rgba(255,255,255,${a}) 300px, rgba(255,255,255,0) 405px, rgba(10,25,60,0) 380px, rgba(10,25,60,${d}) 505px, rgba(10,25,60,${d}) 777px)`,
      }}
    />
  )
}

const winBox = { position: 'absolute', left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h }

// open animation: multi-sample motion blur of the 3D swing-in (fast at first, then settling)
function openBlur(rel) {
  if (rel < 8) return { n: 14, shutter: 1.0 / FPS }
  if (rel < 14) return { n: 6, shutter: 0.5 / FPS }
  return { n: 4, shutter: 0.5 / FPS }
}

// the window drawn n times at sub-frame times, averaged (plus-lighter in an isolated group)
// frozen: render the content as at this time (e.g. while closing). Inside a copy the slabs
// render one sample each: the copies already provide the temporal samples.
function Blurred({ t, n, shutter, phase = -0.5, pose, st, vs, frozen }) {
  const layers = []
  for (let k = 0; k < n; k++) {
    const tt = t + shutter * ((k + 0.5) / n + phase)
    const p = pose(tt)
    if (p.op <= 0) continue
    layers.push(
      <div key={k} style={{ ...winBox, ...poseCss(p), opacity: p.op / n, mixBlendMode: 'plus-lighter' }}>
        <WindowContent t={frozen ?? tt} st={st} vs={vs} copy />
      </div>,
    )
  }
  return <div style={{ position: 'absolute', inset: 0, isolation: 'isolate', pointerEvents: 'none' }}>{layers}</div>
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

// close: the open animation played backwards (faster), with the beam
const CLOSE_SPEED = 1.6
const CLOSE_END = (OPEN_END - 5) / CLOSE_SPEED

function MusicWindowLayer({ t }) {
  const st0 = musicWindowState(t)
  // internal reference times: the fitted animations start a little after the events
  const st = { ...st0 }
  if (st.openedAt != null) st.openedAt += OPEN_DELAY / FPS
  if (st.changedAt != null && st0.changedAt !== st0.openedAt) st.changedAt += (st.minimized ? 0 : RESTORE_DELAY) / FPS
  else if (st.changedAt != null) st.changedAt = st.openedAt
  if (st.closedAt != null) {
    const crel = toRel(t, st.closedAt)
    if (crel >= CLOSE_END + 3) return null
    const vs = viewState(st.closedAt, st.openedAt)
    const back = (tt) => OPEN_END - toRel(tt, st.closedAt) * CLOSE_SPEED
    return (
      <>
        {crel < CLOSE_END && (
          <Blurred t={t} st={st} vs={vs} n={10} shutter={0.8 / FPS} pose={(tt) => openPose(back(tt))} frozen={st.closedAt} />
        )}
        <Beam rel={OPEN_END - crel * CLOSE_SPEED} fan={[3.2, 6, 8.2]} spark={[-1, -1, -1]} />
      </>
    )
  }
  if (!st.exists) return null
  const rel = toRel(t, st.openedAt)
  const vs = viewState(t, st.openedAt)
  const props = { t, st, vs }
  // minimise / restore
  if (st.changedAt !== st.openedAt) {
    const mrel = toRel(t, st.changedAt)
    if (st.minimized) {
      if (mrel >= MIN_END) return null
      const fall = mrel > 3.8
      return (
        <>
          <Blurred {...props} n={fall ? 16 : 6} shutter={(fall ? 1.32 : 1) / FPS} phase={mrel > 5.8 ? 0 : -0.5} pose={(tt) => minimizePose(toRel(tt, st.changedAt))} />
          <Beam rel={mrel} fan={[5, 6.8, 8.6]} spark={[6, 7.5, 9.5]} rise={false} />
        </>
      )
    }
    if (mrel < RESTORE_END) {
      return (
        <>
          <Blurred {...props} n={16} shutter={(mrel > 4.5 ? 1.36 : 1) / FPS} phase={mrel < 2 ? -1 : -0.5} pose={(tt) => restorePose(toRel(tt, st.changedAt))} />
          <Beam rel={mrel} fan={[-0.5, 1.2, 3.2]} spark={[0.5, 2, 4.5]} />
        </>
      )
    }
  }
  const beam = <Beam rel={rel} />
  if (rel < 5) return beam
  if (!openMoving(rel)) {
    return (
      <>
        <div style={winBox}>
          <WindowContent {...props} />
        </div>
        {beam}
      </>
    )
  }
  const { n, shutter } = openBlur(rel)
  return (
    <>
      <Blurred {...props} n={n} shutter={shutter} pose={(tt) => openPose(toRel(tt, st.openedAt))} />
      {beam}
    </>
  )
}
