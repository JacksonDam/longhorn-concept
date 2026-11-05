// Plex-style popup menu (desktop context menu, sidebar header menus): a light glass panel
// with the flyout's colours, 16 px icons, hover bands, separators, checks / radio dots and
// one level of submenus. Used through <MenuPopup> (animated via Popup.jsx).
//
// items: [{ label, icon?: Component, onSelect?, submenu?: items, check?: (t) => bool,
//           radio?: (t) => bool, disabled?, sep? }]
// Hover: 'hover' { id: '<menu>.<i>' } and 'shell.sub' { menu, index } for submenus.
import { memo } from 'react'
import { emit, last } from '../../core/events.js'
import { Popup } from './Popup.jsx'
import { closePopups, hover } from './shellState.js'

export const ITEM_H = 21
const SEP_H = 7
const PAD = 3

export function menuHeight(items) {
  return PAD * 2 + items.reduce((s, it) => s + (it.sep ? SEP_H : ITEM_H), 0)
}
function rows(items) {
  let y = PAD
  return items.map((it) => {
    const r = { it, y }
    y += it.sep ? SEP_H : ITEM_H
    return r
  })
}

const panel = {
  position: 'absolute',
  boxSizing: 'border-box',
  border: '1px solid rgb(74,122,204)',
  borderRadius: 3,
  background: 'linear-gradient(to bottom, rgb(252,253,255), rgb(236,243,253) 60%, rgb(224,234,250))',
  boxShadow: '2px 3px 7px rgba(0,20,60,0.35)',
}
const label = {
  position: 'absolute',
  left: 28,
  fontFamily: "'Libre Franklin', Tahoma, sans-serif",
  fontWeight: 600,
  fontSize: 9.6,
  lineHeight: ITEM_H + 'px',
  whiteSpace: 'nowrap',
  color: 'rgb(58,68,100)',
}

// the static panel (memoised: drawn once per blur copy)
export const MenuPanel = memo(function MenuPanel({ items, x, y, w, t }) {
  return (
    <div style={{ ...panel, left: x, top: y, width: w, height: menuHeight(items) }}>
      {rows(items).map(({ it, y: ry }, i) =>
        it.sep ? (
          <div key={i} style={{ position: 'absolute', left: 6, right: 6, top: ry + 3, height: 1, background: 'rgba(110,145,205,0.45)' }} />
        ) : (
          <div key={i} style={{ position: 'absolute', left: 0, top: ry, width: w, height: ITEM_H }}>
            {it.icon && <it.icon x={6} y={2.5} />}
            <div style={{ ...label, color: it.disabled ? 'rgb(150,158,175)' : label.color }}>{it.label}</div>
            {it.submenu && (
              <svg width="6" height="8" viewBox="0 0 6 8" style={{ position: 'absolute', right: 8, top: 6.5 }}>
                <path d="M1 0.5 L5 4 L1 7.5 Z" fill="rgb(70,90,140)" />
              </svg>
            )}
          </div>
        ),
      )}
      {t != null && <MenuChecks items={items} t={t} />}
    </div>
  )
})

function MenuChecks({ items, t }) {
  return rows(items).map(({ it, y }, i) => {
    if (it.check?.(t))
      return (
        <svg key={i} width="10" height="10" viewBox="0 0 10 10" style={{ position: 'absolute', left: 9, top: y + 5.5 }}>
          <path d="M1.5 5 L4 7.5 L8.5 2" fill="none" stroke="rgb(40,60,110)" strokeWidth="1.6" />
        </svg>
      )
    if (it.radio?.(t)) return <div key={i} style={{ position: 'absolute', left: 11, top: y + 8, width: 5, height: 5, borderRadius: '50%', background: 'rgb(40,60,110)' }} />
    return null
  })
}

// per-frame layer: hover bands and the open submenu
function MenuLive({ t, menuId, items, x, y, w }) {
  const sub = last(t, (e) => e.type === 'shell.sub' && e.menu === menuId)
  const out = []
  rows(items).forEach(({ it, y: ry }, i) => {
    if (it.sep || it.disabled) return
    const lv = Math.max(hover(t, `${menuId}.${i}`), sub?.index === i && it.submenu ? 1 : 0)
    if (lv > 0)
      out.push(
        <div
          key={'h' + i}
          style={{
            position: 'absolute',
            left: x + 2,
            top: y + ry,
            width: w - 4,
            height: ITEM_H,
            opacity: lv,
            borderRadius: 2,
            background: 'linear-gradient(to bottom, rgba(196,226,255,0.95), rgba(160,206,255,0.95))',
            boxShadow: 'inset 0 0 0 1px rgba(90,150,230,0.5)',
          }}
        />,
      )
  })
  // checks change with events, so they live here (copy 0)
  out.push(
    <div key="c" style={{ position: 'absolute', left: x, top: y }}>
      <MenuChecks items={items} t={t} />
    </div>,
  )
  rows(items).forEach(({ it, y: ry }, i) => {
    if (it.submenu && sub?.index === i) {
      const sx = x + w - 3
      const sy = y + ry - PAD
      out.push(
        <div key={'s' + i} style={{ position: 'absolute', left: 0, top: 0 }}>
          <MenuPanel items={it.submenu} x={sx} y={sy} w={it.subWidth || 150} />
          <MenuLive t={t} menuId={`${menuId}.${i}`} items={it.submenu} x={sx} y={sy} w={it.subWidth || 150} />
        </div>,
      )
    }
  })
  return out
}

function MenuHits({ t, menuId, items, x, y, w }) {
  const sub = last(t, (e) => e.type === 'shell.sub' && e.menu === menuId)
  return (
    <>
      {rows(items).map(({ it, y: ry }, i) =>
        it.sep ? null : (
          <div
            key={i}
            style={{ position: 'absolute', left: x, top: y + ry, width: w, height: ITEM_H, pointerEvents: 'auto' }}
            onPointerEnter={() => {
              emit('hover', { id: `${menuId}.${i}`, on: true })
              if (sub?.index !== (it.submenu ? i : -1)) emit('shell.sub', { menu: menuId, index: it.submenu ? i : -1 })
            }}
            onPointerLeave={() => emit('hover', { id: `${menuId}.${i}`, on: false })}
            onPointerDown={(e) => {
              e.stopPropagation()
              if (it.disabled || it.submenu) return
              closePopups()
              it.onSelect?.()
            }}
          />
        ),
      )}
      {rows(items).map(({ it, y: ry }, i) =>
        it.submenu && sub?.index === i ? (
          <MenuHits key={'s' + i} t={t} menuId={`${menuId}.${i}`} items={it.submenu} x={x + w - 3} y={y + ry - PAD} w={it.subWidth || 150} />
        ) : null,
      )}
    </>
  )
}

// a menu as an animated popup; `id` is the popup id, (x, y) its top-left
export function MenuPopup({ t, id, items, x, y, w = 170, kind = 'fade', origin }) {
  const h = menuHeight(items)
  return (
    <Popup
      t={t}
      id={id}
      kind={kind}
      n={6}
      origin={origin}
      box={{ left: x - 4, top: y - 4, width: w + 12, height: h + 12 }}
      live={<MenuLive t={t} menuId={id} items={items} x={x} y={y} w={w} />}
      hits={<MenuHits t={t} menuId={id} items={items} x={x} y={y} w={w} />}
    >
      <MenuPanel items={items} x={x} y={y} w={w} />
    </Popup>
  )
}
