// The row of user tiles: layout (5 slots, or 4 after a selection), hover looks, the slide that
// closes the gap after a selection (motion blurred) and the drop-away exit on submit.
import { emit } from '../../core/events.js'
import { CAPTURE, FPS } from '../../core/clock.js'
import { MotionBlur } from '../../core/MotionBlur.jsx'
import { rowState } from './select.js'
import { submitEvent, hoversOf } from './state.js'
import { tileExit } from './exit.js'
import { clamp, F } from '../../core/anim.js'
import { Tile } from './Tile.jsx'
import { SLOTS5 } from './layout.js'
import { stageScale } from '../../core/Stage.jsx'

const snap = (v) => {
  const d = stageScale() * (window.devicePixelRatio || 1)
  return Math.round(v * d) / d
}
import { USERS } from './state.js'
import { blur, layerHint } from './blur.js'

// Hover look, continuous across events: every login.hover event retargets colour (0/1),
// scale (1, 1.1 colour-only hover, 1.27 enlarged hover) and label emphasis from wherever
// they are, with linear ramps measured on the reference (grow 3.6 frames, shrink 1.6).
const LEVEL = { off: 1, small: 1.1, big: 1.27 }
const COLOR_IN = F(2)
const COLOR_OUT = F(2)
const GROW = F(3.6)
const SHRINK = F(1.6)

function ramp(from, to, dt, durUp, durDown) {
  const dur = to > from ? durUp : durDown
  return from + (to - from) * clamp(dt / dur)
}

export function hoverLook(t, id) {
  let c = 0, s = 1, l = 0
  let te = -Infinity, c0 = 0, s0 = 1, l0 = 0, ct = 0, st = 1, lt = 0
  for (const e of hoversOf(t, id)) {
    // value of each channel at this event, then retarget
    c0 = ramp(c0, ct, e.t - te, COLOR_IN, COLOR_OUT)
    s0 = ramp(s0, st, e.t - te, GROW, SHRINK)
    l0 = ramp(l0, lt, e.t - te, GROW, SHRINK)
    te = e.t
    ct = e.on ? 1 : 0
    st = e.on ? (e.big ? LEVEL.big : LEVEL.small) : LEVEL.off
    lt = e.on && e.big ? 1 : 0
  }
  c = ramp(c0, ct, t - te, COLOR_IN, COLOR_OUT)
  s = ramp(s0, st, t - te, GROW, SHRINK)
  l = ramp(l0, lt, t - te, GROW, SHRINK)
  return { color: c, scale: s, label: l }
}

function handlers(id, selected) {
  if (CAPTURE) return {}
  return {
    onPointerEnter: () => emit('login.hover', { id, on: true, big: true }),
    onPointerLeave: () => emit('login.hover', { id, on: false, big: true }),
    onPointerDown: (e) => {
      e.stopPropagation()
      if (!selected && !submitEvent(Infinity)) emit('login.select', { id })
    },
  }
}

// white light pooling under the pressed tile (frames ~173-186): a bright core and a wide halo
function PressGlow({ x, k }) {
  const a = clamp((k - 4.5) / 2) * (1 - clamp((k - 16.5) / 2.5))
  if (a <= 0) return null
  const g = clamp((k - 4.5) / 6)
  const core = 64 + 36 * g
  const wide = 100 + 40 * g
  const ell = (w, h, y, bg, op) => (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        borderRadius: '50%',
        background: bg,
        opacity: op,
        pointerEvents: 'none',
      }}
    />
  )
  return (
    <>
      {ell(wide, 34, 668, 'radial-gradient(closest-side, rgba(225,242,255,0.75), rgba(200,230,255,0.35) 60%, rgba(200,230,255,0) 100%)', a)}
      {ell(core, 16, 667, 'radial-gradient(closest-side, rgba(255,255,255,1), rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 100%)', a)}
    </>
  )
}

const BOX = { w: 110, top: 590, h: 110 }

export function TileRow({ t, row, exitK }) {
  const { tiles, sel, change } = row
  return (
    <>
      {USERS.map((u, i) => {
        const st = tiles[i]
        const isSel = i === sel && change
        const k = isSel ? (t - change.t) * FPS : Infinity
        let look = hoverLook(t, u.id)
        let labelOpacity = st.labelFade ?? 1
        let opacity = 1
        let labelGlow = 0
        if (isSel) {
          // the pressed tile pops (enlarged look) and hands over to the 3D slab at k 1.5-2.5
          look = { ...look, label: Math.max(look.label, clamp((k - 1) / 1.5)) }
          opacity = 1 - clamp((k - 1.5) / 1)
          labelGlow = clamp((k - 4) / 2)
          // washed out by the glow, then back as a white bold label before the launch
          labelOpacity = (1 - 0.7 * clamp((k - 5) / 2) * (1 - clamp((k - 11) / 3))) * (1 - clamp((k - 17) / 2.5))
        } else if (st.slab) {
          opacity = 0
          labelOpacity = 0
        }
        const k0 = exitK(t)
        const exit = k0 != null ? tileExit(k0, i, sel) : null
        // the blur layer is the tile's own box, laid out at the tile's 5-slot position and moved
        // only by transforms (static content: one raster, then composites; exit flips pivot on it)
        const base = SLOTS5[i]
        const box = { left: base - BOX.w / 2, top: BOX.top, width: BOX.w, height: BOX.h }
        const pose = (tt) => {
          const x = st.sliding ? rowState(tt).tiles[i].x : st.x
          const ke = exitK(tt)
          const e = ke != null ? tileExit(ke, i, sel) : null
          return {
            // while sliding, whole device pixels: a composited copy rasterised once then only
            // translated by whole pixels looks the same whatever frame it was first drawn on
            transform: `translateX(${(st.sliding ? snap(x - base) : x - base).toFixed(3)}px)` + (e ? e.transform : ''),
            transformOrigin: '50% 37%',
            opacity: e ? e.opacity : 1,
          }
        }
        return (
          <MotionBlur
            key={u.id}
            t={t}
            moving={st.sliding || (exit != null && exit.moving)}
            {...blur(st.sliding ? 'slide' : 'tiles')}
            style={{ ...box, pointerEvents: 'none' }}
            layerStyle={{ pointerEvents: 'none', ...(st.sliding || (exit != null && exit.moving) ? layerHint : null) }}
            pose={pose}
          >
            <div style={{ position: 'absolute', left: -box.left, top: -box.top }}>
              <Tile
                user={u}
                x={base}
                look={{ ...look, opacity, labelOpacity, labelGlow }}
                {...handlers(u.id, i === sel)}
              />
              {isSel && <PressGlow x={base} k={k} />}
            </div>
          </MotionBlur>
        )
      })}
    </>
  )
}
