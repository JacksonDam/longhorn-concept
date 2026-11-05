// The generic Plex window (generalised from the video's my Music window): rounded glass frame,
// title bar (title, minimise / maximise / close), optional explorer chrome, the app's client
// area; drag to move, click to focus, double-click the title to maximise; the open swing-in,
// minimise into / restore out of the window's taskbar button, close, maximise, all with the
// video's multi-sample motion blur.
//
// Rendering (one path for real time and capture, docs/briefs/perf.md): `copies` window layers
// stay mounted while the window exists (pre-mounted a few per frame after it appears), each on
// its own compositor layer. Copy 0 is the live window; copies 1.. hold memoised snapshots of
// the content (they only re-render when the app's content settles on new state, staggered by
// two frames per copy), so a blurred frame is a composite of cached layers. Per-copy overlays
// that change every frame (the open's lighting, the app's Overlay such as my Music's 3D slabs)
// sit outside the memoised content.
import { memo, useRef } from 'react'
import { emit, getLog } from '../core/events.js'
import { FPS, now } from '../core/clock.js'
import { toStage } from '../core/Stage.jsx'
import { Txt, abs, HEAVY, LiveLayers } from './text.jsx'
import { Beam } from './Beam.jsx'
import { ExplorerChrome, EXPLORER_TOP } from './ExplorerChrome.jsx'
import { dockPoint } from './taskbar.js'
import {
  OPEN_DELAY, RESTORE_DELAY, OPEN_END, openPose, openMoving, openLight, poseCss, openBlur,
  MIN_END, RESTORE_END, minimizePoseFor, restorePoseFor, minimizeBlur, restoreBlur,
  CLOSE_END, closePose, MAX_FRAMES, maxEase,
} from './windowAnim.js'

export const TITLE_H = 24 // plain windows: title bar height
export const RIM_R = 8 // corner radius
export const WORK = { x: 0, y: 0, w: 858, h: 698 } // the area a maximised window fills (left of the sidebar, above the taskbar)
const toRel = (t, t0) => (t - t0) * FPS

// ---------------------------------------------------------------- window rect
// win.x / win.y (dragged) or the app's default position; maximised: WORK
export function normalRect(win, app) {
  const s = app.size || { w: 420, h: 300 }
  const p = app.position || { x: 120, y: 80 }
  return { x: win.x ?? p.x, y: win.y ?? p.y, w: s.w, h: s.h }
}

// sub-frame window position while dragging: interpolate the 'win.move' events of this window
let moveCache = { version: -1, id: null, list: null }
function moves(id) {
  const log = getLog()
  if (moveCache.log === log && moveCache.id === id) return moveCache.list
  const list = log.filter((e) => e.type === 'win.move' && e.id === id)
  moveCache = { log, id, list }
  return list
}
function rectAt(win, app, tt) {
  const r = normalRect(win, app)
  const ms = moves(win.id)
  if (ms.length && win.x != null) {
    // position at time tt from the move trail (the latest move <= tt, eased towards the next)
    let i = ms.length - 1
    while (i >= 0 && ms[i].t > tt) i--
    if (i >= 0) {
      const a = ms[i], b = ms[i + 1]
      if (b && b.t - a.t < 0.12) {
        const k = (tt - a.t) / (b.t - a.t)
        return { ...r, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
      }
      return { ...r, x: a.x, y: a.y }
    }
  }
  return r
}

// ---------------------------------------------------------------- the open's lighting
// (os/windowAnim OPEN_LIGHT): the top rows lit on the left and shaded on the right, the body
// shaded right and downwards. Gradients are fixed and faded by opacity (no repaint per frame).
const lightBg = 'linear-gradient(90deg, rgb(105,105,105) 0px, rgb(105,105,105) 200px, rgb(0,0,0) 400px)'
const topShadeBg = 'linear-gradient(90deg, rgba(10,25,60,0) 420px, rgba(10,25,60,0.5) 520px, rgba(10,25,60,0.5) 100%)'
const bodyShadeBg = 'linear-gradient(90deg, rgba(60,90,140,0) 385px, rgba(60,90,140,0.6) 560px, rgba(60,90,140,0.6) 100%)'
const bodyShadeYBg = 'linear-gradient(180deg, rgba(60,90,140,0) 238px, rgba(60,90,140,0.6) 458px, rgba(60,90,140,0.6) 100%)'
function OpenLight({ rel, w, h, topH }) {
  const l = rel >= 4 ? openLight(rel) : null
  const [k, ab, at] = l || [0, 0, 0]
  const top = { position: 'absolute', left: 0, top: 0, width: w, height: topH, pointerEvents: 'none', willChange: 'opacity' }
  const body = { position: 'absolute', left: 0, top: topH, width: w, height: h - topH, pointerEvents: 'none', willChange: 'opacity' }
  return (
    <>
      <div style={{ ...top, opacity: Math.min(1, k / 1.4), mixBlendMode: 'plus-lighter', background: lightBg }} />
      <div style={{ ...top, opacity: at / 0.5, background: topShadeBg }} />
      <div style={{ ...body, opacity: ab / 0.6, background: bodyShadeYBg }} />
      <div style={{ ...body, opacity: ab / 0.6, background: bodyShadeBg }} />
    </>
  )
}

// ---------------------------------------------------------------- frame parts
// window rim (f800): a 2 px light top edge, 2 px dark translucent sides along the top block
const Rim = memo(function Rim({ w, topH }) {
  const rim = 'rgba(90,108,150,0.5)'
  return (
    <div
      style={{
        position: 'absolute', left: -1, top: 1, width: w + 3, height: topH, boxSizing: 'border-box',
        borderStyle: 'solid', borderWidth: '2px 2px 0 2px',
        borderColor: `rgba(185,215,255,0.65) ${rim} transparent ${rim}`,
        borderRadius: `${RIM_R + 1}px ${RIM_R + 1}px 0 0`, pointerEvents: 'none',
      }}
    />
  )
})

const titleGrad =
  'linear-gradient(90deg, #4985d7 0%, #4f8bdd 5%, #5793e2 15%, #5fa1ed 26%, #6eb0fa 37%, #6ab0f8 42%, #68aaf8 46%, #66a8f4 57%, #5fa2ee 64%, #5a9ce9 72%, #558fe2 82%, #4e84d7 90%, #4a86d8 100%)'
// plain windows: the explorer chrome's glass gradient as a short title bar
const PlainTitleBg = memo(function PlainTitleBg({ w }) {
  return (
    <>
      <div style={abs(1, 0, w - 1, TITLE_H, { background: titleGrad })} />
      <div
        style={abs(1, 0, w - 1, TITLE_H, {
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.28) 0, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0) 6px, rgba(255,255,255,0) 18px, rgba(20,60,130,0.25) 23px, rgba(140,200,255,0.5) 24px)',
        })}
      />
    </>
  )
})

const WinButtonsIcon = () => (
  <svg width="43" height="10" viewBox="0 0 43 10" style={{ position: 'absolute', overflow: 'visible' }}>
    <g fill="none" stroke="#b9d5ff" opacity="0.92">
      <path d="M1.5 7.2 H7.5" strokeWidth="2.2" />
      <rect x="17.6" y="1.4" width="8.3" height="6.6" strokeWidth="1.2" />
      <path d="M17.6 2.1 H25.9" strokeWidth="2" />
      <path d="M33.6 1 L40.6 8.6 M40.6 1 L33.6 8.6" strokeWidth="1.9" />
    </g>
  </svg>
)

// title text: app.TitleContent (custom, e.g. my Music's equaliser glyph + "my Music") or the
// app title centred in the bar
const Title = memo(function Title({ w, title, TitleContent, active, props }) {
  if (TitleContent) return <TitleContent w={w} active={active} props={props} />
  return (
    <Txt x={w / 2} y={13.5} anchor="middle" size={13.5} w={600} f={HEAVY} sx={1} c={active ? '#e3f3ff' : '#c4dcf6'}>
      {title}
    </Txt>
  )
})

// ---------------------------------------------------------------- one window rendering
// the frame + app content at time t (copies pass a snapshot time)
const WindowBody = memo(
  function WindowBody({ win, app, t, w, h, active }) {
    const explorer = !!app.explorer
    const bare = app.chrome === 'none'
    const topH = bare ? 0 : explorer ? EXPLORER_TOP : TITLE_H
    const Content = app.Content
    return (
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: RIM_R, overflow: 'hidden',
          clipPath: `inset(3px 0px 0px 0px round ${RIM_R}px ${RIM_R}px 0 0)`,
          background: bare ? undefined : app.background ?? '#fff',
        }}
      >
        {!bare && (explorer ? <ExplorerChrome win={win} app={app} w={w} t={t} /> : <PlainTitleBg w={w} />)}
        <div style={{ position: 'absolute', left: 0, top: topH, width: w, height: h - topH, overflow: bare ? 'visible' : 'hidden' }}>
          <Content win={win} t={t} active={active} w={w} h={h - topH} />
        </div>
        {!bare && <Title w={w} title={app.title ? app.title(win.props || {}) : app.id} TitleContent={app.TitleContent} active={active} props={win.props} />}
      </div>
    )
  },
  (a, b) => a.t === b.t && a.w === b.w && a.h === b.h && a.active === b.active && a.app === b.app && winKey(a.win) === winKey(b.win),
)
const winKey = (w) => `${w.id}|${w.state}|${w.maximized}|${JSON.stringify(w.props)}`

// title-bar controls and drag handle (live layer only)
function TitleControls({ win, w, topH, active }) {
  const drag = useRef(null)
  const id = win.id
  const onDown = (e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    if (!active) emit('win.focus', { id })
    if (win.maximized) return
    const p = toStage(e.clientX, e.clientY)
    drag.current = { sx: p.x, sy: p.y, x0: win.x ?? win.rect.x, y0: win.rect.y, last: 0 }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d) return
    const p = toStage(e.clientX, e.clientY)
    const x = Math.round(d.x0 + p.x - d.sx), y = Math.round(Math.max(0, d.y0 + p.y - d.sy))
    if (x !== d.lx || y !== d.ly) {
      d.lx = x
      d.ly = y
      emit('win.move', { id, x, y })
    }
  }
  const onUp = () => (drag.current = null)
  const btn = (x, type) => (
    <div
      data-hit={type}
      style={abs(x, 2, 16, 18, { cursor: 'default' })}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        emit(type, { id })
      }}
    />
  )
  return (
    <>
      <div
        data-hit="win.drag"
        style={abs(0, 0, w - 60, 21)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={() => emit(win.maximized ? 'win.unmaximize' : 'win.maximize', { id })}
      />
      <div style={abs(w - 54, 7, 43, 10, { pointerEvents: 'none' })}>
        <WinButtonsIcon />
      </div>
      {btn(w - 58, 'win.minimize')}
      {btn(w - 41, win.maximized ? 'win.unmaximize' : 'win.maximize')}
      {btn(w - 25, 'win.close')}
    </>
  )
}

// ---------------------------------------------------------------- animation state
// -> { pose(tt) | null, n, shutter, phase, hidden, beam, light (open rel or null), rectAt(tt) }
function motion(win, app, t) {
  const tOpen = win.openedAt + OPEN_DELAY / FPS
  const r0 = normalRect(win, app)
  const dock = dockPoint(win.id, t)
  const max = (tt) => {
    // maximise / restore-down tween between the normal rect and WORK
    const k = win.maximizedAt == null ? (win.maximized ? 1 : 0) : maxEase(toRel(tt, win.maximizedAt) / MAX_FRAMES)
    const from = win.maximized ? rectAt(win, app, tt) : WORK
    const to = win.maximized ? WORK : rectAt(win, app, tt)
    const kk = win.maximizedAt == null ? 1 : k
    return {
      x: from.x + (to.x - from.x) * kk, y: from.y + (to.y - from.y) * kk,
      w: from.w + (to.w - from.w) * kk, h: from.h + (to.h - from.h) * kk,
    }
  }
  const rect = (tt) => (win.maximized || (win.maximizedAt != null && toRel(tt, win.maximizedAt) < MAX_FRAMES) ? max(tt) : rectAt(win, app, tt))
  const base = { rect, light: null, beam: null, hidden: false, pose: null, n: 1, shutter: 0, phase: -0.5 }

  if (win.state === 'closed') {
    const crel = toRel(t, win.changedAt)
    if (crel >= CLOSE_END + 3) return null
    return {
      ...base, frozen: win.changedAt, n: 10, shutter: 0.8, hidden: crel >= CLOSE_END,
      pose: (tt) => closePose(toRel(tt, win.changedAt)),
      beam: { rel: OPEN_END - crel * 1.6, fan: [3.2, 6, 8.2], spark: [-1, -1, -1], dx: dock.x - 440 },
    }
  }
  if (win.lastAction === 'initial') return { ...base, hidden: true }
  if (win.lastAction === 'minimize') {
    const mrel = toRel(t, win.changedAt)
    if (mrel >= MIN_END) return { ...base, hidden: true }
    const b = minimizeBlur(mrel)
    return {
      ...base, ...b, pose: (tt) => minimizePoseFor(toRel(tt, win.changedAt), r0, dock),
      beam: { rel: mrel, fan: [5, 6.8, 8.6], spark: [6, 7.5, 9.5], rise: false, dx: dock.x - 440 },
    }
  }
  if (win.lastAction === 'restore') {
    const tR = win.changedAt + RESTORE_DELAY / FPS
    const mrel = toRel(t, tR)
    if (mrel < RESTORE_END)
      return {
        ...base, ...restoreBlur(mrel), pose: (tt) => restorePoseFor(toRel(tt, tR), r0, dock),
        beam: { rel: mrel, fan: [-0.5, 1.2, 3.2], spark: [0.5, 2, 4.5], dx: dock.x - 440 },
      }
    return base
  }
  // open
  const rel = toRel(t, tOpen)
  const res = { ...base, light: rel, beam: { rel, haze: true, fanOp: 0.6, dx: dock.x - 440 } }
  if (rel < 5) return { ...res, hidden: true, warm: openPose(6) }
  if (openMoving(rel)) return { ...res, ...openBlur(rel), pose: (tt) => openPose(toRel(tt, tOpen)) }
  if (win.maximizedAt != null && toRel(t, win.maximizedAt) < MAX_FRAMES + 1) return { ...res, n: 6, shutter: 1 }
  return res
}

// ---------------------------------------------------------------- the window
// the app's live overlay, memoised: blur copies pass their snapshot time, so their overlay
// renders once per snapshot instead of every frame
const OverlayLayer = memo(
  function OverlayLayer({ Overlay, win, t, skip }) {
    return <Overlay win={win} t={t} skip={skip} />
  },
  (a, b) => a.t === b.t && a.skip === b.skip && a.Overlay === b.Overlay && winKey(a.win) === winKey(b.win),
)
const STAGGER = 2 // frames between copy snapshot updates
// the content time a blur copy shows (app.snapshot overrides): the settled state after the
// latest event at or before tk
function defaultSnapshot(win, app, tk) {
  const log = getLog()
  let lastT = win.openedAt
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].t <= tk) {
      lastT = Math.max(lastT, log[i].t)
      break
    }
  }
  return lastT + (app.settle ?? 1)
}

export function PlexWindow({ win, app, t, active }) {
  const m = motion(win, app, t)
  if (!m) return null
  const N = app.copies ?? 8
  // pre-mount: the live layer at once, then a copy every half frame
  const age = toRel(t, win.openedAt)
  const mounted = Math.max(1, Math.min(N, 1 + Math.floor(Math.max(0, age) / 0.5)))
  const nEff = Math.min(m.n, mounted)
  const blur = nEff > 1 && m.pose
  const live = m.frozen ?? t
  const r = m.rect(t)
  const topH = app.chrome === 'none' ? app.topH ?? EXPLORER_TOP : app.explorer ? EXPLORER_TOP : TITLE_H
  const Overlay = app.Overlay
  const layers = []
  for (let k = 0; k < mounted; k++) {
    let style
    let tt = t
    if (blur && k < nEff) {
      tt = t + (m.shutter / FPS) * ((k + 0.5) / nEff + m.phase)
      const p = m.pose(tt)
      style = { ...poseCss(p), opacity: Math.max(0, p.op) / nEff }
    } else if (k === 0) {
      const p = m.pose ? m.pose(t) : null
      style = { ...(p ? poseCss(p) : null), opacity: m.hidden || (p && p.op <= 0) ? 0 : p ? p.op : 1 }
    } else if (m.warm) {
      // before the open is visible: copies are rasterised in their first visible pose, all but
      // invisible, so the first blurred frame finds their rasters ready
      style = { ...poseCss(m.warm), opacity: 1e-4 }
    } else style = { opacity: 0 }
    const rr = blur && k < nEff ? m.rect(tt) : r
    let ct = live
    if (k > 0 && m.frozen == null) {
      const tk = t - (k * STAGGER) / FPS
      ct = app.snapshot ? app.snapshot(win, tk) : defaultSnapshot(win, app, tk)
    }
    const visible = style.opacity > 0
    layers.push(
      <div
        key={k}
        style={{
          position: 'absolute', left: rr.x, top: rr.y, width: rr.w, height: rr.h,
          ...style, mixBlendMode: 'plus-lighter', willChange: 'transform, opacity',
          pointerEvents: k === 0 && !blur && visible && win.state === 'open' ? 'auto' : 'none',
        }}
        onPointerDownCapture={k === 0 && !active ? () => emit('win.focus', { id: win.id }) : undefined}
      >
        <LiveLayers.Provider value={k === 0}>
          <WindowBody win={win} app={app} t={ct} w={rr.w} h={rr.h} active={k === 0 ? active : false} />
        </LiveLayers.Provider>
        {Overlay && <OverlayLayer Overlay={Overlay} win={win} t={visible ? live : ct} skip={!visible} />}
        {m.light != null && m.light < 17 && <OpenLight rel={toRel(tt, win.openedAt + OPEN_DELAY / FPS)} w={rr.w} h={rr.h} topH={topH} />}
        {app.chrome !== 'none' || app.frameRim !== false ? <Rim w={rr.w} topH={Math.min(72, topH || 72)} /> : null}
        {k === 0 && <TitleControls win={{ ...win, rect: r }} w={rr.w} topH={topH} active={active} />}
      </div>,
    )
  }
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}>{layers}</div>
      {m.beam && <Beam {...m.beam} />}
    </div>
  )
}
