// Shared window furniture for the plain (non-explorer) apps, extrapolated from the my Music
// window: the glass toolbar continues the title bar, the darker band below it holds the menu bar
// (and an address / tool row), then the pale body; a soft status bar at the bottom.
// Client-area px (the PlexWindow title bar is above y 0). Only the window's outline is rounded
// (PlexWindow): every bar here runs square and flush to the window's edges.
import { memo } from 'react'
import { MenuBar, ToolButton, Tooltip, C, FONT, HEAVY } from '../../ui/index.js'
import { ChromeWash } from '../../os/look.jsx'
import { Ico } from './icons.jsx'

export const TOOL_H = 34 // glass toolbar row
export const MENU_H = 22 // band menu row

const titleGrad =
  'linear-gradient(90deg, #4985d7 0%, #4f8bdd 5%, #5793e2 15%, #5fa1ed 26%, #6eb0fa 37%, #6ab0f8 42%, #68aaf8 46%, #66a8f4 57%, #5fa2ee 64%, #5a9ce9 72%, #558fe2 82%, #4e84d7 90%, #4a86d8 100%)'
const bandGrad =
  'linear-gradient(90deg, #326ab4 0%, #356eba 11%, #3b73bd 16%, #427dc4 21%, #508bd2 32%, #5994d4 37%, #5a9ade 42%, #5c9ce0 47%, #5c9ad9 52%, #5a9ad8 57%, #5190d6 62%, #518cd1 68%, #4984cb 73%, #437ec3 78%, #3974bd 83%, #386ebb 88%, #326ab6 93%, #336bb5 100%)'

// glass block under the title bar (toolbar row): same gradient as the title, so they read as one
export const GlassRow = memo(function GlassRow({ y = 0, w, h = TOOL_H }) {
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: y - 1, width: w, height: h + 1, background: titleGrad }} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: y - 1,
          width: w,
          height: h + 1,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0) 6px, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)',
        }}
      />
    </>
  )
})

// the darker band (menu row + optional second row) and its edge strip
export const Band = memo(function Band({ y, w, h }) {
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: y - 6, width: w, height: 6, background: titleGrad }} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: y - 2,
          width: w,
          height: h + 2,
          background: bandGrad,
          boxShadow: 'inset 0 1px 0 rgba(20,60,130,0.6), inset 0 2px 0 rgba(140,190,255,0.12)',
        }}
      />
      <div style={{ position: 'absolute', left: 0, top: y + h - 4, width: w, height: 4, background: 'linear-gradient(180deg, #3f7ac3, #5a96e0 50%, #3c76b7)' }} />
      <div style={{ position: 'absolute', left: 0, top: y + h, width: w, height: 1, background: '#9cd8ff' }} />
    </>
  )
})

// toolbar items: [{ id, icon, label, onClick, disabled, active, tip, dropdown, w }] or '|' separators
export function Toolbar({ x = 6, y = 4, items, h = 26, gap = 2 }) {
  let cx = x
  const out = []
  items.forEach((it, i) => {
    if (it === '|') {
      out.push(<div key={i} style={{ position: 'absolute', left: cx + 3, top: y + 4, width: 1, height: h - 8, background: 'rgba(190,225,255,0.5)', boxShadow: '1px 0 0 rgba(20,60,130,0.35)' }} />)
      cx += 8
      return
    }
    const w = it.w ?? (it.label ? 32 + it.label.length * 6.2 + (it.dropdown ? 10 : 0) : 30)
    out.push(
      <ToolButton
        key={it.id}
        id={it.id}
        x={Math.round(cx)}
        y={y}
        w={Math.round(w)}
        h={h}
        icon={typeof it.icon === 'string' ? <Ico kind={it.icon} size={it.iconSize ?? 20} /> : it.icon}
        iconSize={it.iconSize ?? 20}
        label={it.label}
        onClick={it.onClick}
        disabled={it.disabled}
        active={it.active}
        dropdown={it.dropdown}
      />,
    )
    if (it.tip) out.push(<Tooltip key={i + 't'} forId={it.id} text={it.tip} />)
    cx += w + gap
  })
  return out
}

// The standard top of a plain app: glass toolbar row + band with the menu bar (+ a second row
// rendered by the caller inside the band at y = TOOL_H + MENU_H). Returns the body's top y.
export function appTopHeight({ toolbar = true, row2 = 0 } = {}) {
  return (toolbar ? TOOL_H : 4) + MENU_H + row2 + 5
}
export function AppTop({ id, w, menus, toolbar, row2 = 0, children }) {
  const ty = toolbar ? TOOL_H : 4
  const bandH = MENU_H + row2 + 5
  return (
    <>
      <GlassRow y={0} w={w} h={ty} />
      {toolbar && <Toolbar items={toolbar} y={4} />}
      <Band y={ty} w={w} h={bandH} />
      {menus && <MenuBar id={id + '.menubar'} menus={menus} x={8} y={ty + 2} h={18} />}
      {children}
      <ChromeWash y={-1} w={w} h={ty + bandH + 2} />
    </>
  )
}

// a status bar along the bottom of the body
export const StatusBar = memo(function StatusBar({ y, w, h = 20, left, right }) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: y,
          width: w,
          height: h,
          background: 'linear-gradient(180deg, #e3eaf6 0, #d3dfef 100%)',
          boxShadow: 'inset 0 1px 0 #b9c9e0, inset 0 2px 0 rgba(255,255,255,0.7)',
        }}
      />
      <div style={{ position: 'absolute', left: 8, top: y, height: h, lineHeight: `${h}px`, fontFamily: FONT, fontSize: 10.5, color: '#5b6886', whiteSpace: 'nowrap', display: 'flex', gap: 6, alignItems: 'center' }}>{left}</div>
      {right && (
        <div style={{ position: 'absolute', right: 20, top: y, height: h, lineHeight: `${h}px`, fontFamily: FONT, fontSize: 10.5, color: '#5b6886', whiteSpace: 'nowrap', display: 'flex', gap: 6, alignItems: 'center' }}>
          {right}
        </div>
      )}
    </>
  )
})

// "enjoy music"-style heading: a light word and a bold word
export function Heading({ a, b, x, y, size = 17.5 }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, fontFamily: FONT, fontSize: size, fontWeight: 300, color: C.headingLight, whiteSpace: 'nowrap', lineHeight: 1 }}>
      {a} <span style={{ fontWeight: 500, color: C.heading }}>{b}</span>
    </div>
  )
}

// the body background of the my Music window (white fading to pale blue at the bottom)
export const BodyBg = memo(function BodyBg({ y = 0, w, h }) {
  return <div style={{ position: 'absolute', left: 0, top: y, width: w, height: h, background: C.body }} />
})

// text helpers
export const label = (size = 11, color = C.text, weight = 400) => ({ fontFamily: weight >= 600 ? HEAVY : FONT, fontWeight: weight >= 600 ? 400 : weight, fontSize: size, color, whiteSpace: 'nowrap' })
