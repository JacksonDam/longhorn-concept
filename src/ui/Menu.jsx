// Plex menus: the drop-down list (styled after the sidebar's my Music flyout), a menu bar and a
// context menu. Open state is logged ('ui.menu' { id, open, x, y, rects }), hover per opening
// ('hover' { id: `${id}#${openT}`, key }), and popups are drawn in the overlay layer.
//
// items: [{ label, onClick, shortcut, disabled, checked, radio, items: [...submenu], bold }, '-', ...]
//
//   <MenuBar id menus={[{ key, label, items }]} x y variant="band" | "light" />
//   <ContextMenu id items />  + onContextMenu={contextHandler(id)} on the target element
//   <MenuPopup id items x y openT onClose />  a bare popup (drop-down buttons build on it)
import { memo, useEffect, useRef } from 'react'
import { emit } from '../core/events.js'
import { FPS } from '../core/clock.js'
import { useUITime as useTime, useLive } from './scope.jsx'
import { clamp, ease } from '../core/anim.js'
import { lastOf, hoverKeys, menuState, openMenu, stageRect, pt } from './state.js'
import { Overlay, Catcher } from './Overlay.jsx'
import { C, FONT, HEAVY } from './theme.js'

export const ITEM_H = 20
export const SEP_H = 7
const PAD = 3
const REVEAL = 3 // frames

export const menuHeight = (items) => PAD * 2 + 4 + items.reduce((h, it) => h + (it === '-' ? SEP_H : ITEM_H), 0)
// a width estimate for placing popups near the stage edges (the popup itself sizes to content)
export const menuWidth = (items) =>
  Math.max(
    150,
    ...items.map((it) => (it === '-' ? 0 : 52 + String(it.label).length * 6.1 + (it.shortcut ? 22 + it.shortcut.length * 5.5 : 0))),
  )

function closeAll(id) {
  emit('ui.menu', { id, open: null })
}

const Check = ({ radio }) =>
  radio ? (
    <svg width="8" height="8" style={{ position: 'absolute', left: 8, top: 6 }}>
      <circle cx="4" cy="4" r="3" fill="#2c6cc4" />
    </svg>
  ) : (
    <svg width="10" height="9" style={{ position: 'absolute', left: 7, top: 5.5 }}>
      <path d="M1 4.5 L4 7.5 L9 1" fill="none" stroke="#2c6cc4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

const Row = memo(function Row({ item, lit, sub }) {
  const dis = item.disabled
  return (
    <div style={{ position: 'relative', height: ITEM_H, display: 'flex', alignItems: 'center', padding: '0 14px 0 24px', gap: 18 }}>
      {lit > 0 && !dis && (
        <div
          style={{
            position: 'absolute',
            inset: '0 2px',
            borderRadius: 3,
            opacity: lit,
            background: C.rowSel,
            boxShadow: `inset 0 0 0 1px ${C.rowSelEdge}`,
          }}
        />
      )}
      {(item.checked || item.radio) && <Check radio={item.radio} />}
      {item.icon && <div style={{ position: 'absolute', left: 4, top: 2, width: 16, height: 16 }}>{item.icon}</div>}
      <span
        style={{
          position: 'relative',
          flex: 1,
          fontFamily: item.bold ? HEAVY : FONT,
          fontWeight: item.bold ? 400 : 600,
          fontSize: 10.5,
          color: dis ? 'rgba(150,156,178,0.7)' : lit > 0.5 ? '#24477f' : C.rowText,
          whiteSpace: 'nowrap',
        }}
      >
        {item.label}
      </span>
      {item.shortcut && (
        <span style={{ position: 'relative', fontFamily: FONT, fontWeight: 500, fontSize: 10, color: dis ? 'rgba(150,156,178,0.6)' : 'rgba(110,120,150,0.85)', whiteSpace: 'nowrap' }}>
          {item.shortcut}
        </span>
      )}
      {sub && (
        <svg width="5" height="8" style={{ position: 'absolute', right: 7, top: 6 }}>
          <path d="M0 0 L5 4 L0 8 Z" fill={dis ? '#b6bccb' : '#5a7fbf'} />
        </svg>
      )}
    </div>
  )
})

const Sep = memo(function Sep() {
  return (
    <div style={{ height: SEP_H, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 6, right: 6, top: 3, height: 1, background: 'rgba(130,160,210,0.45)', boxShadow: '0 1px 0 rgba(255,255,255,0.8)' }} />
    </div>
  )
})

const frameStyle = {
  position: 'absolute',
  borderRadius: 5,
  padding: PAD,
  background: 'linear-gradient(180deg, rgb(118,162,232) 0, rgb(68,123,216) 4px, rgb(66,125,221) 100%)',
  boxShadow: '0 0 0 1px rgba(40,70,140,0.55), 3px 4px 9px rgba(10,30,80,0.38)',
  pointerEvents: 'auto',
}
const listStyle = {
  position: 'relative',
  borderRadius: 3,
  padding: '2px 0',
  background: C.list,
  boxShadow: 'inset 0 1px 0 rgb(201,230,255), inset 0 0 0 1px rgba(150,180,220,0.5)',
}

// The popup list. x, y: stage px of its top-left (or, nested, relative to the parent row).
export function MenuPopup({ id, items, x, y, openT, onClose, nested = false, minW = 0, catcher = true }) {
  const t = useTime()
  const hid = `${id}#${openT}`
  const lit = hoverKeys(t, hid)
  const he = lastOf(t, 'hover', hid)
  const hk = he && he.on ? he.key : undefined
  const k = ease.out(clamp(((t - openT) * FPS) / REVEAL))
  const body = (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        ...frameStyle,
        left: nested ? '100%' : x,
        top: nested ? -PAD - 2 : y,
        marginLeft: nested ? -3 : 0,
        minWidth: minW,
        opacity: k,
        transform: k < 1 ? `translateY(${(k - 1) * 4}px)` : undefined,
        clipPath: k < 1 ? `inset(0 0 ${(1 - k) * 60}% 0 round 5px)` : undefined,
        zIndex: nested ? 2 : undefined,
      }}
    >
      <div style={listStyle}>
        {items.map((it, i) =>
          it === '-' ? (
            <Sep key={i} />
          ) : (
            <div
              key={i}
              style={{ position: 'relative' }}
              onPointerEnter={(e) => emit('hover', { id: hid, key: i, on: true, ...pt(e) })}
              onPointerLeave={() => emit('hover', { id: hid, key: i, on: false })}
              onPointerUp={(e) => {
                if (e.button > 2 || it.disabled || it.items) return
                e.stopPropagation()
                onClose()
                it.onClick?.()
              }}
            >
              <Row item={it} lit={lit.get(i) || 0} sub={!!it.items} />
              {it.items && hk === i && !it.disabled && <MenuPopup id={`${id}/${i}`} items={it.items} openT={he.t} onClose={onClose} nested catcher={false} />}
            </div>
          ),
        )}
      </div>
    </div>
  )
  if (nested) return body
  return (
    <>
      {catcher && <Catcher onDismiss={onClose} />}
      {body}
      <EscCloses onClose={onClose} />
    </>
  )
}

function EscCloses({ onClose }) {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => {
    const on = (e) => {
      if (e.key === 'Escape') ref.current()
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [])
  return null
}

// place a popup of `items` at (x, y) inside the stage (flip up / left near the edges)
export function placePopup(items, x, y, { above = 0, bottom = 698 } = {}) {
  const w = menuWidth(items)
  const h = menuHeight(items)
  let px = x
  let py = y
  if (px + w > 958) px = Math.max(2, 958 - w)
  if (py + h > bottom) py = above ? above - h : Math.max(2, bottom - h)
  return { x: Math.round(px), y: Math.round(py) }
}

// ---- menu bar -----------------------------------------------------------------------------------
const BAR = {
  band: { size: 10.5, font: HEAVY, w: 400, c: C.menuText, hot: '#d8ecff', open: '#ffffff' },
  light: { size: 11, font: FONT, w: 500, c: '#4f5a78', hot: '#24477f', open: '#24477f' },
  chrome: { size: 11, font: HEAVY, w: 400, c: C.chromeText, hot: '#ffffff', open: '#ffffff' },
}

const Title = memo(function Title({ label, look, lit, open, variant }) {
  return (
    <>
      {(lit > 0 || open) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 3,
            opacity: open ? 1 : lit,
            background:
              variant === 'light'
                ? open
                  ? C.rowSel
                  : C.rowHover
                : open
                  ? 'linear-gradient(180deg, rgba(30,75,160,0.55), rgba(45,100,185,0.4))'
                  : 'linear-gradient(180deg, rgba(160,210,255,0.4), rgba(110,170,240,0.3))',
            boxShadow: variant === 'light' ? `inset 0 0 0 1px ${C.rowSelEdge}` : 'inset 0 0 0 1px rgba(170,215,255,0.45)',
          }}
        />
      )}
      <span
        style={{
          position: 'relative',
          fontFamily: look.font,
          fontWeight: look.w,
          fontSize: look.size,
          color: open ? look.open : lit > 0.5 ? look.hot : look.c,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </>
  )
})

export function MenuBar({ id, menus, x, y, h = 17, variant = 'band', pad = 7, gap = 2, style }) {
  const t = useTime()
  const st = menuState(t, id)
  const open = st && st.open != null ? st.open : null
  const look = BAR[variant]
  const ref = useRef(null)
  const lit = hoverKeys(t, id + '.title')
  const rectsOf = () => [...ref.current.children].map((el) => stageRect(el))
  const openAt = (key) => {
    const rects = rectsOf()
    const i = menus.findIndex((m) => m.key === key)
    const r = rects[i]
    const p = placePopup(menus[i].items, r.x - 2, r.y + r.h + 1)
    openMenu(id, key, { x: p.x, y: p.y, rects })
  }
  const close = () => closeAll(id)
  const live = useLive()
  const cur = open != null && live ? menus.find((m) => m.key === open) : null
  return (
    <>
      <div
        ref={ref}
        style={{
          position: x == null ? 'relative' : 'absolute',
          left: x,
          top: y,
          height: h,
          display: 'flex',
          gap,
          ...style,
        }}
      >
        {menus.map((m) => (
          <div
            key={m.key}
            style={{ position: 'relative', height: h, padding: `0 ${pad}px`, display: 'flex', alignItems: 'center' }}
            onPointerEnter={(e) => emit('hover', { id: id + '.title', key: m.key, on: true, ...pt(e) })}
            onPointerLeave={() => emit('hover', { id: id + '.title', key: m.key, on: false })}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              openAt(m.key)
            }}
          >
            <Title label={m.label} look={look} lit={lit.get(m.key) || 0} open={open === m.key} variant={variant} />
          </div>
        ))}
      </div>
      {cur && (
        <Overlay>
          <MenuPopup id={id + '.' + cur.key} items={cur.items} x={st.x} y={st.y} openT={st.t} onClose={close} />
          {/* the titles stay live above the catcher: sliding to another title switches menus */}
          {(st.rects || []).map((r, i) => (
            <div
              key={i}
              style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, pointerEvents: 'auto' }}
              onPointerEnter={() => {
                if (menus[i] && menus[i].key !== open) {
                  const p = placePopup(menus[i].items, r.x - 2, r.y + r.h + 1)
                  openMenu(id, menus[i].key, { x: p.x, y: p.y, rects: st.rects })
                }
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
                if (menus[i]?.key === open) close()
              }}
            />
          ))}
        </Overlay>
      )}
    </>
  )
}

// ---- context menu ------------------------------------------------------------------------------
// handler for onContextMenu: opens menu `id` at the pointer
export function contextHandler(id, items, before) {
  return (e) => {
    e.preventDefault()
    e.stopPropagation()
    before?.(e)
    const p = pt(e)
    const q = items ? placePopup(typeof items === 'function' ? items() : items, p.x + 1, p.y + 1) : { x: p.x + 1, y: p.y + 1 }
    openMenu(id, true, q)
  }
}

export function ContextMenu({ id, items }) {
  const t = useTime()
  const live = useLive()
  const st = menuState(t, id)
  if (!live || !st || st.open == null) return null
  const list = typeof items === 'function' ? items() : items
  return (
    <Overlay>
      <MenuPopup id={id} items={list} x={st.x} y={st.y} openT={st.t} onClose={() => closeAll(id)} />
    </Overlay>
  )
}

// A drop-down button's menu (e.g. "Group by date ▾"): open state under `id`.
export function DropMenu({ id, items, minW }) {
  const t = useTime()
  const live = useLive()
  const st = menuState(t, id)
  if (!live || !st || st.open == null) return null
  return (
    <Overlay>
      <MenuPopup id={id} items={typeof items === 'function' ? items() : items} x={st.x} y={st.y} openT={st.t} minW={minW} onClose={() => closeAll(id)} />
    </Overlay>
  )
}
// open a DropMenu below element `el`
export function dropBelow(id, el, items) {
  const r = stageRect(el)
  const p = placePopup(typeof items === 'function' ? items() : items, r.x, r.y + r.h + 1, { above: r.y })
  openMenu(id, true, p)
}
export const isMenuOpen = (t, id) => {
  const s = menuState(t, id)
  return !!(s && s.open != null)
}
