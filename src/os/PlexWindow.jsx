// The generic Plex window (generalised from the video's my Music window): rounded glass frame,
// title bar (title, minimise / maximise / close), optional explorer chrome, the app's client
// area; drag to move, click to focus, double-click the title to maximise; the open swing-in,
// minimise into / restore out of the window's taskbar button, close, maximise, all with the
// video's multi-sample motion blur.
//
// Rendering (one path for real time and capture, docs/briefs/perf.md), under a memory budget:
// an idle window is one layer (the live window), a minimised, closed or never-shown window none.
// Motion-blur copies (layers 1.., each on its own compositor layer, the full content as a
// memoised snapshot) exist only around a blurred animation (open, minimise, restore, close):
// they mount a few per frame from its trigger (the animation's event, or earlier when the
// pointer reaches the control that starts it: a 'win.prepare' or the taskbar button's hover),
// rest invisible on the window's rect so they are rasterised before they show, and unmount once
// it has settled. How many a window gets is a device budget (copyCount; the video's count under
// ?capture / ?bench). Per-copy overlays that change every frame (the open's lighting, the app's
// Overlay such as my Music's 3D slabs) sit outside the memoised content.
import { memo, useLayoutEffect, useRef } from 'react'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import { emit, getLog, getVersion, getEpoch } from '../core/events.js'
import { eventsOf } from './logIndex.js'
import { FPS, now, CAPTURE } from '../core/clock.js'
import { nextFrame } from '../core/time.jsx'
import { toStage } from '../core/Stage.jsx'
import { Txt, abs, HEAVY, LiveLayers } from './text.jsx'
import { focusedField } from '../ui/state.js'
import { ExplorerChrome, EXPLORER_TOP } from './ExplorerChrome.jsx'
import { dockPoint } from './taskbar.js'
import { WindowShadow } from './shadow.jsx'
import { LookLayer, INACTIVE_SHADOW } from './look.jsx'
import { RADIUS_TOP, RADIUS_BOTTOM, radiiAt, BODY_TOP, WORK, MAX_RECT, titleBaseline } from './frame.js'
import {
  OPEN_DELAY, RESTORE_DELAY, OPEN_END, openPose, openMoving, openLight, poseCss, openBlur,
  MIN_END, RESTORE_END, minimizePoseFor, restorePoseFor, minimizeBlur, restoreBlur,
  CLOSE_END, closePose, MAX_FRAMES, maxEase,
} from './windowAnim.js'

export const TITLE_H = 24 // plain windows: title bar height
export { WORK } // the area a maximised window's body fills (os/frame.js: left of the sidebar, above the taskbar)
const toRel = (t, t0) => (t - t0) * FPS

// ---------------------------------------------------------------- window rect
// win.x / win.y (dragged) or the app's default position; maximised: MAX_RECT (the body fills WORK)
// (app.size / app.position may be functions of the window's props: a message box sizes to its text)
export function normalRect(win, app) {
  const s = (typeof app.size === 'function' ? app.size(win.props || {}) : app.size) || { w: 420, h: 300 }
  const p = (typeof app.position === 'function' ? app.position(win.props || {}, s) : app.position) || { x: 120, y: 80 }
  return { x: win.x ?? p.x, y: win.y ?? p.y, w: win.w ?? s.w, h: win.h ?? s.h }
}

// sub-frame window position while dragging: interpolate the 'win.move' events of this window
// (from the incremental log index: a long session's moves cost nothing per frame)
function rectAt(win, app, tt) {
  const r = normalRect(win, app)
  const ms = eventsOf('win.move', win.id)
  if (ms.length && win.x != null) {
    // position at time tt from the move trail (the latest move <= tt, eased towards the next)
    let lo = 0, hi = ms.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (ms[mid].t <= tt) lo = mid + 1
      else hi = mid
    }
    const i = lo - 1
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
function OpenLight({ rel, w, h, topH, rt = RADIUS_TOP, rb = RADIUS_BOTTOM }) {
  const l = rel >= 4 ? openLight(rel) : null
  const [k, ab, at] = l || [0, 0, 0]
  // (rounded like the window's outline, so no light or shade shows past its corners)
  const top = { position: 'absolute', left: 0, top: 0, width: w, height: topH, pointerEvents: 'none', willChange: 'opacity', borderRadius: `${rt + 2}px ${rt + 2}px 0 0` }
  const body = { position: 'absolute', left: 0, top: topH, width: w, height: h - topH, pointerEvents: 'none', willChange: 'opacity', borderRadius: `0 0 ${rb}px ${rb}px` }
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
// (the title bar and the glass and bands below it, as far as the explorer chrome reaches); its
// outer corners concentric with the body's (r + 2: it starts 2 px above the body). Layer px: the
// rim covers x -1..1 and w..w + 2, y 1..3, so its centre line runs at x 0 / w + 1, y 2, radius
// r + 1. One stroke whose colour turns from the light top to the dark sides along the corner
// arcs (RIM_FADE of the way down them), where a CSS border's two colours would meet in a hard
// diagonal join. op: faded out as the window maximises (its sides would show along the screen
// edge and the sidebar; the top lies off-screen).
const RIM_LIGHT = 'rgba(185,215,255,0.65)'
const RIM_SIDE = 'rgba(90,108,150,0.5)'
const RIM_FADE = 1
const Rim = memo(function Rim({ w, topH, r = RADIUS_TOP, op = 1 }) {
  if (op <= 0) return null
  const R = Math.max(0, r + 1)
  const x0 = 1, x1 = w + 2, y0 = 2, yb = 1 + topH // svg px (the svg sits at layer x -1)
  const d = `M${x0} ${yb} V${y0 + R} A${R} ${R} 0 0 1 ${x0 + R} ${y0} H${x1 - R} A${R} ${R} 0 0 1 ${x1} ${y0 + R} V${yb}`
  const gid = 'lh-rim-' + String(R).replace('.', '_')
  return (
    <svg width={w + 3} height={topH + 1} style={{ position: 'absolute', left: -1, top: 0, overflow: 'visible', pointerEvents: 'none', opacity: op < 1 ? op : undefined }}>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1={y0 + 1} x2="0" y2={y0 + 1 + Math.max(1, R * RIM_FADE)}>
          <stop offset="0" stopColor={RIM_LIGHT} />
          <stop offset="1" stopColor={RIM_SIDE} />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#${gid})`} strokeWidth="2" />
    </svg>
  )
})

const titleGrad =
  'linear-gradient(90deg, #4985d7 0%, #4f8bdd 5%, #5793e2 15%, #5fa1ed 26%, #6eb0fa 37%, #6ab0f8 42%, #68aaf8 46%, #66a8f4 57%, #5fa2ee 64%, #5a9ce9 72%, #558fe2 82%, #4e84d7 90%, #4a86d8 100%)'
// plain windows: the explorer chrome's glass gradient as a short title bar
const PlainTitleBg = memo(function PlainTitleBg({ w }) {
  return (
    <>
      <div style={abs(0, 0, w, TITLE_H, { background: titleGrad })} />
      <div
        style={abs(0, 0, w, TITLE_H, {
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
// app title centred in the bar (one colour: an inactive window's wash dims it, os/look.jsx),
// vertically centred on the window buttons by its cap height (os/frame.js titleBaseline)
const TITLE_Y = titleBaseline(13.5)
const Title = memo(function Title({ w, title, TitleContent, active, props }) {
  if (TitleContent) return <TitleContent w={w} active={active} props={props} />
  return (
    <Txt x={w / 2} y={TITLE_Y} anchor="middle" size={13.5} w={600} f={HEAVY} sx={1} c="#e3f3ff">
      {title}
    </Txt>
  )
})

// ---------------------------------------------------------------- one window rendering
// the frame + app content at time t (copies pass a snapshot time)
const WindowBody = memo(
  // ck: optional content key (app.copyKey): copies with an unchanged key don't re-render
  // defer: the content isn't mounted yet (an opening window mounts its frame first, see below)
  // rt / rb: the top and bottom corner radii (os/frame.js; 0 when maximised): only the window's own
  // outline is rounded, the bars inside it run square to its edges and the client area is
  // clipped to its corners
  // cut: the top chrome's height (app chromeTop); its leftmost pixel column is left to the rim
  function WindowBody({ win, app, t, w, h, active, live, ck, defer, rt = RADIUS_TOP, rb = RADIUS_BOTTOM, cut = 0, slot }) {
    const explorer = !!app.explorer
    const bare = app.chrome === 'none'
    const topH = bare ? 0 : explorer ? EXPLORER_TOP : TITLE_H
    const Content = app.Content
    return (
      <div
        ref={slot ? (el) => (slot.el = el) : undefined}
        style={{
          position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: `${rt}px ${rt}px ${rb}px ${rb}px`, overflow: 'hidden',
          clipPath: bodyClip(w, h, rt, rb, cut),
          background: bare ? undefined : app.background ?? '#fff',
        }}
      >
        {!bare && (explorer ? <ExplorerChrome win={win} app={app} w={w} t={t} copy={!live} /> : <PlainTitleBg w={w} />)}
        <div style={{ position: 'absolute', left: 0, top: topH, width: w, height: h - topH, overflow: bare ? 'visible' : 'hidden' }}>
          {!defer && (
            <ErrorBoundary name={app.title ? app.title(win.props || {}) : app.id}>
              <Content win={win} t={t} active={active} live={live} w={w} h={h - topH} />
            </ErrorBoundary>
          )}
        </div>
        {!bare && <Title w={w} title={app.title ? app.title(win.props || {}) : app.id} TitleContent={app.TitleContent} active={active} props={win.props} />}
        {!bare && (
          <div style={abs(w - 54, 7, 43, 10, { pointerEvents: 'none' })}>
            <WinButtonsIcon />
          </div>
        )}
      </div>
    )
  },
  (a, b) =>
    (a.ck != null && a.ck === b.ck ? true : sameRelT(a, b)) &&
    a.w === b.w && a.h === b.h && a.rt === b.rt && a.rb === b.rb && a.cut === b.cut && (a.active === b.active || !a.app.usesActive) && a.live === b.live && a.app === b.app && a.defer === b.defer && winKey(a.win) === winKey(b.win),
)
// A motion-blur copy whose content is the same as copy 1's (the usual case: copies only differ
// while the content changes, see STAGGER) is a DOM clone of copy 1's body instead of a second
// React rendering of it: cloneNode is native, a React mount of a full window's content costs a
// few ms of JS per copy. Canvases get their pixels copied (cloneNode copies the element only).
// Copies draw no inputs, menus or hover (ui/scope.jsx), so the clone draws what a rendering would.
const CloneBody = memo(
  function CloneBody({ src, cloneKey }) {
    const ref = useRef(null)
    useLayoutEffect(() => {
      const host = ref.current
      if (!host || !src.el) return
      const c = src.el.cloneNode(true)
      const from = src.el.getElementsByTagName('canvas')
      if (from.length) {
        const to = c.getElementsByTagName('canvas')
        for (let i = 0; i < from.length; i++) to[i].getContext('2d').drawImage(from[i], 0, 0)
      }
      host.replaceChildren(c)
    }, [src, cloneKey])
    return <div ref={ref} style={{ position: 'absolute', left: 0, top: 0 }} />
  },
  (a, b) => a.cloneKey === b.cloneKey && a.src === b.src,
)

// content time relative to the window's open (layers at the same relative time render identical
// content)
const sameRelT = (a, b) => Math.abs(a.t - a.win.openedAt - (b.t - b.win.openedAt)) < 1e-9
const propsKey = new WeakMap()
const winKey = (w) => {
  let pk = propsKey.get(w.props)
  if (pk == null) propsKey.set(w.props, (pk = JSON.stringify(w.props)))
  // the content's inputs from the window record (not its state: minimising or closing a window
  // changes its layers' poses, never what it draws)
  return `${w.id}|${w.w}|${w.h}|${pk}`
}

// The window body's outline: 3 px down from the layer's top (the rim's light edge is above it),
// rounded top corners rt and bottom corners rb; along the top chrome (cut px) it starts 1 px in
// from the left, where the rim's 2 px left edge lies wholly outside the glass, as on the right
// (video f1300: the rim covers x 44-45 and the glass starts at 46 down to the bands' bottom; the
// body below starts at 45). Only the live layer takes that step (a path clip); the motion-blur
// copies keep the cheaper rounded-inset clip, where a pixel column doesn't show.
const clipCache = new Map()
function bodyClip(w, h, rt, rb, cut) {
  const key = `${w}|${h}|${rt}|${rb}|${cut}`
  let v = clipCache.get(key)
  if (v) return v
  const T = BODY_TOP
  if (!cut) v = `inset(${T}px 0px 0px 0px round ${rt}px ${rt}px 0 0)`
  else {
    const L = 1
    const c = Math.min(cut, h)
    // (the path only shapes the top and the step; it runs past the bottom, whose corners the
    // border radius rounds, as on windows without the step)
    v = `path('M ${L} ${T + rt} A ${rt} ${rt} 0 0 1 ${L + rt} ${T} L ${w - rt} ${T} A ${rt} ${rt} 0 0 1 ${w} ${T + rt} L ${w} ${h + 40} L 0 ${h + 40} L 0 ${c} L ${L} ${c} Z')`
  }
  if (clipCache.size > 500) clipCache.clear()
  clipCache.set(key, v)
  return v
}

// title-bar controls and drag handle (live layer only)
function TitleControls({ win, w, topH, active, h, app }) {
  const drag = useRef(null)
  const size = useRef(null)
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
    d.px = Math.round(d.x0 + p.x - d.sx)
    d.py = Math.round(Math.max(0, d.y0 + p.y - d.sy))
    // one 'win.move' per frame, at the frame's time (core/time.jsx nextFrame)
    if (d.queued) return
    d.queued = true
    nextFrame((t) => {
      d.queued = false
      if (d.px === d.lx && d.py === d.ly) return
      d.lx = d.px
      d.ly = d.py
      emit('win.move', { id, x: d.px, y: d.py }, t)
    })
  }
  const onUp = () => (drag.current = null)
  // (the pointer on minimise or close prepares the animation: the window's copies mount while
  // it is there, and for a moment after it leaves, so the click finds them rasterised)
  const btn = (x, type) => (
    <div
      data-hit={type}
      style={abs(x, 2, 16, 18, { cursor: 'default' })}
      onPointerEnter={type === 'win.minimize' || type === 'win.close' ? () => emit('win.prepare', { id, on: true }) : undefined}
      onPointerLeave={type === 'win.minimize' || type === 'win.close' ? () => emit('win.prepare', { id, on: false }) : undefined}
      onPointerDown={(e) => {
        e.stopPropagation()
        if (type === 'win.minimize' || type === 'win.close') emit('win.prepare', { id })
      }}
      onClick={(e) => {
        e.stopPropagation()
        emit(type, { id })
      }}
    />
  )
  const minS = app.minSize || { w: 320, h: 200 }
  const onSizeDown = (e) => {
    if (e.button !== 0 || win.maximized) return
    e.stopPropagation()
    const p = toStage(e.clientX, e.clientY)
    size.current = { sx: p.x, sy: p.y, w0: win.rect.w, h0: win.rect.h }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onSizeMove = (e) => {
    const d = size.current
    if (!d) return
    const p = toStage(e.clientX, e.clientY)
    d.pw = Math.round(Math.max(minS.w, Math.min(WORK.w - win.rect.x, d.w0 + p.x - d.sx)))
    d.ph = Math.round(Math.max(minS.h, Math.min(WORK.h - win.rect.y, d.h0 + p.y - d.sy)))
    if (d.queued) return
    d.queued = true
    nextFrame((t) => {
      d.queued = false
      if (d.pw === d.lw && d.ph === d.lh) return
      d.lw = d.pw
      d.lh = d.ph
      emit('win.resize', { id, w: d.pw, h: d.ph }, t)
    })
  }
  return (
    <>
      {app.resizable !== false && (
        <div
          data-hit="win.resize"
          style={abs(w - 18, h - 18, 18, 18, { cursor: 'nwse-resize' })}
          onPointerDown={onSizeDown}
          onPointerMove={onSizeMove}
          onPointerUp={() => (size.current = null)}
          onPointerCancel={() => (size.current = null)}
        />
      )}
      <div
        data-hit="win.drag"
        style={abs(0, 0, w - 60, 21)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={() => emit(win.maximized ? 'win.unmaximize' : 'win.maximize', { id })}
      />
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
    // maximise / restore-down tween between the normal rect and MAX_RECT
    const k = win.maximizedAt == null ? (win.maximized ? 1 : 0) : maxEase(toRel(tt, win.maximizedAt) / MAX_FRAMES)
    const from = win.maximized ? rectAt(win, app, tt) : MAX_RECT
    const to = win.maximized ? MAX_RECT : rectAt(win, app, tt)
    const kk = win.maximizedAt == null ? 1 : k
    return {
      x: from.x + (to.x - from.x) * kk, y: from.y + (to.y - from.y) * kk,
      w: from.w + (to.w - from.w) * kk, h: from.h + (to.h - from.h) * kk,
    }
  }
  const rect = (tt) => (win.maximized || (win.maximizedAt != null && toRel(tt, win.maximizedAt) < MAX_FRAMES) ? max(tt) : rectAt(win, app, tt))
  // how maximised the frame is (0 normal .. 1 maximised; tweened with the rect): a maximised
  // window has square corners and no shadow (it tiles the work area against the screen edges,
  // the sidebar and the taskbar, and has nothing to cast a shadow on)
  const maxK = (tt) => {
    if (win.maximizedAt == null) return win.maximized ? 1 : 0
    const k = maxEase(toRel(tt, win.maximizedAt) / MAX_FRAMES)
    return win.maximized ? k : 1 - k
  }
  const base = { rect, maxK, light: null, beam: null, hidden: false, pose: null, n: 1, shutter: 0, phase: -0.5 }

  if (win.state === 'closed') {
    const crel = toRel(t, win.changedAt)
    if (crel >= CLOSE_END + 3) return { ...base, hidden: true, closedDone: true }
    return {
      // (the content keeps its current state: closing changes no content, so nothing re-renders)
      ...base, closing: true, n: 10, shutter: 0.8, hidden: crel >= CLOSE_END,
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
// (a layer that doesn't show (a copy waiting for its animation at a near-zero opacity) draws its
// overlay once and then keeps those pixels (skip) until it shows: its canvases exist and are
// composited when the animation starts, and waiting costs no redraws; hiding them instead costs a
// re-layerisation on the animation's frame)
const OverlayLayer = memo(
  function OverlayLayer({ Overlay, win, t, skip, hidden }) {
    return <Overlay win={win} t={t} skip={skip} hidden={hidden} />
  },
  (a, b) => sameRelT(a, b) && a.skip === b.skip && a.hidden === b.hidden && a.Overlay === b.Overlay && winKey(a.win) === winKey(b.win),
)
const STAGGER = 4 // frames between copy snapshot updates (copy k updates 4k frames after a change)
// times of the events that concern a window's content (sorted), cached per log version:
// its ui-kit ids (`${id}@${openedAt}/...`), events of its app ('<app>.*', hovers on '<app>.*'),
// and anything app.relevant(e, win) accepts
const relCache = new Map() // key -> { version, epoch, n, times }
// window management (the window system animates those itself; they don't change the content)
const WM_TYPES = new Set(['win.prepare', 'music.open', 'music.minimize', 'music.restore', 'music.close', 'win.open', 'win.minimize', 'win.restore', 'win.close', 'win.move', 'win.focus', 'win.maximize', 'win.unmaximize'])
// (incremental while the log only grows at its end: each new event is looked at once)
function relevantTimes(win, app) {
  const key = win.id + '@' + win.openedAt
  const v = getVersion()
  let c = relCache.get(key)
  if (c && c.version === v) return c.times
  const log = getLog()
  const ep = getEpoch()
  if (!c || c.epoch !== ep || c.n > log.length) {
    c = { version: v, epoch: ep, n: 0, times: [] }
    relCache.set(key, c)
  }
  const pre = key + '/'
  const ap = app.id + '.'
  for (let i = c.n; i < log.length; i++) {
    const e = log[i]
    if (e.t <= win.openedAt || WM_TYPES.has(e.type)) continue
    const id = e.id == null ? '' : String(e.id)
    if (id.startsWith(pre) || e.type.startsWith(ap) || id.startsWith(ap) || (app.relevant && app.relevant(e, win))) c.times.push(e.t)
  }
  c.n = log.length
  c.version = v
  return c.times
}
// the latest relevant event time at or before t (binary search)
function lastEventT(win, app, t) {
  const a = relevantTimes(win, app)
  let lo = 0, hi = a.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (a[mid] <= t) lo = mid + 1
    else hi = mid
  }
  return lo > 0 ? a[lo - 1] : -Infinity
}
const DEFAULT_SETTLE = 1.2 // s: how long content may animate after an event (hover fades, menus, tooltips)

// The time the live layer's content renders at. Content is a function of (t, events), and between
// events it only moves while its own animations run; outside them it renders at a time that stays
// put until the next event, so an idle window costs no React work per frame. Apps with longer
// time-driven visuals return t from app.liveTime(win, t, base) while those run.
function liveContentT(win, app, t) {
  if (focusedField(t)?.startsWith(win.id + '@' + win.openedAt + '/')) return t // a caret blinks
  const le = Math.max(win.openedAt, lastEventT(win, app, t))
  const settle = app.settle ?? DEFAULT_SETTLE
  const base = t - le < settle ? t : le + settle
  return app.liveTime ? app.liveTime(win, t, base) : base
}


// ---------------------------------------------------------------- residency
// Which of a window's layers exist at t: a pure function of (t, log), so capture and real time
// mount the same. The live layer exists while the window shows (or is about to, see below);
// copies exist from the trigger of a blurred animation to a little after it has settled.
export const DEFAULT_COPIES = 6 // blur copies per window (my Music, the video's window: 10)
const PREP_HOLD = 1.5 // s: how long a prepare keeps them after the pointer has left the control

// How many layers (live + copies) a window may have while it blurs: the app's (the video's) count
// under ?capture / ?bench; in real time what the device's budget for one blurring window allows
// (every engine backs a layer at its own size x devicePixelRatio^2, whatever the stage's scale
// transform; on a phone devicePixelRatio includes the page zoom, index.html)
let budgetMB = null
function copyBudgetMB() {
  if (budgetMB != null) return budgetMB
  const mem = typeof navigator !== 'undefined' ? navigator.deviceMemory : undefined
  const small = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600)
  budgetMB = mem ? Math.min(192, Math.max(48, mem * 24)) : 128
  if (small) budgetMB = Math.min(budgetMB, 64)
  return budgetMB
}
export function copyCount(app, r) {
  const N = app.copies ?? DEFAULT_COPIES
  if (CAPTURE) return N
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const perCopy = (r.w * r.h * dpr * dpr * 4) / 1048576
  return Math.max(2, Math.min(N, Math.floor(copyBudgetMB() / perCopy)))
}

// Several windows animating at once (a burst of opens, a warm-up batch) would hold all their
// copies together: in real time only the first BLURRING of them (by start) blur, the others play
// their motion on the live layer alone. -> the ids of the windows that may have copies at t
// (?capture / ?bench: all of them)
const BLURRING = 2
export function blurringWindows(list, t) {
  if (CAPTURE) return null
  const busy = []
  for (const w of list) {
    const span = animSpan(w)
    const p = prepared(w, t)
    if ((span && t >= span[0] && t < span[1]) || p != null) busy.push([Math.min(span && t < span[1] ? span[0] : Infinity, p ?? Infinity), w.id])
  }
  busy.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1))
  return new Set(busy.slice(0, BLURRING).map((b) => b[1]))
}

// the blurred animation the window is in or last started: [start, end) s
function animSpan(win) {
  const a = win.lastAction
  if (a === 'open') return [win.openedAt, win.openedAt + (OPEN_DELAY + OPEN_END + 3) / FPS]
  if (a === 'minimize') return [win.changedAt, win.changedAt + (MIN_END + 1) / FPS]
  if (a === 'restore') return [win.changedAt, win.changedAt + (RESTORE_DELAY + RESTORE_END + 1) / FPS]
  if (a === 'close') return [win.changedAt, win.changedAt + (CLOSE_END + 4) / FPS]
  return null
}
const upTo = (a, t) => {
  let lo = 0, hi = a.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (a[mid].t <= t) lo = mid + 1
    else hi = mid
  }
  return lo
}
// The prepare signals of a window: its 'win.prepare' events and its taskbar button's hovers.
// -> the start of the run of signals that keeps it prepared at t (each holds PREP_HOLD s, a hover
// as long as the pointer stays), or null
function prepStart(win, t) {
  let start = null
  for (const a of [eventsOf('win.prepare', win.id), eventsOf('hover', 'tb.' + win.id)]) {
    let i = upTo(a, t) - 1
    if (i < 0) continue
    const live = (k) => (a[k].on === true ? Infinity : a[k].t + PREP_HOLD)
    if (live(i) <= t) continue
    let s0 = a[i].t
    while (i > 0 && live(i - 1) >= a[i].t) s0 = a[--i].t
    if (start == null || s0 < start) start = s0
  }
  return start
}
// a prepare not used up by an animation: one that started after the window's last animation began
function prepared(win, t) {
  const p = prepStart(win, t)
  const span = animSpan(win)
  return p != null && !(span && span[0] <= t && p <= span[0]) ? p : null
}
// When the last run of prepare signals ended (each holds PREP_HOLD s after it, a hover until its
// leave), if it has ended by t
function prepEnd(win, t) {
  let end = null
  for (const a of [eventsOf('win.prepare', win.id), eventsOf('hover', 'tb.' + win.id)]) {
    const i = upTo(a, t) - 1
    if (i < 0 || a[i].on === true) continue
    const e = a[i].t + PREP_HOLD
    if (e <= t && (end == null || e > end)) end = e
  }
  return end
}
// the start of the need for layers beyond the resting ones at t (a prepare or a blurred
// animation), or null
function needFrom(win, t) {
  const span = animSpan(win)
  const inAnim = span && t >= span[0] && t < span[1]
  let from = prepared(win, t)
  if (inAnim) {
    const p = prepStart(win, span[0])
    from = Math.min(span[0], p ?? Infinity)
  } else if (from != null && span && from < span[1]) {
    // prepared during the last animation (a restore prepared while the minimise plays): its
    // layers stay mounted from then on, none unmounts in between
    from = Math.min(from, span[0], prepStart(win, span[0]) ?? Infinity)
  }
  return from
}
// the layers that stay when nothing is wanted: the live window while it shows
const restingLayers = (win) => (win.state === 'open' && win.lastAction !== 'initial' ? 1 : 0)
// Layers grow one step at a time from the need's start, each in three steps: mounted (its DOM
// and React work, under content-visibility: hidden: no style, layout or paint yet), laid out
// (visibility: hidden: style and layout, no paint), shown (painted and rasterised, waiting on
// the window's rect at a near-zero opacity). STEP steps a video frame, one at a time, so no frame
// does more than one of them. -> { mounted, laid, ready }
const STEP = 1
const PH = 3
// (a hidden window's live layer mounts whole on the first step: an animation that starts at once,
// a tap on its taskbar button, shows the window on time, its copies joining as they're ready)
function grown(win, t, N, from, base) {
  let s = Math.floor(toRel(t, from) * STEP + 1e-6)
  if (base === 0) {
    if (s < 0) return { mounted: 0, laid: 0, ready: 0 }
    base = 1
    s -= 1
  }
  const at = (d) => base + Math.min(N - base, Math.max(0, Math.floor((s - d) / PH) + 1))
  return { mounted: at(0), laid: at(1), ready: at(2) }
}
// -> { mounted, laid, ready }: the layers that exist at t (0: none, the window renders nothing),
// how many of them are laid out and how many shown (the first `ready`; the others wait hidden)
function residency(win, app, t, N, depth = 0) {
  const span = animSpan(win)
  if (span && t >= span[0] && t < span[1] && win.lastAction === 'open') {
    // the open: the live layer on the open's frame (its content on the next), then a copy a
    // frame (the open shows from rel 5; the copies rasterise in their first pose before it)
    const n = Math.max(1, Math.min(N, Math.floor(toRel(t, win.openedAt) + 1e-6)))
    return { mounted: n, laid: n, ready: n }
  }
  const base = restingLayers(win)
  // (the layers still mounted from the need before (shrinking, or resting) carry over: a new need
  // grows from them, none unmounts to be mounted again)
  const carried = (at) => (depth < 3 ? residency(win, app, at - 1e-6, N, depth + 1).mounted : base)
  const from = needFrom(win, t)
  if (from != null) return grown(win, t, N, from, Math.max(base, carried(from)))
  // the need has ended (its animation settled, its prepare expired): the extra layers unmount one
  // a step, the last mounted first, so no frame tears down more than one window copy
  const end = Math.max(span && span[1] <= t ? span[1] : -Infinity, prepEnd(win, t) ?? -Infinity)
  if (end === -Infinity) return { mounted: base, laid: base, ready: base }
  const n = Math.max(base, carried(end) - Math.floor(toRel(t, end) * STEP + 1e-6))
  return { mounted: n, laid: n, ready: n }
}

// a window layer that shows nothing: parked off-stage at a near-zero opacity (painted, not
// rasterised), for an opening window's copies until their turn to rasterise in their first pose
const PARKED = { transform: 'translateX(-4000px)', opacity: 1e-4 }
// an idle or waiting layer rests on the window's rect at a near-zero opacity: drawn, so it is
// painted and rasterised and the animation that follows only composites (at opacity 0, Blink and
// the compositor would skip it and the animation would rasterise it mid-motion)
const REST = { opacity: 1e-4 }

// A hidden window (minimised, closed, running at login) with nothing scheduled renders nothing:
// this key changes only with its own events and prepare signals, so WindowLayer can skip
// re-rendering it. null = the window shows, animates or is being prepared.
export function quietKey(win, app, t) {
  if (win.state === 'open' && win.lastAction !== 'initial') return null
  const N = app.copies ?? DEFAULT_COPIES
  if (residency(win, app, t, N).mounted > 0) return null
  // hidden and unprepared: nothing mounted until its next event or prepare signal
  const sig = upTo(eventsOf('win.prepare', win.id), t) + upTo(eventsOf('hover', 'tb.' + win.id), t)
  return `${win.lastAction}|${win.state}|${win.changedAt}|${sig}|${winKey(win)}`
}

// look: the active look's level (os/focus.js activeLevels: 1 active .. 0 inactive)
function PlexWindowImpl({ win, app, t, active, look = 1, z, blurs = true }) {
  const m = motion(win, app, t)
  const r = m.rect(t)
  const N = blurs ? copyCount(app, normalRect(win, app)) : 1
  const { mounted, laid, ready } = residency(win, app, t, N)
  const nEff = Math.min(m.n, ready)
  const blur = nEff > 1 && m.pose
  const live = m.frozen ?? t
  const topH = app.chrome === 'none' ? app.topH ?? EXPLORER_TOP : app.explorer ? EXPLORER_TOP : TITLE_H
  const Overlay = app.Overlay
  const openRel = (tt) => toRel(tt, win.openedAt + OPEN_DELAY / FPS)
  const rel = openRel(t)
  // where layers wait (mounted ahead of an animation, or idle): on the window's rect, all but
  // invisible, so they are rasterised before they show; an opening window's copies wait parked
  // until their turn to rasterise in their first pose
  const rest = m.warm ? PARKED : REST
  // an opening window mounts its frame and chrome on the open event's frame and the content on
  // the next (it shows from rel 5), so the two mounts don't share a frame
  const contentMounted = useRef(false)
  // per copy index: { el } of its React-rendered body (copy 1 is the source copies clone)
  const slots = useRef(null)
  if (!slots.current) slots.current = []
  const deferContent = !contentMounted.current && win.lastAction === 'open' && toRel(t, win.openedAt) < 1 - 1e-6
  if (!deferContent) contentMounted.current = true
  if (mounted === 0) {
    contentMounted.current = false
    return null
  }
  // how inactive the window looks (the chrome wash and the live window's shadow are layers of
  // their own, so the cross-fade is compositor work)
  const inactive = Math.round((1 - look) * 64) / 64
  const hasShadow = app.chrome !== 'none' && app.shadow !== false
  let live0 = null // copy 0's style and rect: its shadow layer mirrors them
  // how far the window's top chrome reaches (title bar + the app's bars): the rim runs along it
  // and an inactive window's wash covers it
  const chromeTop = app.chrome === 'none' ? 0 : typeof app.chromeTop === 'function' ? app.chromeTop(win, r.w) : app.chromeTop ?? topH
  const layers = []
  let key1 = null
  for (let k = 0; k < mounted; k++) {
    let style
    let tt = t
    // (a layer still growing waits hidden: see grown)
    const waiting = k >= ready
    if (waiting) style = rest
    else if (blur && k < nEff) {
      tt = t + (m.shutter / FPS) * ((k + 0.5) / nEff + m.phase)
      const p = m.pose(tt)
      style = { ...poseCss(p), opacity: Math.max(0, p.op) / nEff }
    } else if (k === 0 && !m.hidden) {
      const p = m.pose ? m.pose(t) : null
      style = p && p.op <= 0 ? rest : { ...(p ? poseCss(p) : null), opacity: p ? p.op : 1 }
    } else if (m.warm && k <= Math.floor((rel - 0.5) * N / 4)) {
      // before the open is visible: copies are rasterised in their first visible pose, all but
      // invisible (spread over the four frames after the open's own, N / 4 a frame), so the first
      // blurred frame finds their rasters ready
      style = { ...poseCss(m.warm), opacity: 1e-4 }
    } else style = rest
    const rr = blur && k < nEff ? m.rect(tt) : r
    const mk = m.maxK(blur && k < nEff ? tt : t)
    const radius = radiiAt(mk)
    // (while closing, the live content holds the time of the close)
    let ct = liveContentT(win, app, m.closing ? Math.min(t, win.changedAt) : t)
    if (k > 0) {
      const tk = t - (k * STAGGER) / FPS
      const ev = lastEventT(win, app, tk)
      const settle = app.settle ?? DEFAULT_SETTLE
      ct = app.snapshot ? app.snapshot(win, tk, ev, settle) : Math.max(win.openedAt, ev) + settle
    }
    if (k === 0) live0 = { style, rr, mk }
    const ck = k > 0 && app.copyKey ? app.copyKey(win, ct) : undefined
    // what a copy's body draws (WindowBody's memo inputs): equal keys draw the same pixels
    const bodyKey = k > 0 ? `${ck ?? Math.round((ct - win.openedAt) * 1e6)}|${rr.w}|${rr.h}|${radius.top}|${radius.bottom}|${winKey(win)}` : null
    if (k === 1) key1 = bodyKey
    let body
    if (k >= 2 && bodyKey === key1 && slots.current[1]?.el) body = <CloneBody src={slots.current[1]} cloneKey={bodyKey} />
    else {
      if (k > 0 && !slots.current[k]) slots.current[k] = { el: null }
      body = <WindowBody defer={k === 0 && deferContent} win={win} app={app} t={ct} w={rr.w} h={rr.h} rt={radius.top} rb={radius.bottom} cut={k > 0 || mk > 0 ? 0 : chromeTop} active={k === 0 ? active : false} live={k === 0} ck={ck} slot={k > 0 ? slots.current[k] : undefined} />
    }
    const visible = style !== PARKED && style.opacity > 1e-3
    // the open's lighting layers: on the live layer always, on copies until the open is over
    // (unmounted one copy per frame afterwards)
    // (mounted from the open event, two copies per frame before the window shows; unmounted one
    // copy per frame after the open)
    // (spread like the copies' first rasters: about N / 5 copies a frame before the window shows)
    const light = win.lastAction === 'open' && m.light != null && rel < 17 + k && rel >= (k * 4) / N + 0.5
    layers.push(
      <div
        key={k}
        style={{
          position: 'absolute', left: rr.x - r.x, top: rr.y - r.y, width: rr.w, height: rr.h,
          ...style, mixBlendMode: 'plus-lighter', willChange: 'transform, opacity',
          contentVisibility: k >= laid ? 'hidden' : undefined,
          visibility: waiting ? 'hidden' : undefined,
          pointerEvents: k === 0 && !blur && visible && win.state === 'open' ? 'auto' : 'none',
        }}
        onPointerDownCapture={k === 0 && !active ? () => emit('win.focus', { id: win.id }) : undefined}
      >
        <LiveLayers.Provider value={k === 0}>
          {body}
        </LiveLayers.Provider>
        {Overlay && <OverlayLayer Overlay={Overlay} win={win} t={live} skip={!visible} hidden={false} />}
        {light && <OpenLight rel={m.light != null ? openRel(tt) : 99} w={rr.w} h={rr.h} topH={topH} rt={radius.top} rb={radius.bottom} />}
        {app.chrome !== 'none' || app.frameRim !== false ? <Rim w={rr.w} topH={chromeTop || topH || 72} r={radius.top} op={1 - mk} /> : null}
        {k === 0 && <TitleControls win={{ ...win, rect: r }} w={rr.w} h={rr.h} topH={topH} active={active} app={app} />}
      </div>,
    )
  }
  // the inactive look's chrome wash over the live window, shown at rest only (os/look.jsx)
  const atRest = !blur && !m.hidden && !m.pose && win.state === 'open'
  const mk = m.maxK(t)
  const wash = chromeTop > 0 && mounted > 0 && (
    <LookLayer key="look" x={0} y={0} w={r.w} h={chromeTop} th={app.explorer ? 24 : TITLE_H} r={radiiAt(mk).top} op={atRest ? inactive : 0} />
  )
  // The window's shadow: one layer of its own (the motion-blur copies carry none, so their
  // layers and rasters stay the window's size), rasterised once and then only transformed: it
  // takes the live layer's pose and opacity, and while the window blurs, the pose at the middle
  // of the shutter at full opacity (a soft shadow reads the same blurred or not). Its opacity
  // also carries the look (lighter while inactive), so the focus cross-fade only composites.
  let sh = live0
  if (blur && live0) {
    const tm = t + (m.shutter / FPS) * (0.5 + m.phase)
    const p = m.pose(tm)
    sh = { style: { ...poseCss(p), opacity: Math.max(0, p.op) }, rr: m.rect(tm), mk: m.maxK(tm) }
  }
  const shadow = hasShadow && sh && (
    <div
      key="shadow"
      style={{
        position: 'absolute', left: sh.rr.x - r.x, top: sh.rr.y - r.y, width: sh.rr.w, height: sh.rr.h, pointerEvents: 'none',
        transform: sh.style.transform, transformOrigin: sh.style.transformOrigin,
        opacity: sh.style.opacity * (1 - inactive * (1 - INACTIVE_SHADOW)), mixBlendMode: 'plus-lighter',
        willChange: 'transform, opacity',
      }}
    >
      <WindowShadow w={sh.rr.w} h={sh.rr.h} op={1 - sh.mk} />
    </div>
  )
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: z }}>
      {/* the window's layers sit relative to its rect, which only moves this group: dragging a
          window changes one transform, no layout or paint (the layers' left / top stay) */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, isolation: 'isolate', transform: `translate(${r.x}px, ${r.y}px)` }}>
        {shadow}
        {layers}
        {wash}
      </div>
    </div>
  )
}

// the beam of this window's current animation (null: none); WindowLayer draws one shared beam
export function beamOf(win, app, t) {
  const m = motion(win, app, t)
  return m && m.beam ? m.beam : null
}

// re-renders every frame unless the window is quiet (see quietKey) and nothing else changed
export const PlexWindow = memo(PlexWindowImpl, (a, b) => {
  if (a.quiet == null || b.quiet == null || a.quiet !== b.quiet) return false
  return a.app === b.app && a.active === b.active && a.look === b.look && a.z === b.z && a.blurs === b.blurs
})
