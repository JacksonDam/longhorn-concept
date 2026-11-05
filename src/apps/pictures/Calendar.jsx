// "Refine By Date": a mini calendar that zooms out from days to months to years. Days, months
// and years with pictures are highlighted; clicking one filters to it (again: clears).
// value { level: 'days' | 'months' | 'years', y, m, sel: null | { y, m?, d? } } under `id`.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { useUITime, valueOf, hoverKeys, pt, C, FONT, HEAVY } from '../../ui/index.js'
import { CAL0, DAYS_WITH, MONTHS_WITH, YEARS_WITH } from './state.js'

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const YEARS = [2000, 2001, 2002, 2003]

const same = (a, b) => !!a && !!b && a.y === b.y && a.m === b.m && a.d === b.d

const Cell = memo(function Cell({ label, has, sel, lit, w, h, dim }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        lineHeight: `${h}px`,
        textAlign: 'center',
        borderRadius: 2,
        fontFamily: has ? HEAVY : FONT,
        fontSize: 10,
        color: dim ? '#c3c9d6' : sel ? '#fff' : has ? '#8a5200' : '#8b91a6',
        background: sel ? '#3d7bd9' : has ? (lit > 0.5 ? '#ffd89a' : '#fbe2b4') : lit > 0.5 ? '#dcebfd' : 'transparent',
        boxShadow: sel ? 'inset 0 0 0 1px #2a5fb0' : has ? 'inset 0 0 0 1px rgba(214,150,60,0.55)' : 'none',
      }}
    >
      {label}
    </div>
  )
})

export function Calendar({ id, x, y, w = 132 }) {
  const t = useUITime()
  const cal = valueOf(t, id, CAL0)
  const lit = hoverKeys(t, id + ':cells')
  const set = (v) => emit('ui.value', { id, value: { ...cal, ...v } })
  const hov = (key) => ({
    onPointerEnter: (e) => emit('hover', { id: id + ':cells', key, on: true, ...pt(e) }),
    onPointerLeave: () => emit('hover', { id: id + ':cells', key, on: false }),
  })
  const arrow = (d, onClick) => (
    <span
      onPointerDown={(e) => {
        if (e.button === 0) onClick()
      }}
      style={{ display: 'inline-block', width: 10, textAlign: 'center', color: '#d0442c', cursor: 'default' }}
    >
      {d < 0 ? '◂' : '▸'}
    </span>
  )
  let head
  let grid
  if (cal.level === 'days') {
    head = (
      <>
        {arrow(-1, () => set({ y: cal.y - 1 }))}
        <span onPointerDown={() => set({ level: 'years' })} style={{ fontFamily: HEAVY, color: '#2c6cc4' }}>
          {cal.y}
        </span>
        {arrow(1, () => set({ y: cal.y + 1 }))}
        <span style={{ marginLeft: 6 }} />
        {arrow(-1, () => set(cal.m === 1 ? { m: 12, y: cal.y - 1 } : { m: cal.m - 1 }))}
        <span onPointerDown={() => set({ level: 'months' })} style={{ color: '#2c6cc4' }}>
          {MONTH[cal.m - 1]}
        </span>
        {arrow(1, () => set(cal.m === 12 ? { m: 1, y: cal.y + 1 } : { m: cal.m + 1 }))}
      </>
    )
    const first = new Date(Date.UTC(cal.y, cal.m - 1, 1)).getUTCDay()
    const n = new Date(Date.UTC(cal.y, cal.m, 0)).getUTCDate()
    const cw = (w - 4) / 7
    grid = (
      <>
        <div style={{ display: 'flex' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} style={{ width: cw, textAlign: 'center', fontFamily: HEAVY, fontSize: 9.5, color: '#5b7299' }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 1 }}>
          {Array.from({ length: 42 }, (_, i) => {
            const d = i - first + 1
            if (d < 1 || d > n) return <div key={i} style={{ width: cw, height: 14 }} />
            const k = `${cal.y}-${cal.m}-${d}`
            const has = DAYS_WITH.has(k)
            const me = { y: cal.y, m: cal.m, d }
            return (
              <div key={i} {...hov(k)} onPointerDown={(e) => e.button === 0 && set({ sel: same(cal.sel, me) ? null : me })}>
                <Cell label={d} has={has} sel={same(cal.sel, me)} lit={lit.get(k) || 0} w={cw} h={14} />
              </div>
            )
          })}
        </div>
      </>
    )
  } else if (cal.level === 'months') {
    head = (
      <>
        {arrow(-1, () => set({ y: cal.y - 1 }))}
        <span onPointerDown={() => set({ level: 'years' })} style={{ fontFamily: HEAVY, color: '#2c6cc4' }}>
          {cal.y}
        </span>
        {arrow(1, () => set({ y: cal.y + 1 }))}
      </>
    )
    const cw = (w - 4) / 4
    grid = (
      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 4, rowGap: 4 }}>
        {MON.map((mn, i) => {
          const k = `${cal.y}-${i + 1}`
          const me = { y: cal.y, m: i + 1 }
          return (
            <div
              key={i}
              {...hov(k)}
              onPointerDown={(e) => e.button === 0 && set(MONTHS_WITH.has(k) ? { sel: same(cal.sel, me) ? null : me } : { level: 'days', m: i + 1 })}
              onDoubleClick={() => set({ level: 'days', m: i + 1 })}
            >
              <Cell label={mn} has={MONTHS_WITH.has(k)} sel={same(cal.sel, me)} lit={lit.get(k) || 0} w={cw} h={22} />
            </div>
          )
        })}
      </div>
    )
  } else {
    head = <span style={{ fontFamily: HEAVY, color: '#2c6cc4' }}>2000 - 2003</span>
    const cw = (w - 4) / 2
    grid = (
      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 8, rowGap: 6 }}>
        {YEARS.map((yy) => {
          const me = { y: yy }
          return (
            <div key={yy} {...hov('y' + yy)} onPointerDown={(e) => e.button === 0 && set(YEARS_WITH.has(yy) ? { sel: same(cal.sel, me) ? null : me, y: yy } : { y: yy, level: 'months' })} onDoubleClick={() => set({ y: yy, level: 'months' })}>
              <Cell label={yy} has={YEARS_WITH.has(yy)} sel={same(cal.sel, me)} lit={lit.get('y' + yy) || 0} w={cw} h={30} />
            </div>
          )
        })}
      </div>
    )
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        padding: '3px 2px 4px',
        borderRadius: 4,
        background: 'linear-gradient(180deg, #ffffff, #eef4fc)',
        boxShadow: `inset 0 0 0 1px ${C.borderLight}`,
      }}
    >
      <div style={{ height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, fontFamily: FONT, fontSize: 10.5, color: C.text, whiteSpace: 'nowrap' }}>{head}</div>
      {grid}
      {cal.level !== 'years' && (
        <div
          onPointerDown={(e) => e.button === 0 && set({ level: cal.level === 'days' ? 'months' : 'years' })}
          style={{ textAlign: 'right', fontFamily: FONT, fontSize: 9.5, color: '#6d8db8', marginTop: 2, paddingRight: 3 }}
        >
          zoom out {'▴'}
        </div>
      )}
    </div>
  )
}
