// Password panel beside the selected user's slab: name, e-mail (Sondra only), prompt, the
// white field with one glass bullet per typed character and the round go button.
// Entrance (frames 193-199): the panel sweeps in from behind the slab with a long horizontal
// motion blur and a small overshoot; exit: fades.
import { memo } from 'react'
import { clamp } from '../../core/anim.js'
import { FPS, CAPTURE } from '../../core/clock.js'
import { emit, all } from '../../core/events.js'
import { userById, passwordLength } from './state.js'
import { panelExit } from './exit.js'
import { blur, layerHint } from './blur.js'

const P = { left: 505, top: 290, width: 215, height: 105 } // panel box (stage px)
// panel x offset (px) vs frames since select (select = video frame 168)
// measured from the streak ends: at 194 the field smears over x 0-520, at 195 over 450-750,
// then it overshoots ~45 px and settles by 198
let SWEEP = [
  [25.3, -1000],
  [26, -420],
  [26.5, -150],
  [27, 8],
  [27.5, 38],
  [28, 45],
  [28.5, 30],
  [29, 12],
  [29.5, 4],
  [30, 0],
]
try {
  const o = new URLSearchParams(location.search).get('sweep') // local fitting aid
  if (o) SWEEP = JSON.parse(o)
} catch {
  // keep the fitted keys
}
function sweep(k) {
  if (k <= SWEEP[0][0]) return SWEEP[0][1]
  for (let i = 1; i < SWEEP.length; i++) {
    if (k <= SWEEP[i][0]) {
      const [k0, v0] = SWEEP[i - 1], [k1, v1] = SWEEP[i]
      const u = (k - k0) / (k1 - k0)
      return v0 + (v1 - v0) * u
    }
  }
  return 0
}
export const PANEL_IN = 24.8 // k when the panel starts to show
const PREMOUNT = 20.5 // copies mount over k 20.5-24.5 (n/4 per frame)

const text = { position: 'absolute', whiteSpace: 'nowrap', lineHeight: 1 }

const Field = memo(function Field() {
  return (
    <svg width="200" height="34" style={{ position: 'absolute', left: 516 - P.left - 6, top: 360 - P.top, overflow: 'visible' }}>
      <defs>
        {/* an inset field (measured on frames 290-320): light-blue rim, a bright line under the
            top edge, a flat neutral grey, a darker line over the bottom rim */}
        <linearGradient id="pw-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fa6e2" />
          <stop offset="0.07" stopColor="#cddff4" />
          <stop offset="0.13" stopColor="#e6f4ff" />
          <stop offset="0.22" stopColor="#dfe4e7" />
          <stop offset="0.8" stopColor="#dfe4e8" />
          <stop offset="0.87" stopColor="#d0d4dc" />
          <stop offset="0.94" stopColor="#86b8ea" />
          <stop offset="1" stopColor="#5b8fd0" />
        </linearGradient>
        {/* glass: a deep saturated blue, light gathered in a crescent at the bottom right, the
            highlight at the top (measured on frames 290-320) */}
        <radialGradient id="pw-orb" cx="0.72" cy="0.82" r="0.62">
          <stop offset="0" stopColor="#6edcff" />
          <stop offset="0.45" stopColor="#52c6ff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#2a9cff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pw-orb-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d4f6ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#8fd0ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* the light bridging the field's end to the orb, and the tail curving under into it */}
      {/* (soft shapes drawn with gradients rather than SVG blur filters: cheap to rasterise) */}
      <rect x="150" y="9" width="22" height="9" rx="4.5" fill="#6aa0ee" opacity="0.28" />
      <path d="M152 22.5 C 162 26.5, 172 27, 182 23" stroke="#9fc4ff" strokeWidth="4" fill="none" opacity="0.3" strokeLinecap="round" />
      {/* the light rim around the field, then the field */}
      <rect x="4.6" y="4.1" width="153.3" height="18.8" rx="9.4" fill="#a9cdfa" opacity="0.35" />
      <rect x="6" y="5.5" width="150.5" height="16" rx="8" fill="url(#pw-field)" />
      {/* go button */}
      <g transform="translate(178.5 11)">
        <circle r="13.6" fill="#0a3f96" opacity="0.5" />
        <circle r="12" fill="#1189f8" />
        <circle r="12" fill="url(#pw-orb)" />
        <ellipse cx="-0.5" cy="-4.2" rx="9" ry="6.8" fill="url(#pw-orb-top)" />
        <path d="M-2 -3 L2.5 0.5 L-2 4" stroke="#9fe4ff" strokeWidth="1.3" fill="none" opacity="0.3" strokeLinecap="round" />
      </g>
    </svg>
  )
})

// The go button pulses once the pointer has been over it (the reference: from its hover at
// frame 333 its cyan glow swings between two levels, a 60-frame period, 2 s): a cyan overlay
// whose opacity follows a sine, 48 frames past the hover at its rising midpoint.
const PULSE = { period: 60, lag: 48, mid: 0.5, amp: 0.2 }
function pulseOpacity(t, since) {
  const f = (t - since) * FPS - PULSE.lag
  return PULSE.mid + PULSE.amp * Math.sin((2 * Math.PI * f) / PULSE.period)
}
const GoPulse = memo(function GoPulse({ o }) {
  return (
    <svg width="28" height="28" viewBox="-14 -14 28 28" style={{ position: 'absolute', left: 688.5 - P.left - 14, top: 371 - P.top - 14, opacity: o }}>
      <defs>
        <radialGradient id="pw-pulse" cx="0.5" cy="0.6" r="0.5">
          <stop offset="0" stopColor="#3cf8ff" />
          <stop offset="0.7" stopColor="#30e4ff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#20c8ff" stopOpacity="0.35" />
        </radialGradient>
        <linearGradient id="pw-pulse-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e4fbff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#9fe8ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle r="12" fill="url(#pw-pulse)" />
      {/* the orb's highlight stays on top of the glow */}
      <ellipse cx="-0.5" cy="-4.2" rx="9" ry="6.8" fill="url(#pw-pulse-top)" />
    </svg>
  )
})

const Bullet = memo(function Bullet({ i }) {
  return (
    <svg width="11" height="11" viewBox="-5.5 -5.5 11 11" style={{ position: 'absolute', left: 528 - P.left + 13.4 * i - 5.5, top: 372.6 - P.top - 5.5 }}>
      <defs>
        <radialGradient id={`pw-b${i}`} cx="0.6" cy="0.68" r="0.6">
          <stop offset="0" stopColor="#4d8fe0" />
          <stop offset="0.6" stopColor="#2f6bbd" />
          <stop offset="1" stopColor="#7d9cc4" />
        </radialGradient>
      </defs>
      <circle r="5.5" fill="#f4fbff" opacity="0.5" />
      <circle r="4.2" fill={`url(#pw-b${i})`} />
      <ellipse cx="-1.2" cy="-2" rx="2.6" ry="1.7" fill="#e8f6ff" opacity="0.75" />
    </svg>
  )
})

const PanelBody = memo(function PanelBody({ id, len }) {
  const u = userById[id]
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: P.width, height: P.height }}>
      <div style={{ ...text, left: 521 - P.left, top: 299 - P.top, fontFamily: 'Libre Franklin', fontWeight: 600, fontSize: 15.4, color: '#f4f7ff', textShadow: '0 1px 2px rgba(0,20,90,0.4)' }}>
        {u.name}
      </div>
      {u.email && (
        <div style={{ ...text, left: 521.5 - P.left, top: 322.5 - P.top, fontFamily: 'Libre Franklin', fontWeight: 420, fontSize: 10.5, letterSpacing: 0.12, color: '#e6ebff' }}>
          {u.email}
        </div>
      )}
      <div style={{ ...text, left: 521.5 - P.left, top: 349.5 - P.top, fontFamily: 'Libre Franklin', fontWeight: 400, fontSize: 7.8, color: '#9fbcf5' }}>
        Enter Password to begin
      </div>
      <Field />
      {Array.from({ length: Math.min(len, 10) }, (_, i) => (
        <Bullet key={i} i={i} />
      ))}
    </div>
  )
})

export function Panel({ t, row, submitT }) {
  // the panel belongs to the current selection; it leaves at once when deselected
  const { sel, change } = row
  if (!change || sel < 0) return null
  const id = row.records.find((r) => r.back == null)?.id
  if (!id) return null
  const k = (t - change.t) * FPS
  // mounted (and its blur copies rasterised, all but invisible at the rest position) a few
  // frames before it sweeps in, so the sweep's first frame is a composite, not 32 rasters
  if (k < PREMOUNT) return null
  const len = passwordLength(t)
  const ex = submitT != null ? panelExit(t - submitT) : { opacity: 1 }
  const moving = k < 31
  const pose = (tt) => {
    const kk = (tt - change.t) * FPS
    if (kk < 25.3) return { transform: 'translateX(0px)', opacity: 0.004 }
    return { transform: `translateX(${sweep(kk).toFixed(2)}px)`, opacity: clamp((kk - 25.3) / 0.5) }
  }
  // the first hover of the go button since this selection starts its pulse
  const hovered = all(t, (e) => e.type === 'login.gohover' && e.t >= change.t)[0]
  const body = (
    <>
      <PanelBody id={id} len={len} />
      {hovered && <GoPulse o={Math.round(pulseOpacity(t, hovered.t) * 100) / 100} />}
      <div
        title="Go"
        onPointerEnter={() => {
          if (!CAPTURE && submitT == null && !hovered) emit('login.gohover', { id })
        }}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (!CAPTURE && submitT == null) emit('login.submit', { id })
        }}
        style={{ position: 'absolute', left: 688.5 - P.left - 13, top: 371 - P.top - 13, width: 26, height: 26, borderRadius: 13, cursor: 'pointer' }}
      />
    </>
  )
  const box = { position: 'absolute', left: P.left, top: P.top, width: P.width, height: P.height, opacity: ex.opacity }
  const layer = { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }
  if (!moving) return <div style={box}><div style={{ ...layer, ...pose(t) }}>{body}</div></div>
  // the sweep's blur copies (like core/MotionBlur, each on its own layer), mounted a few per
  // frame ahead of the sweep so no single frame rasterises all of them
  const { samples: n, shutter, phase } = blur('panel')
  const mounted = k >= 25.3 ? n : Math.min(n, Math.max(1, Math.ceil((k - PREMOUNT + 0.5) * (n / 4))))
  const layers = []
  for (let j = 0; j < mounted; j++) {
    const p = pose(t + shutter * ((j + 0.5) / n + phase))
    layers.push(
      <div key={j} style={{ ...layer, ...layerHint, ...p, opacity: (p.opacity ?? 1) / n, mixBlendMode: 'plus-lighter' }}>
        {body}
      </div>,
    )
  }
  return <div style={{ ...box, isolation: 'isolate' }}>{layers}</div>
}
