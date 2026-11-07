// Horizontal slider. Dragging logs 'ui.value' { id, value } (or calls onChange for a value that
// lives elsewhere, e.g. the media position).
//
//   <Slider id x y w min max step def value? onChange variant="plain" | "wedge" | "chrome" />
//   wedge: the my Music "Size" slider (a widening track with a small knob)
import { memo, useRef } from 'react'
import { emit } from '../core/events.js'
import { now } from '../core/clock.js'
import { useUITime as useTime } from './scope.jsx'
import { clamp } from '../core/anim.js'
import { valueOf, hoverLevel, isPressed, stageRect, pt } from './state.js'

const Track = memo(function Track({ w, variant }) {
  if (variant === 'wedge') {
    return (
      <svg width={w} height="14" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <defs>
          <linearGradient id="ui-wedge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3f8ae0" />
            <stop offset="1" stopColor="#8cc4ff" />
          </linearGradient>
        </defs>
        <path d={`M1 9 L${w - 2} 2.5 L${w - 2} 7.5 L1 10 Z`} fill="url(#ui-wedge)" />
      </svg>
    )
  }
  const chrome = variant === 'chrome'
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 5,
        width: w,
        height: 4,
        borderRadius: 2,
        background: chrome ? 'linear-gradient(180deg, rgba(20,50,110,0.55), rgba(70,120,200,0.45))' : 'linear-gradient(180deg, #b9c8de, #e3eaf5)',
        boxShadow: chrome ? 'inset 0 1px 1px rgba(0,20,60,0.5), 0 1px 0 rgba(170,210,255,0.35)' : 'inset 0 1px 1px rgba(40,70,120,0.35)',
      }}
    />
  )
})

// The wedge slider's knob: a small pointed arrow under the track (the video's my Music Size
// slider, f760-1340: about 10 px wide and 6 px tall, its tip in the track's lower edge), drawn
// over the track so the whole arrow shows. Placed at the knob's centre x, the track's top y
// (slider px). k: hover level, p: pressed.
export const WedgeKnob = memo(function WedgeKnob({ k = 0, p = false }) {
  const lit = k > 0.5
  return (
    <svg width="12" height="8" style={{ position: 'absolute', left: -6, top: 6, overflow: 'visible', pointerEvents: 'none' }}>
      <path
        d="M1.25 6.6 L6 0.2 L10.75 6.6 Z"
        fill={p ? '#d3e6fd' : lit ? '#ffffff' : '#f6f9fd'}
        stroke={p ? '#3f78c8' : lit ? '#5a92e0' : '#8a99b2'}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
})

const Knob = memo(function Knob({ variant, k, p }) {
  if (variant === 'wedge') return <WedgeKnob k={k} p={p} />

  return (
    <div
      style={{
        position: 'absolute',
        left: -5,
        top: 0,
        width: 10,
        height: 14,
        borderRadius: 4,
        background: p ? 'linear-gradient(90deg, #cfe3fb, #e9f3ff)' : k > 0.5 ? 'linear-gradient(90deg, #eaf6ff, #ffffff 50%, #dcefff)' : 'linear-gradient(90deg, #f2f6fc, #ffffff 50%, #e8eef8)',
        boxShadow: `inset 0 0 0 1px ${p || k > 0.5 ? '#5a92e0' : '#9fb3cf'}, 0 1px 2px rgba(40,70,130,0.3)`,
      }}
    />
  )
})

export function Slider({ id, x, y, w = 100, min = 0, max = 1, step = 0, def = 0, value, onChange, variant = 'plain', fill = true, disabled, t: tProp }) {
  const t0 = useTime()
  const t = tProp ?? t0
  const v = value ?? valueOf(t, id, def)
  const k = disabled ? 0 : hoverLevel(t, id)
  const p = isPressed(t, id)
  const ref = useRef(null)
  const rect = useRef(null)
  const inset = variant === 'wedge' ? 3 : 5
  const span = w - 2 * inset
  const frac = clamp((v - min) / (max - min || 1))
  const set = (e) => {
    const r = rect.current
    const q = pt(e)
    let nv = min + clamp((q.x - r.x - inset) / span) * (max - min)
    if (step) nv = Math.round(nv / step) * step
    nv = Math.round(nv * 1e4) / 1e4
    const cur = value ?? valueOf(now(), id, def)
    if (nv === cur) return
    if (value === undefined) emit('ui.value', { id, value: nv })
    onChange?.(nv)
  }
  return (
    <div
      ref={ref}
      style={{ position: x == null ? 'relative' : 'absolute', left: x, top: y, width: w, height: 14, opacity: disabled ? 0.5 : 1 }}
      onPointerEnter={(e) => emit('hover', { id, on: true, ...pt(e) })}
      onPointerLeave={() => emit('hover', { id, on: false })}
      onPointerDown={(e) => {
        if (disabled || e.button !== 0) return
        e.stopPropagation()
        rect.current = stageRect(ref.current)
        e.currentTarget.setPointerCapture?.(e.pointerId)
        emit('press', { id, on: true })
        set(e)
      }}
      onPointerMove={(e) => {
        if (rect.current && isPressed(now(), id)) set(e)
      }}
      onPointerUp={(e) => {
        if (!isPressed(now(), id)) return
        e.currentTarget.releasePointerCapture?.(e.pointerId)
        emit('press', { id, on: false })
        rect.current = null
      }}
    >
      <Track w={w} variant={variant} />
      {fill && variant !== 'wedge' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 5,
            width: inset + frac * span,
            height: 4,
            borderRadius: 2,
            background: 'linear-gradient(90deg, #3f8ae0, #8cc4ff)',
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ position: 'absolute', left: inset + frac * span, top: 0, pointerEvents: 'none' }}>
        <Knob variant={variant} k={k} p={p} />
      </div>
    </div>
  )
}
