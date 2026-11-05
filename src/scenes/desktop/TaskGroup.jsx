// The task-button group, driven by the window manager (taskbarModel.js): one button per
// window, the video's insertion animation for new windows, a closing gap for closed ones,
// the entrance rise, the birth flare and the click flash. Every button has its own
// pre-mounted blur copies (Blur.jsx), so moving frames are composites.
import { memo } from 'react'
import { FPS } from '../../core/clock.js'
import { lastOfType } from '../../os/logIndex.js'
import { ease, clamp, track } from '../../core/anim.js'
import { Blur } from './Blur.jsx'
import { GroupBg, TaskButton, TaskHits } from './Taskbar.jsx'
import { taskbarState, INSERT_DELAY, REMOVE_FRAMES } from './taskbarModel.js'
import { taskLabel, TaskIcon, taskClick } from './appInfo.jsx'
import { hoverLevel } from './Flyout.jsx'
import { SUBMIT_FRAME } from './timing.js'

// ---- insertion (video frames 701.5-716 for My Music: 8 frames after music.open) ----------
// The group opens a gap around the new button: the left buttons slide left, the right ones
// right (overshooting to -95 / +84 px), hold, then close in on it. Offsets relative to the
// final layout; keys are frame centres measured on the video (frames 702-716). Other
// insertions scale the same curves to their own distances.
const OFF_L = track([[0, 64], [0.5, 22], [1.5, -34], [2.5, -73], [3.5, -87], [4.5, -91], [5.5, -93], [6.5, -94], [7.5, -95], [10.9, -95], [11.5, -71], [12.5, -16], [13.5, 5], [14.5, 0]])
const OFF_R = track([[0, -55], [0.5, -18], [1.5, 23], [2.5, 52], [3.5, 62], [4.5, 69], [5.5, 74], [6.5, 79], [7.5, 82], [8.5, 84], [10.9, 84], [11.5, 70], [12.5, 19], [13.5, -5], [14.5, 0]])
const INSERT_END = 15
const N = 12
const STRIP_TOP = 690

const box = (b) => ({ left: b.x - 2, top: STRIP_TOP, width: b.w + 4, height: 30 })

// side offsets of a transition at frame r after its start
function offsets(tr, r) {
  if (!tr) return { L: 0, R: 0 }
  if (tr.kind === 'insert') {
    const dL = tr.from.x0 - tr.to.x0
    const dR = tr.from.x1 - tr.to.x1
    // the video's case (4 -> 5 buttons) uses the measured curves as they are
    const video = tr.from.buttons.length === 4 && tr.to.buttons.length === 5 && tr.id === 'music'
    const sL = video ? 1 : dL / 64
    const sR = video ? 1 : dR / -55
    const rr = Math.max(0, r)
    return { L: OFF_L(rr) * sL, R: OFF_R(rr) * sR }
  }
  const k = ease.inOut(clamp(r / REMOVE_FRAMES))
  return { L: (tr.from.x0 - tr.to.x0) * (1 - k), R: (tr.from.x1 - tr.to.x1) * (1 - k) }
}

const Button = memo(function Button({ b, win }) {
  return <TaskButton b={b} label={taskLabel(win)} Icon={TaskIcon(win)} />
})
// one element per (layout button, window record), so the blur copies' memo holds frame to frame
const elCache = new WeakMap()
function buttonEl(b, win) {
  let m = elCache.get(b)
  if (!m || m.win !== win) elCache.set(b, (m = { win, el: <Button b={b} win={win} /> }))
  return m.el
}

// hover highlight of one button (only in copy 0, over the label)
function ButtonLive({ t, b }) {
  const hv = hoverLevel(t, 'tb.' + b.id, 1.5, 3)
  return <div style={{ position: 'absolute', left: b.x + 1, top: 700, width: b.w - 2, height: 19, opacity: hv * 0.5, background: 'linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(255,255,255,0.12))' }} />
}

// click flash, drawn above the group (it adds light to what is under it, so it must not
// sit inside an isolated blur copy)
function PressFlash({ t, b }) {
  const e = lastOfType(t, 'tb.press', b.id)
  let press = 0
  if (e) {
    const df = (t - e.t) * FPS
    if (df <= 11) press = df < 1.4 ? (0.8 * df) / 1.4 + 0.2 * clamp(df) : Math.exp(-(df - 1.4) / 3.2)
  }
  return (
    <>
      {/* restore click at video frame ~1403: strongest over the icon, peaks 1.4 frames after
          the click and decays with tau 3.2 frames */}
      <div
        style={{
          position: 'absolute',
          left: b.x + 2,
          top: 700,
          width: b.w - 4,
          height: 19,
          opacity: press,
          visibility: press > 0 ? 'visible' : 'hidden',
          mixBlendMode: 'plus-lighter',
          background: 'linear-gradient(to right, rgba(60,75,30,0.9) 0%, rgba(55,70,28,0.9) 22%, rgba(40,50,14,0.7) 40%, rgba(22,28,8,0.4) 75%, rgba(0,0,0,0) 100%)',
        }}
      />
    </>
  )
}

// The light flare on a new button (video frames 700.5-711.5 for My Music): a sharp X of two
// rays, then a two-lobed glow that fades out. Always mounted; drawn when r is in range.
function BirthFlare({ r, x }) {
  const rr = r + 1 // frames since 700.5 in the video's case
  const on = rr >= 0 && rr <= 11
  const rays = !on ? 0 : rr < 1 ? rr : clamp(1 - (rr - 1.5) / 3)
  const blob = !on ? 0 : clamp((rr - 1) / 2.5) * (1 - clamp((rr - 8.5) / 2.5))
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" style={{ position: 'absolute', left: x - 59, top: 640, mixBlendMode: 'plus-lighter', pointerEvents: 'none', visibility: on ? 'visible' : 'hidden', willChange: 'opacity' }}>
      <defs>
        <radialGradient id="dk-flare">
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.45" stopColor="#d8f0ff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#9fd4ff" stopOpacity="0" />
        </radialGradient>
        <filter id="dk-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <g opacity={rays} filter="url(#dk-soft)">
        <ellipse cx="59" cy="38" rx="3.2" ry="26" transform="rotate(-24 59 60)" fill="url(#dk-flare)" />
        <ellipse cx="59" cy="38" rx="3.2" ry="26" transform="rotate(24 59 60)" fill="url(#dk-flare)" />
        <ellipse cx="59" cy="64" rx="10" ry="9" fill="url(#dk-flare)" />
      </g>
      <g opacity={blob} filter="url(#dk-soft)">
        <ellipse cx="49" cy="62" rx="15" ry="10" transform="rotate(-25 49 62)" fill="url(#dk-flare)" />
        <ellipse cx="69" cy="62" rx="15" ry="10" transform="rotate(25 69 62)" fill="url(#dk-flare)" />
        <ellipse cx="59" cy="70" rx="14" ry="9" fill="url(#dk-flare)" />
      </g>
    </svg>
  )
}

export function TaskGroup({ t, f }) {
  const { order, layout, transition: tr } = taskbarState(t)
  const r = tr ? tr.rel : Infinity
  const off = offsets(tr, r)
  // entrance: the group fades in 521.6-523 and the buttons rise within one frame (523)
  const groupOp = clamp((f - (521.6 - SUBMIT_FRAME)) / 1.4)
  const rise = (ff) => 14 * (1 - ease.out(clamp((ff - (522.5 - SUBMIT_FRAME)) / 1.05)))
  const rising = f > 521.5 - SUBMIT_FRAME && f < 524.5 - SUBMIT_FRAME
  const insertMoving = tr && (tr.kind === 'insert' ? r > -0.5 && r < INSERT_END : r < REMOVE_FRAMES + 0.5)
  const byId = new Map(order.map((w) => [w.id, w]))
  // buttons drawn: the current layout (plus the removed one while it fades out)
  const drawn = [...layout.buttons]
  const newIdx = tr?.kind === 'insert' ? layout.buttons.findIndex((b) => b.id === tr.id) : -1
  let removed = null
  if (tr?.kind === 'remove') removed = tr.from.buttons.find((b) => b.id === tr.id)
  const sideOf = (i) => (newIdx < 0 ? null : i < newIdx ? 'L' : i > newIdx ? 'R' : 'N')
  const removeSide = (b) => (b.x < (removed?.x ?? 0) ? 'L' : 'R')
  const offFor = (tt, b, i) => {
    const o = offsets(tr, tt)
    if (tr?.kind === 'insert') return sideOf(i) === 'L' ? o.L : sideOf(i) === 'R' ? o.R : 0
    if (tr?.kind === 'remove') {
      const fb = tr.from.buttons.find((x) => x.id === b.id)
      return fb ? (fb.x - b.x) * (1 - ease.inOut(clamp(tt / REMOVE_FRAMES))) : 0
    }
    return 0
  }
  void removeSide
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* group background */}
      <Blur
        t={tr ? r : f}
        box={{ left: 0, top: STRIP_TOP, width: 100, height: 30 }}
        n={N}
        moving={!!insertMoving}
        pose={(tt) => {
          const o = tr ? offsets(tr, tt) : off
          const x0 = layout.x0 + o.L
          const x1 = layout.x1 + o.R
          return { transform: `translateX(${x0}px) scaleX(${(x1 - x0) / 100})`, transformOrigin: '0 0', opacity: groupOp }
        }}
      >
        {GROUP_BG}
      </Blur>
      {drawn.map((b, i) => (
        <Blur
          key={b.id}
          t={tr && tr.kind ? r : f}
          box={box(b)}
          n={N}
          moving={!!(insertMoving && sideOf(i) !== 'N') || (tr?.kind === 'remove' && insertMoving) || rising}
          pose={(tt) => {
            if (rising && !tr) return { transform: `translateY(${rise(tt)}px)`, opacity: groupOp > 0 ? 1 : 0 }
            return { transform: `translateX(${offFor(tt, b, i)}px)`, opacity: groupOp > 0 ? 1 : 0 }
          }}
          live={<ButtonLive t={t} b={b} />}
        >
          {buttonEl(b, byId.get(b.id))}
        </Blur>
      ))}
      {removed && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - clamp(r / 2) }}>
          <TaskButton b={removed} label={taskLabel(tr.before.find((w) => w.id === removed.id))} Icon={TaskIcon(tr.before.find((w) => w.id === removed.id))} />
        </div>
      )}
      {layout.buttons.map((b) => (
        <PressFlash key={b.id} t={t} b={b} />
      ))}
      <BirthFlare r={tr?.kind === 'insert' ? r : -99} x={newIdx >= 0 ? layout.buttons[newIdx].x + 46.5 : 0} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', visibility: groupOp > 0 ? 'visible' : 'hidden' }}>
        <TaskHits buttons={layout.buttons} onClick={taskClick} />
      </div>
    </div>
  )
}

const GROUP_BG = <GroupBg x0={0} x1={100} />
export { INSERT_DELAY }
