// Check box and radio button. Values live in the log ('ui.value'): a check box under its id,
// a radio group under the group id (value = the chosen option).
//
//   <Checkbox id label x y def onChange checked? />   checked: controlled (else from the log)
//   <Radio group option label x y def onChange value? />
import { memo } from 'react'
import { emit } from '../core/events.js'
import { useTime } from '../core/time.jsx'
import { valueOf, hoverLevel, isPressed, isHover } from './state.js'
import { pressHandlers } from './Button.jsx'
import { C, FONT } from './theme.js'

const Box = memo(function Box({ radio, on, k, p, disabled }) {
  const r = radio ? 7 : 3
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        <linearGradient id="ui-chk-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dfe8f5" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id="ui-chk-hot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bfe0ff" />
          <stop offset="1" stopColor="#f2f9ff" />
        </linearGradient>
        <radialGradient id="ui-radio-dot" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#bfe4ff" />
          <stop offset="0.55" stopColor="#3f8ae6" />
          <stop offset="1" stopColor="#1a4fae" />
        </radialGradient>
      </defs>
      <rect x="0.5" y="0.5" width="12" height="12" rx={r - 0.5} fill={disabled ? '#f1f3f7' : p ? '#c9ddf6' : 'url(#ui-chk-bg)'} stroke={disabled ? '#c3cad6' : '#6f8fbf'} strokeWidth="1" />
      {k > 0 && !disabled && <rect x="1.5" y="1.5" width="10" height="10" rx={r - 1.5} fill="url(#ui-chk-hot)" opacity={k} />}
      {on &&
        (radio ? (
          <circle cx="6.5" cy="6.5" r="3.2" fill={disabled ? '#a8b2c4' : 'url(#ui-radio-dot)'} />
        ) : (
          <path d="M3 6.6 L5.4 9 L10 3.6" fill="none" stroke={disabled ? '#a8b2c4' : '#1f5fbf'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        ))}
    </svg>
  )
})

function Labelled({ hid, onClick, x, y, w, radio, on, label, disabled, t: tProp, size = 11 }) {
  const t0 = useTime()
  const t = tProp ?? t0
  const k = disabled ? 0 : hoverLevel(t, hid)
  const p = !disabled && isPressed(t, hid) && isHover(t, hid)
  const handlers = disabled ? {} : pressHandlers(hid, onClick)
  return (
    <div
      {...handlers}
      style={{
        position: x == null ? 'relative' : 'absolute',
        left: x,
        top: y,
        width: w,
        height: 16,
        paddingLeft: 19,
        boxSizing: 'border-box',
        display: x == null ? 'inline-block' : 'block',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 1.5, width: 13, height: 13 }}>
        <Box radio={radio} on={on} k={k} p={p} disabled={disabled} />
      </div>
      <span style={{ fontFamily: FONT, fontSize: size, lineHeight: '16px', color: disabled ? '#a4abbb' : C.text, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  )
}

export const checkedOf = (t, id, def = false) => !!valueOf(t, id, def)

export function Checkbox({ id, label, x, y, w, def = false, checked, onChange, disabled, t }) {
  const t0 = useTime()
  const on = checked ?? checkedOf(t ?? t0, id, def)
  return (
    <Labelled
      hid={id}
      x={x}
      y={y}
      w={w}
      on={on}
      label={label}
      disabled={disabled}
      t={t}
      onClick={() => {
        if (checked === undefined) emit('ui.value', { id, value: !on })
        onChange?.(!on)
      }}
    />
  )
}

export function Radio({ group, option, label, x, y, w, def, value, onChange, disabled, t }) {
  const t0 = useTime()
  const cur = value ?? valueOf(t ?? t0, group, def)
  const on = cur === option
  return (
    <Labelled
      hid={group + ':' + option}
      x={x}
      y={y}
      w={w}
      radio
      on={on}
      label={label}
      disabled={disabled}
      t={t}
      onClick={() => {
        if (on) return
        if (value === undefined) emit('ui.value', { id: group, value: option })
        onChange?.(option)
      }}
    />
  )
}
