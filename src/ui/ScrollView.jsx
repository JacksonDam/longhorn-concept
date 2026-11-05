// Scrolling: the my Music window's scrollbar (pale rounded track, white thumb with grip lines,
// outlined triangle arrows) and a clipped view whose offset is logged as 'ui.value'
// { id: `${id}:scroll`, value: px }.
//
//   <ScrollView id x y w h contentH? bar>{memoised content}</ScrollView>   (contentH: measured if omitted)
//   <Scrollbar x y h viewH contentH pos onScroll />
//   scrollOf(t, id), scrollTo(id, px)
import { memo, useLayoutEffect, useRef, useState } from 'react'
import { emit } from '../core/events.js'
import { now } from '../core/clock.js'
import { useUITime as useTime } from './scope.jsx'
import { clamp } from '../core/anim.js'
import { stageScale } from '../core/Stage.jsx'
import { valueOf, hoverLevel, isPressed, pt } from './state.js'

export const BAR_W = 16
const ARROW = 15
export const scrollOf = (t, id) => valueOf(t, id + ':scroll', 0)
export const scrollTo = (id, px) => emit('ui.value', { id: id + ':scroll', value: Math.round(px) })

const Arrow = memo(function Arrow({ down, k }) {
  return (
    <svg width="16" height={ARROW} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <path
        d={down ? 'M2 4.5 L8 10.5 L14 4.5 Z' : 'M2 10.5 L8 4.5 L14 10.5 Z'}
        fill={k > 0.5 ? '#dff0ff' : '#f8fbff'}
        stroke={k > 0.5 ? '#5a92e0' : '#a9b8cc'}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
})

const ThumbFace = memo(function ThumbFace({ len, k }) {
  const mid = len / 2
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 4,
          background: k > 0.5 ? 'linear-gradient(90deg, #e6f3ff, #ffffff 50%, #d9ecff)' : 'linear-gradient(90deg, #f2f6fc, #ffffff 50%, #e8eef8)',
          boxShadow: `inset 0 0 0 1px ${k > 0.5 ? '#7aa7e0' : '#b8c6da'}, 0 1px 2px rgba(60,90,140,0.2)`,
        }}
      />
      {len > 22 &&
        [-6, -2, 2, 6].map((d) => <div key={d} style={{ position: 'absolute', left: 3.5, top: mid + d - 0.5, width: 7, height: 1, background: k > 0.5 ? '#9fc0ea' : '#c8d3e2' }} />)}
    </>
  )
})

export function Scrollbar({ id, x, y, h, viewH, contentH, pos, onScroll, t: tProp }) {
  const t0 = useTime()
  const t = tProp ?? t0
  const drag = useRef(null)
  const max = Math.max(0, contentH - viewH)
  const track = h - 2 * ARROW - 4
  const len = max > 0 ? Math.max(22, Math.round((track * viewH) / contentH)) : track
  const top = ARROW + 2 + (max > 0 ? ((track - len) * pos) / max : 0)
  const kUp = hoverLevel(t, id + ':up')
  const kDn = hoverLevel(t, id + ':dn')
  const kTh = Math.max(hoverLevel(t, id + ':th'), isPressed(t, id + ':th') ? 1 : 0)
  const to = (v) => onScroll(clamp(Math.round(v), 0, max))
  const hov = (hid) => ({
    onPointerEnter: (e) => emit('hover', { id: hid, on: true, ...pt(e) }),
    onPointerLeave: () => emit('hover', { id: hid, on: false }),
  })
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: BAR_W, height: h }} onPointerDown={(e) => e.stopPropagation()}>
      <div
        style={{
          position: 'absolute',
          left: 3,
          top: ARROW + 1,
          width: 10,
          height: h - 2 * ARROW - 2,
          borderRadius: 5,
          background: 'linear-gradient(90deg, rgba(200,214,236,0.55), rgba(246,250,255,0.85) 60%, rgba(220,230,246,0.6))',
        }}
        onPointerDown={(e) => {
          // page up / down towards the click
          const r = e.currentTarget.getBoundingClientRect()
          const yy = (e.clientY - r.top) / stageScale() + ARROW + 1
          to(pos + (yy < top ? -1 : 1) * viewH * 0.9)
        }}
      />
      <div {...hov(id + ':up')} style={{ position: 'absolute', left: 0, top: 0, width: 16, height: ARROW }} onPointerDown={() => to(pos - 40)}>
        <Arrow k={kUp} />
      </div>
      <div {...hov(id + ':dn')} style={{ position: 'absolute', left: 0, top: h - ARROW, width: 16, height: ARROW }} onPointerDown={() => to(pos + 40)}>
        <Arrow down k={kDn} />
      </div>
      {max > 0 && (
        <div
          {...hov(id + ':th')}
          style={{ position: 'absolute', left: 1.5, top, width: 13, height: len }}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.stopPropagation()
            e.currentTarget.setPointerCapture?.(e.pointerId)
            drag.current = { y: pt(e).y, pos }
            emit('press', { id: id + ':th', on: true })
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d) return
            const dy = pt(e).y - d.y
            to(d.pos + (dy * max) / Math.max(1, track - len))
          }}
          onPointerUp={(e) => {
            if (!drag.current) return
            drag.current = null
            e.currentTarget.releasePointerCapture?.(e.pointerId)
            emit('press', { id: id + ':th', on: false })
          }}
        >
          <ThumbFace len={len} k={kTh} />
        </div>
      )}
    </div>
  )
}

// wheel delta (page px) -> stage px
export const wheelPx = (e) => (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) / stageScale()

export function ScrollView({ id, x, y, w, h, contentH, children, bar = true, style, innerStyle, t: tProp }) {
  const t0 = useTime()
  const t = tProp ?? t0
  const inner = useRef(null)
  const [measured, setMeasured] = useState(0)
  useLayoutEffect(() => {
    if (contentH != null || !inner.current) return
    const el = inner.current
    const m = () => setMeasured(el.offsetHeight)
    m()
    const ro = new ResizeObserver(m)
    ro.observe(el)
    return () => ro.disconnect()
  }, [contentH])
  const ch = contentH ?? measured
  const max = Math.max(0, ch - h)
  const showBar = bar === 'always' || (bar && max > 0)
  const pos = clamp(scrollOf(t, id), 0, max)
  const set = (v) => {
    const nv = clamp(Math.round(v), 0, max)
    if (nv !== clamp(scrollOf(now(), id), 0, max)) scrollTo(id, nv)
  }
  return (
    <div
      style={{ position: x == null ? 'relative' : 'absolute', left: x, top: y, width: w, height: h, ...style }}
      onWheel={(e) => {
        if (max > 0) set(pos + wheelPx(e))
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, width: showBar ? w - BAR_W - 1 : w, height: h, overflow: 'hidden' }}>
        <div ref={inner} style={{ position: 'absolute', left: 0, top: 0, width: '100%', transform: pos ? `translateY(${-pos}px)` : undefined, ...innerStyle }}>
          {children}
        </div>
      </div>
      {showBar && <Scrollbar id={id + ':bar'} x={w - BAR_W} y={0} h={h} viewH={h} contentH={ch} pos={pos} onScroll={set} t={t} />}
    </div>
  )
}
