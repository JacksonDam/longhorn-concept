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
import { ErrorBoundary } from './ErrorBoundary.jsx'
import { emit, getLog, getVersion } from '../core/events.js'
import { FPS, now } from '../core/clock.js'
import { toStage } from '../core/Stage.jsx'
import { Txt, abs, HEAVY, LiveLayers } from './text.jsx'
import { focusedField } from '../ui/state.js'
import { ExplorerChrome, EXPLORER_TOP } from './ExplorerChrome.jsx'
import { dockPoint } from './taskbar.js'
import { WindowShadow } from './shadow.jsx'
import { LookLayer, INACTIVE_SHADOW } from './look.jsx'
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
  return { x: win.x ?? p.x, y: win.y ?? p.y, w: win.w ?? s.w, h: win.h ?? s.h }
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
// (the title bar and the glass and bands below it, as far as the explorer chrome reaches)
const Rim = memo(function Rim({ w, topH, r = RIM_R }) {
  const rim = 'rgba(90,108,150,0.5)'
  return (
    <div
      style={{
        position: 'absolute', left: -1, top: 1, width: w + 3, height: topH, boxSizing: 'border-box',
        borderStyle: 'solid', borderWidth: '2px 2px 0 2px',
        borderColor: `rgba(185,215,255,0.65) ${rim} transparent ${rim}`,
        borderRadius: r > 0 ? `${r + 1}px ${r + 1}px 0 0` : 0, pointerEvents: 'none',
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
// app title centred in the bar (one colour: an inactive window's wash dims it, os/look.jsx)
const Title = memo(function Title({ w, title, TitleContent, active, props }) {
  if (TitleContent) return <TitleContent w={w} active={active} props={props} />
  return (
    <Txt x={w / 2} y={13.5} anchor="middle" size={13.5} w={600} f={HEAVY} sx={1} c="#e3f3ff">
      {title}
    </Txt>
  )
})

// ---------------------------------------------------------------- one window rendering
// the frame + app content at time t (copies pass a snapshot time)
const WindowBody = memo(
  // ck: optional content key (app.copyKey): copies with an unchanged key don't re-render
  // defer: the content isn't mounted yet (an opening window mounts its frame first, see below)
  // r: corner radius (RIM_R; 0 when maximised): only the window's own outline is rounded, the
  // bars inside it run square to its edges and the client area is clipped to its corners
  function WindowBody({ win, app, t, w, h, active, live, ck, proxy, defer, r = RIM_R }) {
    const explorer = !!app.explorer
    const bare = app.chrome === 'none'
    const topH = bare ? 0 : explorer ? EXPLORER_TOP : TITLE_H
    const Content = proxy || app.Content
    return (
      <div
        style={{
          position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: r, overflow: 'hidden',
          clipPath: `inset(3px 0px 0px 0px round ${r}px ${r}px 0 0)`,
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
    a.w === b.w && a.h === b.h && a.r === b.r && a.active === b.active && a.live === b.live && a.app === b.app && a.proxy === b.proxy && a.defer === b.defer && winKey(a.win) === winKey(b.win),
)
// content time relative to the window's open: a prewarmed ghost and the window that takes over
// its layers render identical content at the same relative time, so nothing re-renders
const sameRelT = (a, b) => Math.abs(a.t - a.win.openedAt - (b.t - b.win.openedAt)) < 1e-9
const propsKey = new WeakMap()
const winKey = (w) => {
  let pk = propsKey.get(w.props)
  if (pk == null) propsKey.set(w.props, (pk = JSON.stringify(w.props)))
  // the content's inputs from the window record (not its state: minimising or closing a window
  // changes its layers' poses, never what it draws)
  return `${w.id}|${w.w}|${w.h}|${pk}`
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
    const nw = Math.round(Math.max(minS.w, Math.min(WORK.w - win.rect.x, d.w0 + p.x - d.sx)))
    const nh = Math.round(Math.max(minS.h, Math.min(WORK.h - win.rect.y, d.h0 + p.y - d.sy)))
    if (nw !== d.lw || nh !== d.lh) {
      d.lw = nw
      d.lh = nh
      emit('win.resize', { id, w: nw, h: nh })
    }
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
  // how maximised the frame is (0 normal .. 1 maximised; tweened with the rect): a maximised
  // window has square corners and no shadow (it tiles the work area against the screen edges,
  // the sidebar and the taskbar, and has nothing to cast a shadow on)
  const maxK = (tt) => {
    if (win.maximizedAt == null) return win.maximized ? 1 : 0
    const k = maxEase(toRel(tt, win.maximizedAt) / MAX_FRAMES)
    return win.maximized ? k : 1 - k
  }
  const base = { rect, maxK, light: null, beam: null, hidden: false, pose: null, n: 1, shutter: 0, phase: -0.5 }

  if (win.lastAction === 'ghost') return { ...base, hidden: true }
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
const GHOST_MOTION = { light: null, beam: null, hidden: true, pose: null, n: 1, shutter: 0, phase: -0.5 }
// the app's live overlay, memoised: blur copies pass their snapshot time, so their overlay
// renders once per snapshot instead of every frame
const OverlayLayer = memo(
  function OverlayLayer({ Overlay, win, t, skip }) {
    return <Overlay win={win} t={t} skip={skip} />
  },
  (a, b) => sameRelT(a, b) && a.skip === b.skip && a.Overlay === b.Overlay && winKey(a.win) === winKey(b.win),
)
const STAGGER = 4 // frames between copy snapshot updates (copy k updates 4k frames after a change)
// times of the events that concern a window's content (sorted), cached per log version:
// its ui-kit ids (`${id}@${openedAt}/...`), events of its app ('<app>.*', hovers on '<app>.*'),
// and anything app.relevant(e, win) accepts
const relCache = new Map() // key -> { version, times }
// window management (the window system animates those itself; they don't change the content)
const WM_TYPES = new Set(['music.open', 'music.minimize', 'music.restore', 'music.close', 'win.open', 'win.minimize', 'win.restore', 'win.close', 'win.move', 'win.focus', 'win.maximize', 'win.unmaximize'])
function relevantTimes(win, app) {
  const key = win.id + '@' + win.openedAt
  const v = getVersion()
  const c = relCache.get(key)
  if (c && c.version === v) return c.times
  const pre = key + '/'
  const ap = app.id + '.'
  const times = []
  for (const e of getLog()) {
    if (e.t <= win.openedAt || WM_TYPES.has(e.type)) continue
    const id = e.id == null ? '' : String(e.id)
    if (id.startsWith(pre) || e.type.startsWith(ap) || id.startsWith(ap) || (app.relevant && app.relevant(e, win))) times.push(e.t)
  }
  relCache.set(key, { version: v, times })
  return times
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


// copy mounting schedule (a pure function of time, so capture and real time mount the same):
// windows mount their blur copies progressively (DOM never mounts at the start of a motion).
// Windows that exist at session start and the prewarmed windows (ghosts of apps with `prewarm`)
// mount one copy every two frames from a little after the desktop entrance; a window opened
// later mounts two copies per frame from its open event (the open becomes visible 5 frames in).
export const DEFAULT_COPIES = 6 // blur copies per window (my Music, the video's window: 10)
export const MOUNT_EVERY = 2 // frames between two background copy mounts (all windows share one queue)
function mountedCopies(win, app, t, N) {
  // queued windows (ghosts, windows running at login) mount nothing until their turn
  let n = win.mountStart != null && (win.lastAction === 'ghost' || win.lastAction === 'initial') ? 0 : 1
  if (win.mountStart != null) n = Math.max(n, Math.ceil(toRel(t, win.mountStart) / MOUNT_EVERY))
  // a window opened later mounts its live layer on the open's frame (frame and chrome first, its
  // content on the next frame, see PlexWindowImpl), then one copy per frame from rel 2 while the
  // beam plays (the open shows from rel 5; the sixth copy joins at rel 6)
  if (win.lastAction !== 'ghost' && win.lastAction !== 'initial') n = Math.max(n, Math.floor(toRel(t, win.openedAt) + 1e-6))
  return Math.max(0, Math.min(N, n))
}

// a window layer that shows nothing: parked off-stage at a near-zero opacity, so Blink keeps it
// painted (it skips opacity-0 subtrees) while the compositor draws nothing on screen
const PARKED = { transform: 'translateX(-4000px)', opacity: 1e-4 }
const REST = { opacity: 1e-4 }

// A window that shows nothing and has nothing scheduled (minimised, closed, running at login,
// prewarmed) renders the same every frame: this key changes only when its layers would change
// (mounting progress, its own events and the staggered copy updates after them), so WindowLayer
// can skip re-rendering it. null = the window is visible or animating.
export function quietKey(win, app, t) {
  const done =
    win.lastAction === 'ghost' ||
    win.lastAction === 'initial' ||
    (win.lastAction === 'minimize' && toRel(t, win.changedAt) > MIN_END + 1) ||
    (win.state === 'closed' && toRel(t, win.changedAt) > CLOSE_END + 4)
  if (!done) return null
  const N = app.copies ?? DEFAULT_COPIES
  const ev = lastEventT(win, app, t)
  const bucket = Math.min(N + 1, Math.floor(toRel(t, ev) / STAGGER))
  return `${win.lastAction}|${win.state}|${win.changedAt}|${mountedCopies(win, app, t, N)}|${ev}|${bucket}|${winKey(win)}`
}

// look: the active look's level (os/focus.js activeLevels: 1 active .. 0 inactive)
function PlexWindowImpl({ win, app, t, active, look = 1, z }) {
  const m = motion(win, app, t) || { ...GHOST_MOTION, rect: () => normalRect(win, app), maxK: () => 0 }
  const N = app.copies ?? DEFAULT_COPIES
  const mounted = mountedCopies(win, app, t, N)
  const nEff = Math.min(m.n, mounted)
  const blur = nEff > 1 && m.pose
  const live = m.frozen ?? t
  const r = m.rect(t)
  const topH = app.chrome === 'none' ? app.topH ?? EXPLORER_TOP : app.explorer ? EXPLORER_TOP : TITLE_H
  const Overlay = app.Overlay
  const openRel = (tt) => toRel(tt, win.openedAt + OPEN_DELAY / FPS)
  const rel = openRel(t)
  const ghost = win.lastAction === 'ghost'
  // where idle layers wait: a window that has been shown keeps them on its rect, all but
  // invisible, so their tiles stay rasterised and the next minimise / restore / move only
  // composites (rasterising ten window copies on the first frame of a restore costs 60 ms);
  // never-shown and closed windows park them off-stage (painted, not rasterised)
  // (windows running at login count as shown once their copies have mounted in the background
  // queue: their first restore then only composites)
  const shown =
    (win.state === 'open' || win.state === 'minimized') && win.lastAction !== 'ghost' && (win.lastAction !== 'initial' || mounted >= N)
  const rest = shown ? REST : PARKED
  const keepLayers = ghost || win.state === 'closed' || win.lastAction === 'open'
  // an opening window that has never mounted its content mounts its frame and chrome on the open
  // event's frame and the content on the next (it shows from rel 5), so the two mounts don't
  // share a frame; prewarmed and reopened windows have it mounted already
  const contentMounted = useRef(false)
  const deferContent = !contentMounted.current && !app.prewarm && win.lastAction === 'open' && toRel(t, win.openedAt) < 1 - 1e-6
  if (!deferContent) contentMounted.current = true
  // how inactive the window looks (the chrome wash and the live window's shadow are layers of
  // their own, so the cross-fade is compositor work)
  const inactive = Math.round((1 - look) * 64) / 64
  const hasShadow = app.chrome !== 'none' && app.shadow !== false
  let live0 = null // copy 0's style and rect: its shadow layer mirrors them
  // how far the window's top chrome reaches (title bar + the app's bars): the rim runs along it
  // and an inactive window's wash covers it
  const chromeTop = app.chrome === 'none' ? 0 : typeof app.chromeTop === 'function' ? app.chromeTop(win, r.w) : app.chromeTop ?? topH
  const layers = []
  for (let k = 0; k < mounted; k++) {
    let style
    let tt = t
    if (blur && k < nEff) {
      tt = t + (m.shutter / FPS) * ((k + 0.5) / nEff + m.phase)
      const p = m.pose(tt)
      style = { ...poseCss(p), opacity: Math.max(0, p.op) / nEff }
    } else if (k === 0 && !m.hidden) {
      const p = m.pose ? m.pose(t) : null
      style = p && p.op <= 0 ? rest : { ...(p ? poseCss(p) : null), opacity: p ? p.op : 1 }
    } else if (m.warm && k <= Math.floor((rel + 1) * 2)) {
      // before the open is visible: copies are rasterised in their first visible pose, all but
      // invisible (two per frame), so the first blurred frame finds their rasters ready
      style = { ...poseCss(m.warm), opacity: 1e-4 }
    } else style = rest
    const rr = blur && k < nEff ? m.rect(tt) : r
    const mk = m.maxK(blur && k < nEff ? tt : t)
    const radius = mk >= 1 ? 0 : mk <= 0 ? RIM_R : Math.round(RIM_R * (1 - mk) * 4) / 4
    // a closed window's live layer turns into a just-opened window's (a reopen then re-renders
    // little); while closing, the live content holds the time of the close
    let ct = m.closedDone ? liveContentT(win, app, win.openedAt) : liveContentT(win, app, m.closing ? Math.min(t, win.changedAt) : t)
    if (k > 0) {
      // a ghost's copies show what a window that has just opened shows, so the real window
      // takes them over without re-rendering
      // (a closed window's copies turn into a fresh window's, one every STAGGER frames)
      const fresh = ghost || (m.closedDone && toRel(t, win.changedAt) > CLOSE_END + 3 + k * STAGGER)
      const tk = fresh ? win.openedAt : t - (k * STAGGER) / FPS
      const ev = lastEventT(win, app, tk)
      const settle = app.settle ?? DEFAULT_SETTLE
      ct = app.snapshot ? app.snapshot(win, tk, ev, settle) : Math.max(win.openedAt, ev) + settle
    }
    if (k === 0) live0 = { style, rr, mk }
    const visible = style !== PARKED && style.opacity > 1e-3
    // the open's lighting layers: on the live layer always, on copies until the open is over
    // (unmounted one copy per frame afterwards)
    // (mounted from the open event, two copies per frame before the window shows; unmounted one
    // copy per frame after the open)
    const light = win.lastAction === 'open' && m.light != null && rel < 17 + k && rel >= k / 2 - 1
    layers.push(
      <div
        key={k}
        style={{
          position: 'absolute', left: rr.x, top: rr.y, width: rr.w, height: rr.h,
          // parked layers of windows that can't appear soon (running at login, still mounting)
          // are not composited: no layer, no raster, Blink only keeps their paint; prewarmed and
          // closed windows keep their layers (a reopen then only rasterises)
          ...style, mixBlendMode: 'plus-lighter', willChange: style === PARKED && !keepLayers ? undefined : 'transform, opacity',
          pointerEvents: k === 0 && !blur && visible && win.state === 'open' ? 'auto' : 'none',
        }}
        onPointerDownCapture={k === 0 && !active ? () => emit('win.focus', { id: win.id }) : undefined}
      >
        {k > 0 && hasShadow && <WindowShadow w={rr.w} h={rr.h} op={1 - mk} />}
        <LiveLayers.Provider value={k === 0}>
          <WindowBody proxy={k > 0 ? app.Proxy : undefined} defer={k === 0 && deferContent} win={win} app={app} t={ct} w={rr.w} h={rr.h} r={radius} active={k === 0 ? active : false} live={k === 0} ck={k > 0 && app.copyKey ? app.copyKey(win, ct) : undefined} />
        </LiveLayers.Provider>
        {Overlay && <OverlayLayer Overlay={Overlay} win={win} t={visible ? live : ct} skip={!visible} />}
        {light && <OpenLight rel={m.light != null ? openRel(tt) : 99} w={rr.w} h={rr.h} topH={topH} />}
        {app.chrome !== 'none' || app.frameRim !== false ? <Rim w={rr.w} topH={chromeTop || topH || 72} r={radius} /> : null}
        {k === 0 && <TitleControls win={{ ...win, rect: r }} w={rr.w} h={rr.h} topH={topH} active={active} app={app} />}
      </div>,
    )
  }
  // the inactive look's chrome wash over the live window, shown at rest only (os/look.jsx)
  const atRest = !blur && !m.hidden && !m.pose && win.state === 'open'
  const mk = m.maxK(t)
  const wash = chromeTop > 0 && mounted > 0 && (
    <LookLayer key="look" x={r.x} y={r.y} w={r.w} h={chromeTop} th={app.explorer ? 24 : TITLE_H} r={mk >= 1 ? 0 : mk <= 0 ? RIM_R : Math.round(RIM_R * (1 - mk) * 4) / 4} op={atRest ? inactive : 0} />
  )
  // the live window's shadow: a layer of its own that takes copy 0's pose and opacity (times the
  // look: lighter while inactive), accumulated like the copies (plus-lighter), so moving, blurring
  // and the focus cross-fade only composite it; the motion-blur copies carry their own
  const shadow = hasShadow && live0 && (
    <div
      key="shadow"
      style={{
        position: 'absolute', left: live0.rr.x, top: live0.rr.y, width: live0.rr.w, height: live0.rr.h, pointerEvents: 'none',
        transform: live0.style.transform, transformOrigin: live0.style.transformOrigin,
        opacity: live0.style.opacity * (1 - inactive * (1 - INACTIVE_SHADOW)), mixBlendMode: 'plus-lighter',
        willChange: live0.style === PARKED && !keepLayers ? undefined : 'transform, opacity',
      }}
    >
      <WindowShadow w={live0.rr.w} h={live0.rr.h} op={1 - live0.mk} />
    </div>
  )
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: z }}>
      <div style={{ position: 'absolute', inset: 0, isolation: 'isolate' }}>
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
  return a.app === b.app && a.active === b.active && a.look === b.look && a.z === b.z
})
