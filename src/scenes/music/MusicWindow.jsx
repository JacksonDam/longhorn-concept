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
import { memo } from 'react'
import { useTime, useEvents } from '../../core/time.jsx'
import { FPS, CAPTURE } from '../../core/clock.js'
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
function WindowContent({ t, st, vs, copy = false, slabT, slabs = 'all' }) {
  const rel = toRel(t, st.openedAt)
  const pageT = vs.pageT != null && t >= vs.pageT ? vs.pageT : null
  return (
    <>
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: WIN.w,
        height: WIN.h,
        borderRadius: WIN.r,
        overflow: 'hidden',
        // the content starts 3 px down (the toolbar 1 px in); the frame below draws the rim
        clipPath: `inset(3px 0px 0px 0px round ${WIN.r}px ${WIN.r}px 0 0)`,
      }}
    >
      <Chrome />
      <BodyBg />
      <OpenLight rel={rel} part="body" />
      <Header t={t} openT={st.openedAt} pageT={pageT} copy={copy} track={vs.track} trackHover={vs.trackHover} slabT={slabT ?? t} slabs={slabs} />
      <EnjoyGroup op={smoothRamp(rel, HEADER.enjoy[0], HEADER.enjoy[1])} />
      <TaskPane />
      <GridBar />
      <AlbumGrid t={t} hover={vs.hover} sel={vs.sel && t >= vs.sel.t ? vs.sel : null} />
      <Scrollbar />
      <StatusBar />
      <OpenLight rel={rel} part="top" />
    </div>
    <Frame />
    </>
  )
}

// window rim (f800): a 2 px light top edge, and 2 px dark translucent sides along the toolbar
const rim = 'rgba(90,108,150,0.5)'
const Frame = memo(function Frame() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: -1,
          top: 1,
          width: WIN.w + 3,
          height: 72,
          boxSizing: 'border-box',
          borderStyle: 'solid',
          borderWidth: '2px 2px 0 2px',
          borderColor: `rgba(185,215,255,0.65) ${rim} transparent ${rim}`,
          borderRadius: `${WIN.r + 1}px ${WIN.r + 1}px 0 0`,
          pointerEvents: 'none',
        }}
      />
    </>
  )
})

// the open's lighting (timeline.OPEN_LIGHT): `part` 'body' draws the body shade under the
// content, 'top' the toolbar light and shade over the chrome rows. Real time uses fixed
// gradients faded by opacity on their own layers, kept mounted (no repaint per frame).
const TOP_H = 122
const lightBg = (k) => `linear-gradient(90deg, rgb(${75 * k},${75 * k},${75 * k}) 0px, rgb(${75 * k},${75 * k},${75 * k}) 155px, rgb(0,0,0) 315px)`
const topShadeBg = (a) => `linear-gradient(90deg, rgba(10,25,60,0) 355px, rgba(10,25,60,${a}) 455px, rgba(10,25,60,${a}) 777px)`
const bodyShadeBg = (a) => `linear-gradient(90deg, rgba(60,90,140,0) 355px, rgba(60,90,140,${a}) 530px, rgba(60,90,140,${a}) 777px)`
// and downwards (the light comes from the top left): local y 400 -> 600, i.e. 278 -> 478 below TOP_H
const bodyShadeYBg = (a) => `linear-gradient(180deg, rgba(60,90,140,0) 278px, rgba(60,90,140,${a}) 478px, rgba(60,90,140,${a}) 532px)`
function OpenLight({ rel, part }) {
  const l = openLight(rel)
  const [k, ab, at] = l && rel >= 4 ? l : [0, 0, 0]
  const base = { position: 'absolute', left: 0, width: WIN.w, pointerEvents: 'none' }
  if (!CAPTURE) {
    const lay = { ...base, willChange: 'opacity' }
    if (part === 'body')
      return (
        <>
          <div style={{ ...lay, top: TOP_H, height: WIN.h - TOP_H, opacity: ab / 0.6, background: bodyShadeBg(0.6) }} />
          <div style={{ ...lay, top: TOP_H, height: WIN.h - TOP_H, opacity: ab / 0.6, background: bodyShadeYBg(0.6) }} />
        </>
      )
    return (
      <>
        <div style={{ ...lay, top: 0, height: TOP_H, opacity: Math.min(1, k / 1.1), mixBlendMode: 'plus-lighter', background: lightBg(1.1) }} />
        <div style={{ ...lay, top: 0, height: TOP_H, opacity: at / 0.5, background: topShadeBg(0.5) }} />
      </>
    )
  }
  if (!l || rel < 4) return null
  if (part === 'body')
    return (
      <>
        <div style={{ ...base, top: TOP_H, height: WIN.h - TOP_H, background: bodyShadeBg(ab) }} />
        <div style={{ ...base, top: TOP_H, height: WIN.h - TOP_H, background: bodyShadeYBg(ab) }} />
      </>
    )
  return (
    <>
      <div style={{ ...base, top: 0, height: TOP_H, mixBlendMode: 'plus-lighter', background: lightBg(k) }} />
      <div style={{ ...base, top: 0, height: TOP_H, background: topShadeBg(at) }} />
    </>
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
// Real-time playback uses fewer copies (each copy is a full window DOM); ?capture uses all
// and renders every copy at its own sub-frame time. In real time the copies all show one
// memoised content snapshot (`snap`), so per frame only their wrapper transforms change and
// the browser re-composites cached layers instead of re-rendering and repainting n windows.
const MAX_COPIES = CAPTURE ? 64 : 7
const RT_OPEN_SHARP = 9

const contentKey = (t, st, vs) => `${t}|${st.openedAt}|${vs.pageT}|${vs.sel?.id}|${vs.sel?.t}|${vs.hover}|${vs.track}|${vs.trackHover}`
const Content = memo(
  function Content({ t, st, vs, copy, slabT, slabs }) {
    return <WindowContent t={t} st={st} vs={vs} copy={copy} slabT={slabT} slabs={slabs} />
  },
  (a, b) => a.copy === b.copy && a.slabT === b.slabT && a.slabs === b.slabs && contentKey(a.t, a.st, a.vs) === contentKey(b.t, b.st, b.vs),
)

function Blurred({ t, n: nWanted, shutter = 0, phase = -0.5, pose, st, vs, frozen, hidden = false, snap }) {
  const n = Math.min(nWanted, MAX_COPIES)
  const rt = !CAPTURE && n > 1 // real-time blur: shared snapshot content
  const ct = frozen ?? (rt ? snap ?? t : null)
  const layers = []
  for (let k = 0; k < n; k++) {
    if (n === 1) {
      // the settled window (layer 0 stays mounted across all states, so a blur never remounts it)
      const p = pose ? pose(t) : null
      const vis = !hidden && (!p || p.op > 0)
      layers.push(
        <div
          key={k}
          style={{ ...winBox, ...(p ? poseCss(p) : null), visibility: vis ? 'visible' : 'hidden', willChange: CAPTURE ? undefined : 'transform' }}
        >
          <Content t={frozen ?? t} st={st} vs={vs} copy={false} />
        </div>,
      )
      continue
    }
    const tt = t + shutter * ((k + 0.5) / n + phase)
    const p = pose(tt)
    const vis = p.op > 0
    layers.push(
      <div
        key={k}
        style={{
          ...winBox,
          ...poseCss(p),
          opacity: p.op / n,
          mixBlendMode: 'plus-lighter',
          visibility: vis ? 'visible' : 'hidden',
          willChange: rt ? 'transform, opacity' : undefined,
        }}
      >
        <Content t={ct ?? tt} st={st} vs={vs} copy slabT={rt ? ct : undefined} />
      </div>,
    )
  }
  return <div style={{ position: 'absolute', inset: 0, isolation: 'isolate', pointerEvents: n === 1 && !hidden ? 'auto' : 'none' }}>{layers}</div>
}

// Real-time window (not ?capture): MAX_COPIES window layers stay mounted for the whole life of
// the window, so an animation never mounts DOM. Copy 0 is the live window; copies 1.. hold
// memoised snapshots of the content that only change at settle points (staggered by 2 frames per
// copy, so a change never re-renders them all in one frame) and sit at opacity 0 until a blur
// needs them. The 3D slabs render once per frame on their own layer above the copies, posed
// with the central blur sample, instead of once per copy.
const SNAP_STAGGER = 2
function copySnap(tk, st, vk) {
  const pts = [st.openedAt + RT_OPEN_SHARP / FPS, st.openedAt + 74 / FPS]
  if (vk.sel) pts.push(vk.sel.t + 10 / FPS)
  if (vk.pageT != null) pts.push(vk.pageT + 21 / FPS)
  let best = pts[0]
  for (const p of pts) if (p <= tk && p > best) best = p
  return best
}

function SlabLayer({ t, st, vs }) {
  const pageT = vs.pageT != null && t >= vs.pageT ? vs.pageT : null
  return <Header t={t} openT={st.openedAt} pageT={pageT} slabs="only" />
}

// mount: how many layers to mount (the open mounts them one per ~half frame while it is still
// hidden, so the first blurred frame finds them ready)
function RealtimeWindow({ t, n = 1, shutter = 0, phase = -0.5, pose, st, vs, frozen, hidden = false, mount = MAX_COPIES }) {
  const N = Math.max(1, Math.min(MAX_COPIES, mount))
  const blur = n > 1
  const nEff = Math.min(n, N)
  const live = frozen ?? t
  const layers = []
  for (let k = 0; k < N; k++) {
    let style
    if (blur && k < nEff) {
      const p = pose(t + shutter * ((k + 0.5) / nEff + phase))
      style = { ...poseCss(p), opacity: Math.max(0, p.op) / nEff }
    } else if (!blur && k === 0) {
      const p = pose ? pose(t) : null
      style = { ...(p ? poseCss(p) : null), opacity: hidden || (p && p.op <= 0) ? 0 : p ? p.op : 1 }
    } else style = { opacity: 0 }
    let content
    if (k === 0 || frozen != null) {
      content = <Content t={live} st={st} vs={vs} copy={k > 0} slabs="none" />
    } else {
      const tk = t - (k * SNAP_STAGGER) / FPS
      const vk = { ...viewState(tk, st.openedAt), hover: -1, trackHover: -1 }
      content = <Content t={copySnap(tk, st, vk)} st={st} vs={vk} copy slabs="none" />
    }
    const interactive = k === 0 && !blur && style.opacity > 0
    layers.push(
      <div
        key={k}
        style={{ ...winBox, ...style, mixBlendMode: 'plus-lighter', willChange: 'transform, opacity', pointerEvents: interactive ? 'auto' : 'none' }}
      >
        {content}
      </div>,
    )
  }
  const sp = pose ? pose(blur ? t + shutter * (0.5 + phase) : t) : null
  const slabOp = hidden ? 0 : sp ? Math.max(0, sp.op) : 1
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, isolation: 'isolate', pointerEvents: 'none' }}>{layers}</div>
      <div style={{ ...winBox, ...(sp ? poseCss(sp) : null), opacity: slabOp, pointerEvents: 'none', willChange: 'transform, opacity' }}>
        <SlabLayer t={live} st={st} vs={vs} />
      </div>
    </>
  )
}
const Win = CAPTURE ? Blurred : RealtimeWindow

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
        <Win t={t} st={st} vs={vs} n={10} shutter={0.8 / FPS} pose={(tt) => openPose(back(tt))} frozen={st.closedAt} hidden={crel >= CLOSE_END} />
        <Beam rel={OPEN_END - crel * CLOSE_SPEED} fan={[3.2, 6, 8.2]} spark={[-1, -1, -1]} />
      </>
    )
  }
  if (!st.exists) return null
  const rel = toRel(t, st.openedAt)
  const vs = viewState(t, st.openedAt)
  const props = { t, st, vs }
  // one Blurred in every state (n = 1 when settled) so its first layer is never remounted
  let blur = { n: 1 }
  let beam = null
  const mrel = toRel(t, st.changedAt)
  if (st.changedAt !== st.openedAt && st.minimized) {
    const fall = mrel > 3.8
    blur =
      mrel >= MIN_END
        ? { n: 1, hidden: true }
        : {
            n: fall ? 16 : 6,
            shutter: (fall ? 1.32 : 1) / FPS,
            phase: mrel > 5.8 ? 0 : -0.5,
            pose: (tt) => minimizePose(toRel(tt, st.changedAt)),
            snap: st.changedAt,
          }
    beam = <Beam rel={mrel} fan={[5, 6.8, 8.6]} spark={[6, 7.5, 9.5]} rise={false} />
  } else if (st.changedAt !== st.openedAt && mrel < RESTORE_END) {
    blur = {
      n: 16,
      shutter: (mrel > 4.5 ? 1.36 : 1) / FPS,
      phase: mrel < 2 ? -1 : -0.5,
      pose: (tt) => restorePose(toRel(tt, st.changedAt)),
      snap: st.changedAt + RESTORE_END / FPS,
    }
    beam = <Beam rel={mrel} fan={[-0.5, 1.2, 3.2]} spark={[0.5, 2, 4.5]} />
  } else if (st.changedAt === st.openedAt) {
    beam = <Beam rel={rel} haze fanOp={0.6} />
    if (rel < 5) blur = { n: 1, hidden: true, mount: 1 + Math.floor(Math.max(0, rel) / 0.6) }
    else if (openMoving(rel)) {
      const pose = (tt) => openPose(toRel(tt, st.openedAt))
      // real time: the settle after rel 9 moves only a few px per frame, so it plays unblurred
      blur = !CAPTURE && rel >= RT_OPEN_SHARP ? { n: 1, pose } : { ...openBlur(rel), pose, snap: st.openedAt + RT_OPEN_SHARP / FPS }
    }
  }
  return (
    <>
      <Win {...props} {...blur} />
      {beam}
    </>
  )
}
