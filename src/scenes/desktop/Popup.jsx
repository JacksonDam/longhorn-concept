// Animated, pre-mounted popup (Start menu, menus, flyouts). Open state comes from
// shellState.popupState; the panel animates in and out with multi-sample motion blur
// (Blur.jsx copies), and its hit areas (`hits`) are live only while it's open.
//
// kind: 'rise'  slides up out of the taskbar (clipped at the taskbar top), overshoots a little
//       'drop'  slides down from its top edge (clipped there): menus under a sidebar header
//       'left'  slides left out of the sidebar edge (clipped at x 858), like the my Music flyout
//       'fade'  fades and grows from its anchor corner (context menus)
//
// The panels are authored on the video's 960 x 720 frame; `offset` { x, y } moves the whole popup
// (box, panel, live layer, hits) with what it belongs to on a stage extended to the screen's
// shape (core/Stage.jsx: the taskbar dh lower, the sidebar dw further right). Positioned
// wrappers (left / top), not transforms, so they add no stacking context.
import { FPS } from '../../core/clock.js'
import { clamp, ease, track } from '../../core/anim.js'
import { Blur } from './Blur.jsx'
import { popupState } from './shellState.js'
import { useStageScale } from '../../core/Stage.jsx'
import { POINT } from '../../core/point.js'

const RISE_IN = track([[0, 1], [2.2, 0.08], [3.2, -0.025], [4, 0]])
const DUR = { rise: [4, 3], drop: [3.5, 2.5], left: [4, 3], fade: [2.5, 2] }

export function popupPhase(t, id, kind) {
  const st = popupState(t, id)
  const df = (t - st.at) * FPS
  const [din, dout] = DUR[kind]
  const visible = st.open || df < dout
  const moving = st.open ? df < din : df < dout
  return { st, df, visible, moving, din, dout }
}

// a sliding popup's travel fraction h (1 = fully hidden) and opacity at ff frames
export function popupTravel(open, ff, din, dout) {
  const h = open ? (ff >= din ? 0 : RISE_IN(Math.max(0, ff) * (4 / din))) : ease.in(clamp(ff / dout))
  const op = open ? 1 : 1 - 0.6 * ease.in(clamp(ff / dout))
  return { h, op }
}

export function popupPose(kind, open, ff, din, dout, box, origin) {
  if (kind === 'fade') {
    const k = open ? ease.out(clamp(ff / din)) : 1 - ease.in(clamp(ff / dout))
    return { opacity: k, transform: `scale(${0.94 + 0.06 * k})`, transformOrigin: origin || '0 0' }
  }
  const { h, op } = popupTravel(open, ff, din, dout)
  if (kind === 'rise') return { transform: `translateY(${h * box.height}px)`, opacity: op }
  if (kind === 'drop') return { transform: `translateY(${-h * box.height}px)`, opacity: op }
  return { transform: `translateX(${h * box.width}px)`, opacity: op }
}

// clip so the panel emerges from behind the taskbar / header / sidebar edge (sw x sh: the stage)
function clipFor(kind, box, sw, sh) {
  if (kind === 'rise') return `inset(0 0 ${sh - (box.top + box.height)}px 0)`
  if (kind === 'drop') return `inset(${box.top}px 0 0 0)`
  if (kind === 'left') return `inset(0 ${sw - (box.left + box.width)}px 0 0)`
  return undefined
}

const NO_OFFSET = { x: 0, y: 0 }
// el moved by o (none on the video's frame); one wrapper element per (element, offset), so the
// blur copies' memoised content still holds frame to frame
const wraps = new WeakMap()
function at(o, el) {
  if (el == null || typeof el !== 'object' || (!o.x && !o.y)) return el
  let c = wraps.get(el)
  if (!c || c.x !== o.x || c.y !== o.y) wraps.set(el, (c = { x: o.x, y: o.y, el: <div style={{ ...POINT, left: o.x, top: o.y }}>{el}</div> }))
  return c.el
}

export function Popup({ t, id, kind, box: box0, n = 10, children, live, front, hits, origin, offset = NO_OFFSET }) {
  const { w: sw, h: sh } = useStageScale()
  const { st, df, visible, moving, din, dout } = popupPhase(t, id, kind)
  const o = offset
  const box = o.x || o.y ? { ...box0, left: box0.left + o.x, top: box0.top + o.y } : box0
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, clipPath: clipFor(kind, box, sw, sh), pointerEvents: 'none', visibility: visible ? 'visible' : 'hidden' }}>
        <Blur
          t={df}
          box={box}
          n={n}
          moving={visible && moving}
          hidden={!visible}
          pose={(ff) => popupPose(kind, st.open, ff, din, dout, box, origin)}
          live={visible ? at(o, live) : null}
          front={at(o, front)}
        >
          {at(o, children)}
        </Blur>
      </div>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', visibility: st.open ? 'visible' : 'hidden' }}>{at(o, hits)}</div>
    </>
  )
}
