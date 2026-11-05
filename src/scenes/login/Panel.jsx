// Password panel beside the selected user's slab: name, e-mail (Sondra only), prompt, the
// white field with one glass bullet per typed character and the round go button.
// Entrance (frames 193-199): the panel sweeps in from behind the slab with a long horizontal
// motion blur and a small overshoot; exit: fades.
import { memo } from 'react'
import { MotionBlur } from '../../core/MotionBlur.jsx'
import { clamp } from '../../core/anim.js'
import { FPS, CAPTURE } from '../../core/clock.js'
import { emit } from '../../core/events.js'
import { userById, passwordLength } from './state.js'
import { panelExit } from './exit.js'
import { blur } from './blur.js'

const P = { left: 505, top: 290, width: 215, height: 105 } // panel box (stage px)
// panel x offset (px) vs frames since select (select = video frame 168)
// measured from the streak ends: at 194 the field smears over x 0-520, at 195 over 450-750,
// then it overshoots ~45 px and settles by 198
const SWEEP = [
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

const text = { position: 'absolute', whiteSpace: 'nowrap', lineHeight: 1 }

const Field = memo(function Field() {
  return (
    <svg width="200" height="34" style={{ position: 'absolute', left: 516 - P.left - 6, top: 360 - P.top, overflow: 'visible' }}>
      <defs>
        <linearGradient id="pw-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c2dcff" />
          <stop offset="0.12" stopColor="#f0f6ff" />
          <stop offset="0.45" stopColor="#e6e8ec" />
          <stop offset="0.85" stopColor="#dfe8f6" />
          <stop offset="1" stopColor="#c6d7ec" />
        </linearGradient>
        <radialGradient id="pw-orb" cx="0.45" cy="0.7" r="0.62">
          <stop offset="0" stopColor="#5fe0ff" />
          <stop offset="0.45" stopColor="#1c95ff" />
          <stop offset="1" stopColor="#0a5fd8" />
        </radialGradient>
        <linearGradient id="pw-orb-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d4f6ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#8fd0ff" stopOpacity="0" />
        </linearGradient>
        <filter id="pw-soft" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      {/* soft light under the field and the tail running into the orb */}
      <rect x="8" y="17" width="150" height="7" rx="3.5" fill="#a8c8ff" opacity="0.55" filter="url(#pw-soft)" />
      <path d="M150 22 C 162 24, 168 26, 178 25" stroke="#9fc4ff" strokeWidth="3" fill="none" opacity="0.6" filter="url(#pw-soft)" />
      <rect x="6" y="6" width="150.5" height="14" rx="7" fill="url(#pw-field)" />
      {/* go button */}
      <g transform="translate(178.5 11)">
        <circle r="13.6" fill="#033a8c" opacity="0.75" />
        <circle r="12" fill="url(#pw-orb)" />
        <ellipse cx="0" cy="-5.2" rx="8.2" ry="5.6" fill="url(#pw-orb-top)" />
        <path d="M-2 -3 L2.5 0.5 L-2 4" stroke="#9fe4ff" strokeWidth="1.3" fill="none" opacity="0.45" strokeLinecap="round" />
      </g>
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
      <circle r="4.7" fill={`url(#pw-b${i})`} />
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
        <div style={{ ...text, left: 521.5 - P.left, top: 322.5 - P.top, fontFamily: 'Libre Franklin', fontWeight: 500, fontSize: 10.5, letterSpacing: 0.06, color: '#e6ebff' }}>
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
  if (k < PANEL_IN) return null
  const len = passwordLength(t)
  const ex = submitT != null ? panelExit(t - submitT) : { opacity: 1 }
  const moving = k < 31
  return (
    <MotionBlur
      t={t}
      moving={moving}
      {...blur('panel')}
      style={{ left: P.left, top: P.top, width: P.width, height: P.height, opacity: ex.opacity }}
      pose={(tt) => {
        const kk = (tt - change.t) * FPS
        return { transform: `translateX(${sweep(kk).toFixed(2)}px)`, opacity: clamp((kk - 25.3) / 0.5) }
      }}
    >
      <PanelBody id={id} len={len} />
      {!CAPTURE && (
        <div
          title="Go"
          onPointerDown={(e) => {
            e.stopPropagation()
            if (submitT == null) emit('login.submit')
          }}
          style={{ position: 'absolute', left: 688.5 - P.left - 13, top: 371 - P.top - 13, width: 26, height: 26, borderRadius: 13, cursor: 'pointer' }}
        />
      )}
    </MotionBlur>
  )
}
