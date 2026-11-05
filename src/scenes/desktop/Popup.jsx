// Animated, pre-mounted popup (Start menu, menus, flyouts). Open state comes from
// shellState.popupState; the panel animates in and out with multi-sample motion blur
// (Blur.jsx copies), and its hit areas (`hits`) are live only while it's open.
//
// kind: 'rise'  slides up out of the taskbar (clipped at the taskbar top), overshoots a little
//       'drop'  slides down from its top edge (clipped there): menus under a sidebar header
//       'left'  slides left out of the sidebar edge (clipped at x 858), like the my Music flyout
//       'fade'  fades and grows from its anchor corner (context menus)
import { FPS } from '../../core/clock.js'
import { clamp, ease, track } from '../../core/anim.js'
import { Blur } from './Blur.jsx'
import { popupState } from './shellState.js'

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

function pose(kind, open, ff, din, dout, box, origin) {
  if (kind === 'fade') {
    const k = open ? ease.out(clamp(ff / din)) : 1 - ease.in(clamp(ff / dout))
    return { opacity: k, transform: `scale(${0.94 + 0.06 * k})`, transformOrigin: origin || '0 0' }
  }
  // travel fraction (1 = fully hidden)
  const h = open ? (ff >= din ? 0 : RISE_IN(Math.max(0, ff) * (4 / din))) : ease.in(clamp(ff / dout))
  const op = open ? 1 : 1 - 0.6 * ease.in(clamp(ff / dout))
  if (kind === 'rise') return { transform: `translateY(${h * box.height}px)`, opacity: op }
  if (kind === 'drop') return { transform: `translateY(${-h * box.height}px)`, opacity: op }
  return { transform: `translateX(${h * box.width}px)`, opacity: op }
}

// clip so the panel emerges from behind the taskbar / header / sidebar edge
function clipFor(kind, box) {
  if (kind === 'rise') return `inset(0 0 ${720 - (box.top + box.height)}px 0)`
  if (kind === 'drop') return `inset(${box.top}px 0 0 0)`
  if (kind === 'left') return `inset(0 ${960 - (box.left + box.width)}px 0 0)`
  return undefined
}

export function Popup({ t, id, kind, box, n = 10, children, live, front, hits, origin }) {
  const { st, df, visible, moving, din, dout } = popupPhase(t, id, kind)
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, clipPath: clipFor(kind, box), pointerEvents: 'none', visibility: visible ? 'visible' : 'hidden' }}>
        <Blur
          t={df}
          box={box}
          n={n}
          moving={visible && moving}
          hidden={!visible}
          pose={(ff) => pose(kind, st.open, ff, din, dout, box, origin)}
          live={visible ? live : null}
          front={front}
        >
          {children}
        </Blur>
      </div>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', visibility: st.open ? 'visible' : 'hidden' }}>{hits}</div>
    </>
  )
}
