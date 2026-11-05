// List / details view: rows with hover and selection (flyout-style highlights), optional column
// headers that sort, its own scrolling, double-click to open and right-click for a context menu.
//
//   <ListView id x y w h items={[{ key, cells: [...], icon, sort: [...] }]} columns={[{ label, w, align }]}
//             rowH multi onOpen(item) onSelect(keys) onContext(e, item) active />
//   selectionOf(t, id) -> [keys], select(id, keys)
// Logged: 'ui.value' `${id}:sel` { keys, anchor }, `${id}:sort` { col, dir }, `${id}:scroll`;
// hover rows: 'hover' { id: `${id}:rows`, key }.
import { memo } from 'react'
import { emit } from '../core/events.js'
import { now } from '../core/clock.js'
import { useTime } from '../core/time.jsx'
import { clamp } from '../core/anim.js'
import { valueOf, hoverKeys, pt } from './state.js'
import { Scrollbar, BAR_W, scrollOf, scrollTo, wheelPx } from './ScrollView.jsx'
import { C, FONT, HEAVY } from './theme.js'

const NO_SEL = { keys: [], anchor: null }
export const selectionOf = (t, id) => valueOf(t, id + ':sel', NO_SEL).keys
export const select = (id, keys, anchor = keys[keys.length - 1] ?? null) => emit('ui.value', { id: id + ':sel', value: { keys, anchor } })
export const sortOf = (t, id, def = null) => valueOf(t, id + ':sort', def)

const HEAD_H = 19

const Header = memo(function Header({ id, columns, w, sort }) {
  let x = 0
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: HEAD_H, background: 'linear-gradient(180deg, #fbfdff 0, #edf3fb 55%, #dfe8f5 100%)', boxShadow: 'inset 0 -1px 0 #c3d2e8' }}>
      {columns.map((c, i) => {
        const left = x
        x += c.w
        const on = sort && sort.col === i
        return (
          <div
            key={i}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              emit('ui.value', { id: id + ':sort', value: { col: i, dir: on && sort.dir === 1 ? -1 : 1 } })
            }}
            style={{
              position: 'absolute',
              left,
              top: 0,
              width: c.w,
              height: HEAD_H,
              boxSizing: 'border-box',
              padding: '0 6px',
              borderRight: '1px solid #d0dbeb',
              fontFamily: HEAVY,
              fontSize: 10.5,
              lineHeight: `${HEAD_H}px`,
              color: on ? '#2c5da6' : '#5b7299',
              textAlign: c.align || 'left',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            {c.label}
            {on && (
              <svg width="7" height="4" style={{ marginLeft: 5, verticalAlign: 'middle' }}>
                <path d={sort.dir === 1 ? 'M0 4 L7 4 L3.5 0 Z' : 'M0 0 L7 0 L3.5 4 Z'} fill="#7d9fd3" />
              </svg>
            )}
          </div>
        )
      })}
    </div>
  )
})

const cellText = {
  position: 'absolute',
  top: 0,
  boxSizing: 'border-box',
  padding: '0 6px',
  fontFamily: FONT,
  fontSize: 11,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const Row = memo(function Row({ item, columns, w, rowH, sel, focus, lit, bold }) {
  let x = 0
  const cells = item.cells || [item.label]
  return (
    <div style={{ position: 'relative', height: rowH, width: w }}>
      {lit > 0 && !sel && <div style={{ position: 'absolute', inset: '0 1px', borderRadius: 3, opacity: lit, background: C.rowHover }} />}
      {sel && (
        <div
          style={{
            position: 'absolute',
            inset: '0 1px',
            borderRadius: 3,
            background: focus ? C.rowSel : C.rowSelDim,
            boxShadow: focus ? `inset 0 0 0 1px ${C.rowSelEdge}` : 'inset 0 0 0 1px rgba(170,190,220,0.8)',
          }}
        />
      )}
      {cells.map((c, i) => {
        const cw = columns ? columns[i].w : w
        const left = x
        x += cw
        const first = i === 0
        return (
          <div
            key={i}
            style={{
              ...cellText,
              left,
              width: cw,
              lineHeight: `${rowH}px`,
              paddingLeft: first && item.icon ? 26 : 6,
              textAlign: columns?.[i]?.align || 'left',
              color: first ? (sel && focus ? '#1d3f78' : bold || item.bold ? '#2d3550' : C.text) : sel && focus ? '#3c5a8c' : C.textDim,
              fontFamily: (bold || item.bold) && first ? HEAVY : FONT,
            }}
          >
            {c}
          </div>
        )
      })}
      {item.icon && <div style={{ position: 'absolute', left: 6, top: (rowH - 16) / 2, width: 16, height: 16 }}>{item.icon}</div>}
    </div>
  )
})

function sortItems(items, sort) {
  if (!sort) return items
  const { col, dir } = sort
  const key = (it) => {
    const v = it.sort?.[col] ?? it.cells?.[col] ?? it.label
    return typeof v === 'number' ? v : String(v ?? '').toLowerCase()
  }
  return [...items].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    return (ka < kb ? -1 : ka > kb ? 1 : 0) * dir
  })
}

export function ListView({ id, x, y, w, h, items, columns, rowH = 19, multi = true, onOpen, onSelect, onContext, active = true, header = true, emptyText, defSort = null, t: tProp }) {
  const t0 = useTime()
  const t = tProp ?? t0
  const sel = valueOf(t, id + ':sel', NO_SEL)
  const sort = valueOf(t, id + ':sort', defSort)
  const list = sortItems(items, sort)
  const showHead = !!columns && header
  const top = showHead ? HEAD_H : 0
  const viewH = h - top
  const contentH = list.length * rowH
  const max = Math.max(0, contentH - viewH)
  const pos = clamp(scrollOf(t, id), 0, max)
  const lit = hoverKeys(t, id + ':rows')
  const bar = max > 0
  const rowW = bar ? w - BAR_W - 1 : w
  const selSet = new Set(sel.keys)
  const setScroll = (v) => {
    const nv = clamp(Math.round(v), 0, max)
    if (nv !== clamp(scrollOf(now(), id), 0, max)) scrollTo(id, nv)
  }
  const choose = (e, item) => {
    const cur = valueOf(now(), id + ':sel', NO_SEL)
    let keys
    let anchor = item.key
    if (multi && (e.ctrlKey || e.metaKey)) {
      keys = cur.keys.includes(item.key) ? cur.keys.filter((k) => k !== item.key) : [...cur.keys, item.key]
    } else if (multi && e.shiftKey && cur.anchor != null) {
      const ks = list.map((it) => it.key)
      const a = ks.indexOf(cur.anchor)
      const b = ks.indexOf(item.key)
      keys = a < 0 ? [item.key] : ks.slice(Math.min(a, b), Math.max(a, b) + 1)
      anchor = cur.anchor
    } else {
      if (cur.keys.length === 1 && cur.keys[0] === item.key) return
      keys = [item.key]
    }
    emit('ui.value', { id: id + ':sel', value: { keys, anchor } })
    onSelect?.(keys)
  }
  // only the rows in view are mounted
  const first = Math.max(0, Math.floor(pos / rowH) - 1)
  const last = Math.min(list.length, Math.ceil((pos + viewH) / rowH) + 1)
  const rows = []
  for (let i = first; i < last; i++) {
    const it = list[i]
    rows.push(
      <div
        key={it.key}
        style={{ position: 'absolute', left: 0, top: i * rowH, width: rowW, height: rowH }}
        onPointerEnter={(e) => emit('hover', { id: id + ':rows', key: it.key, on: true, ...pt(e) })}
        onPointerLeave={() => emit('hover', { id: id + ':rows', key: it.key, on: false })}
        onPointerDown={(e) => {
          if (e.button === 0) choose(e, it)
          else if (e.button === 2 && !selSet.has(it.key)) choose({}, it)
        }}
        onDoubleClick={() => onOpen?.(it)}
        onContextMenu={(e) => {
          if (!onContext) return
          e.preventDefault()
          e.stopPropagation()
          onContext(e, it)
        }}
      >
        <Row item={it} columns={columns} w={rowW} rowH={rowH} sel={selSet.has(it.key)} focus={active} lit={lit.get(it.key) || 0} />
      </div>,
    )
  }
  return (
    <div
      style={{ position: x == null ? 'relative' : 'absolute', left: x, top: y, width: w, height: h }}
      onWheel={(e) => {
        if (max > 0) setScroll(pos + wheelPx(e))
      }}
      onPointerDown={(e) => {
        // a click on the empty area below the rows clears the selection
        if (e.target === e.currentTarget || e.target.dataset?.empty) {
          if (valueOf(now(), id + ':sel', NO_SEL).keys.length) {
            emit('ui.value', { id: id + ':sel', value: NO_SEL })
            onSelect?.([])
          }
        }
      }}
      onContextMenu={(e) => {
        if (!onContext) return
        e.preventDefault()
        e.stopPropagation()
        onContext(e, null)
      }}
    >
      {showHead && <Header id={id} columns={columns} w={rowW} sort={sort} />}
      <div data-empty="1" style={{ position: 'absolute', left: 0, top, width: rowW, height: viewH, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: rowW, height: contentH, transform: pos ? `translateY(${-pos}px)` : undefined }}>{rows}</div>
        {!list.length && emptyText && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 14, textAlign: 'center', fontFamily: FONT, fontSize: 11, color: C.textDim, pointerEvents: 'none' }}>{emptyText}</div>
        )}
      </div>
      {bar && <Scrollbar id={id + ':bar'} x={w - BAR_W} y={top} h={viewH} viewH={viewH} contentH={contentH} pos={pos} onScroll={setScroll} t={t} />}
    </div>
  )
}
