// Plex push buttons. Hover and press are logged ('hover' / 'press' events) and drawn as opacity
// layers over a static face, so a fade only changes two opacities per frame.
//
//   <Button id label onClick variant x y w h isDefault disabled />
//     variant 'light' (dialogs and pale bodies), 'glass' (on the blue chrome), 'link' (task-pane
//     style text link), 'flat' (a borderless row button on pale bodies)
//   <ToolButton id icon label onClick x y />  icon + label on the blue chrome (toolbar items)
//   pressHandlers(id, onClick) for custom clickable things (hover + press + click)
import { memo } from 'react'
import { emit } from '../core/events.js'
import { now } from '../core/clock.js'
import { useTime } from '../core/time.jsx'
import { hoverLevel, isPressed, isHover, pt } from './state.js'
import { C, FONT, HEAVY } from './theme.js'

export function pressHandlers(id, onClick, { button = 0, onDown } = {}) {
  return {
    onPointerEnter: (e) => emit('hover', { id, on: true, ...pt(e) }),
    onPointerLeave: () => {
      emit('hover', { id, on: false })
      if (isPressed(now(), id)) emit('press', { id, on: false })
    },
    onPointerDown: (e) => {
      if (e.button !== button) return
      emit('press', { id, on: true })
      onDown?.(e)
    },
    onPointerUp: (e) => {
      if (e.button !== button) return
      if (isPressed(now(), id)) {
        emit('press', { id, on: false })
        onClick?.(e)
      }
    },
  }
}

// hover k (0..1) and press p (0/1, only while the pointer is still over it)
export function useButtonState(id, disabled, tProp) {
  const t0 = useTime()
  const t = tProp ?? t0
  if (disabled) return { k: 0, p: 0, t }
  const k = hoverLevel(t, id)
  const p = isPressed(t, id) && isHover(t, id) ? 1 : 0
  return { k, p, t }
}

const pos = (x, y, w, h) =>
  x == null ? { position: 'relative', display: 'inline-block', width: w, height: h, verticalAlign: 'middle' } : { position: 'absolute', left: x, top: y, width: w, height: h }

const fill = { position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none' }

const LightFace = memo(function LightFace({ isDefault, disabled }) {
  return (
    <>
      <div
        style={{
          ...fill,
          background: disabled
            ? 'linear-gradient(180deg, #f7f9fc, #e9eef6)'
            : 'linear-gradient(180deg, #ffffff 0, #f1f6fd 45%, #dfe9f8 55%, #e8f0fb 100%)',
          boxShadow: disabled
            ? 'inset 0 0 0 1px #c3cddd'
            : isDefault
              ? 'inset 0 0 0 1px #5d8fd6, inset 0 0 0 2px #a9d0ff, 0 1px 2px rgba(40,80,150,0.25)'
              : 'inset 0 0 0 1px #8aa8d6, inset 0 0 0 2px rgba(255,255,255,0.7), 0 1px 2px rgba(40,80,150,0.18)',
        }}
      />
    </>
  )
})
const LightHover = memo(function LightHover() {
  return (
    <div
      style={{
        ...fill,
        background: 'linear-gradient(180deg, #f6fbff 0, #e1f1ff 45%, #c6e4ff 55%, #d9efff 100%)',
        boxShadow: 'inset 0 0 0 1px #4f8fe6, inset 0 0 0 2px rgba(255,255,255,0.75), 0 0 4px rgba(90,160,255,0.45)',
      }}
    />
  )
})
const LightPress = memo(function LightPress() {
  return (
    <div
      style={{
        ...fill,
        background: 'linear-gradient(180deg, #b9d5f6 0, #cfe2fa 50%, #e3eefc 100%)',
        boxShadow: 'inset 0 0 0 1px #3f78c8, inset 0 1px 3px rgba(20,60,130,0.45)',
      }}
    />
  )
})
const GlassHover = memo(function GlassHover() {
  return (
    <div
      style={{
        ...fill,
        background: 'linear-gradient(180deg, rgba(170,215,255,0.6), rgba(120,180,245,0.42))',
        boxShadow: 'inset 0 0 0 1px rgba(190,228,255,0.6), 0 0 3px rgba(150,210,255,0.35)',
      }}
    />
  )
})
const GlassPress = memo(function GlassPress() {
  return (
    <div
      style={{
        ...fill,
        background: 'linear-gradient(180deg, rgba(25,70,150,0.45), rgba(40,95,180,0.3))',
        boxShadow: 'inset 0 0 0 1px rgba(150,200,255,0.5), inset 0 1px 3px rgba(5,30,80,0.5)',
      }}
    />
  )
})
const FlatHover = memo(function FlatHover() {
  return <div style={{ ...fill, background: C.rowHover, boxShadow: 'inset 0 0 0 1px rgba(150,195,250,0.6)' }} />
})

const labelBase = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, whiteSpace: 'nowrap', pointerEvents: 'none' }

export function Button({ id, label, children, onClick, variant = 'light', x, y, w = 75, h = 22, isDefault = false, disabled = false, active = false, style, t }) {
  const { k, p } = useButtonState(id, disabled, t)
  const handlers = disabled ? {} : pressHandlers(id, onClick)
  const content = children ?? label
  if (variant === 'link') {
    // a task-pane link: grey text that turns blue and underlined under the pointer
    return (
      <div {...handlers} style={{ ...pos(x, y, w, h), ...style }}>
        <div
          style={{
            ...labelBase,
            justifyContent: 'flex-start',
            fontFamily: FONT,
            fontSize: 11,
            color: disabled ? '#c4c6cc' : k > 0.5 ? C.link : C.textDark,
            textDecoration: k > 0.5 && !disabled ? 'underline' : 'none',
            transform: p ? 'translateY(0.5px)' : undefined,
          }}
        >
          {content}
        </div>
      </div>
    )
  }
  const glass = variant === 'glass'
  const flat = variant === 'flat'
  const r = glass || flat ? 4 : 4
  return (
    <div {...handlers} style={{ ...pos(x, y, w, h), borderRadius: r, ...style }}>
      {variant === 'light' && <LightFace isDefault={isDefault} disabled={disabled} />}
      {(k > 0 || active) && !p && <div style={{ ...fill, opacity: active ? 1 : k }}>{glass ? <GlassHover /> : flat ? <FlatHover /> : <LightHover />}</div>}
      {p > 0 && (glass || flat ? <GlassPress /> : <LightPress />)}
      <div
        style={{
          ...labelBase,
          fontFamily: glass ? HEAVY : HEAVY,
          fontSize: glass ? 11 : 11,
          color: disabled ? (glass ? 'rgba(220,235,255,0.45)' : '#a4afc2') : glass ? C.chromeText : flat ? C.text : '#2a4f8f',
          filter: glass && !disabled ? 'drop-shadow(0 0 1.2px rgba(10,50,120,0.75))' : undefined,
          transform: p ? 'translateY(1px)' : undefined,
        }}
      >
        {content}
      </div>
    </div>
  )
}

// A toolbar item on the blue chrome: icon + label, the glass highlight under the pointer.
export function ToolButton({ id, icon, label, onClick, x, y, w, h = 24, disabled, active, dropdown, t, iconSize = 18 }) {
  const { k, p } = useButtonState(id, disabled, t)
  const handlers = disabled ? {} : pressHandlers(id, onClick)
  return (
    <div {...handlers} style={{ ...pos(x, y, w, h), borderRadius: 4 }}>
      {(k > 0 || active) && !p && (
        <div style={{ ...fill, opacity: active ? Math.max(0.75, k) : k }}>
          <GlassHover />
        </div>
      )}
      {p > 0 && <GlassPress />}
      <div
        style={{
          ...labelBase,
          justifyContent: label ? 'flex-start' : 'center',
          padding: label ? '0 6px 0 4px' : 0,
          gap: 4,
          fontFamily: HEAVY,
          fontSize: 11,
          color: disabled ? 'rgba(220,235,255,0.45)' : C.chromeText,
          opacity: disabled ? 0.6 : 1,
          transform: p ? 'translateY(1px)' : undefined,
        }}
      >
        {icon && <div style={{ width: iconSize, height: iconSize, flex: 'none', position: 'relative' }}>{icon}</div>}
        {label && <span style={{ filter: 'drop-shadow(0 0 1.2px rgba(10,50,120,0.75))' }}>{label}</span>}
        {dropdown && (
          <svg width="7" height="4" style={{ flex: 'none' }}>
            <path d="M0 0 L7 0 L3.5 4 Z" fill="#e8f4ff" />
          </svg>
        )}
      </div>
    </div>
  )
}
