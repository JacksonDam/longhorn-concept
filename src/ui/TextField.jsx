// Text input. A real <input>/<textarea> (invisible, class lh-input) takes the keyboard, the
// clipboard and mouse selection; every change is logged as 'ui.value' { id, value: { text, a, b,
// sx, sy } } (text, selection, scroll) and the visible field, selection and blinking caret are
// drawn from the log.
//
//   <TextField id x y w h placeholder multiline variant="light" | "chrome" | "bare" onEnter onChange />
//   textOf(t, id), setText(id, text), focusField(id)
import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import { emit } from '../core/events.js'
import { now } from '../core/clock.js'
import { useUITime as useTime, useLive } from './scope.jsx'
import { valueOf, focusAt, setFocus, lastOf } from './state.js'
import { C, FONT } from './theme.js'
import './ui.css'

const EMPTY = { text: '', a: 0, b: 0, sx: 0, sy: 0 }
export const textOf = (t, id) => valueOf(t, id, EMPTY).text
export const fieldState = (t, id) => valueOf(t, id, EMPTY)
export function setText(id, text) {
  const n = text.length
  emit('ui.value', { id, value: { text, a: n, b: n, sx: 0, sy: 0 } })
}

// id -> live element, so apps can move the keyboard into a field (e.g. when a window opens)
const fields = new Map()
export function focusField(id) {
  const el = fields.get(id)
  if (el && document.activeElement !== el) el.focus({ preventScroll: true })
}
export const BLINK = 0.53 // s, the Windows caret blink

const boxLook = {
  light: (f) => ({
    borderRadius: 3,
    background: '#ffffff',
    boxShadow: f
      ? 'inset 0 0 0 1px #5a92e0, inset 0 1px 2px rgba(30,70,140,0.25), 0 0 3px rgba(90,160,255,0.45)'
      : 'inset 0 0 0 1px #a6b9d6, inset 0 1px 2px rgba(30,70,140,0.18)',
  }),
  // the my Music breadcrumb / search field on the blue band
  chrome: (f) => ({
    borderRadius: 9,
    background: f ? 'linear-gradient(90deg, #eef6ff, #f4f8fd)' : 'linear-gradient(90deg, #d9ecfb 0, #e5effa 60%, #dce8f6 100%)',
    boxShadow: '0 -1px 0 rgba(20,55,105,0.75), inset 0 1px 1px rgba(10,40,100,0.35), 0 1px 0 rgba(170,210,255,0.35)',
  }),
  bare: () => ({}),
}

const Segs = memo(function Segs({ text, a, b, focused, caret, selColor, color, placeholder, phColor }) {
  if (!text) {
    return (
      <>
        {caret && <Caret color={color} />}
        {placeholder && !focused && <span style={{ color: phColor }}>{placeholder}</span>}
        {'​'}
      </>
    )
  }
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  if (lo === hi || !focused) {
    return (
      <>
        {text.slice(0, lo)}
        {caret && <Caret color={color} />}
        {text.slice(lo)}
        {text.endsWith('\n') ? '​' : null}
      </>
    )
  }
  return (
    <>
      {text.slice(0, lo)}
      <span style={{ background: selColor, color: '#fff', boxDecorationBreak: 'clone' }}>{text.slice(lo, hi)}</span>
      {text.slice(hi)}
      {text.endsWith('\n') ? '​' : null}
    </>
  )
})

function Caret({ color }) {
  return <span style={{ display: 'inline-block', width: 0, height: '1.15em', marginRight: -1, borderLeft: `1px solid ${color}`, verticalAlign: '-0.2em' }} />
}

export function TextField({
  id,
  x,
  y,
  w = 160,
  h = 20,
  multiline = false,
  placeholder,
  variant = 'light',
  size = 11,
  lineHeight,
  pad = 5,
  color = '#22324f',
  phColor = '#8ab0d8',
  onEnter,
  onChange,
  onKeyDown,
  readOnly = false,
  disabled = false,
  maxLength,
  fontFamily = FONT,
  fontWeight = 400,
  style,
  t: tProp,
}) {
  const t0 = useTime()
  const t = tProp ?? t0
  const live = useLive()
  const st = valueOf(t, id, EMPTY)
  const fe = focusAt(t)
  const focused = !!fe && fe.field === id
  // caret: on for 0.53 s after each edit / move / focus, then blinks
  const since = t - Math.max(fe && focused ? fe.t : 0, lastChangeT(t, id))
  const caret = focused && !readOnly && st.a === st.b && Math.floor(since / BLINK) % 2 === 0
  const ref = useRef(null)
  const lh = lineHeight ?? (multiline ? Math.round(size * 1.4) : h)
  const textStyle = {
    fontFamily,
    fontWeight,
    fontSize: size,
    lineHeight: `${lh}px`,
    padding: multiline ? `${pad - 1}px ${pad}px` : `0 ${pad}px`,
    letterSpacing: 0,
    whiteSpace: multiline ? 'pre-wrap' : 'pre',
    overflowWrap: multiline ? 'break-word' : 'normal',
    wordBreak: 'normal',
    tabSize: 4,
  }

  // keep the real element in step with the log (programmatic setText, replays, cut logs)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.value !== st.text) {
      el.value = st.text
      if (document.activeElement === el) el.setSelectionRange(st.a, st.b)
    }
  })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    fields.set(id, el)
    // selection moves inside the field (arrows, drag) arrive as selectionchange
    const onSel = () => {
      if (document.activeElement === el) sync(el)
    }
    document.addEventListener('selectionchange', onSel)
    return () => {
      document.removeEventListener('selectionchange', onSel)
      if (fields.get(id) === el) fields.delete(id)
    }
  }, [id, live])

  const sync = (el) => {
    const v = { text: el.value, a: el.selectionStart ?? 0, b: el.selectionEnd ?? 0, sx: Math.round(el.scrollLeft), sy: Math.round(el.scrollTop) }
    const cur = valueOf(now(), id, EMPTY)
    if (cur.text === v.text && cur.a === v.a && cur.b === v.b && cur.sx === v.sx && cur.sy === v.sy) return
    emit('ui.value', { id, value: v })
    if (cur.text !== v.text) onChange?.(v.text)
  }
  const Tag = multiline ? 'textarea' : 'input'
  const look = (boxLook[variant] || boxLook.light)(focused)
  return (
    <div
      style={{
        position: x == null ? 'relative' : 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        ...look,
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: look.borderRadius, pointerEvents: 'none' }}>
        <div
          style={{
            ...textStyle,
            color,
            position: 'absolute',
            left: 0,
            top: 0,
            width: multiline ? w : undefined,
            boxSizing: 'border-box',
            transform: st.sx || st.sy ? `translate(${-st.sx}px, ${-st.sy}px)` : undefined,
          }}
        >
          <Segs text={st.text} a={st.a} b={st.b} focused={focused} caret={caret} selColor={C.textSel} color={color} placeholder={placeholder} phColor={phColor} />
        </div>
      </div>
      {live && <Tag
        ref={ref}
        className="lh-input"
        spellCheck={false}
        autoComplete="off"
        readOnly={readOnly}
        disabled={disabled}
        maxLength={maxLength}
        defaultValue={st.text}
        style={{ ...textStyle, left: 0, top: 0, width: w, height: h }}
        onInput={(e) => sync(e.currentTarget)}
        onSelect={(e) => sync(e.currentTarget)}
        onScroll={(e) => sync(e.currentTarget)}
        onPointerUp={(e) => sync(e.currentTarget)}
        onFocus={(e) => {
          setFocus(id)
          sync(e.currentTarget)
        }}
        onBlur={() => {
          const f = focusAt(now())
          if (f && f.field === id) emit('ui.focus', { id: 'kbd', field: null })
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
          onKeyDown?.(e)
          if (e.defaultPrevented) return
          if (e.key === 'Enter' && onEnter && (!multiline || !e.shiftKey)) {
            e.preventDefault()
            onEnter(e.currentTarget.value)
          }
        }}
        onKeyUp={(e) => {
          e.stopPropagation()
          sync(e.currentTarget)
        }}
      />}
    </div>
  )
}

// time of the last value event for a field (caret blink phase)
function lastChangeT(t, id) {
  const e = lastOf(t, 'ui.value', id)
  return e ? e.t : 0
}
