// Building blocks for app.Proxy: what a window's motion-blur copies draw instead of the full
// client area. A proxy must look the same at a glance (same backgrounds, big shapes, images) with a
// handful of DOM nodes: text runs become striped bars, a thumbnail grid one element with many
// background images.
import { memo } from 'react'
import { C, FONT, HEAVY } from '../../ui/index.js'
import { GlassRow, Band, TOOL_H, MENU_H } from './chrome.jsx'

export const box = (x, y, w, h, extra) => <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, ...extra }} />

// n lines of text as one element: bars `bar` px tall every `gap` px (widths vary by a mask)
export function Lines({ x, y, w, n, gap = 15, bar = 6, color = 'rgba(90,100,130,0.2)', ragged = false }) {
  if (n <= 0) return null
  const stripes = `repeating-linear-gradient(180deg, ${color} 0, ${color} ${bar}px, transparent ${bar}px, transparent ${gap}px)`
  const mask = ragged ? 'linear-gradient(90deg, #000 0, #000 70%, rgba(0,0,0,0.55) 100%)' : undefined
  return <div style={{ position: 'absolute', left: x, top: y + (gap - bar) / 2, width: w, height: n * gap - (gap - bar), background: stripes, WebkitMaskImage: mask, maskImage: mask }} />
}

// a line of real text (one node) for headings that should read the same in the blur
export const Text = ({ x, y, size = 11, color = C.text, heavy, children, light }) => (
  <div style={{ position: 'absolute', left: x, top: y, fontFamily: heavy ? HEAVY : FONT, fontWeight: light ? 300 : 400, fontSize: size, color, whiteSpace: 'nowrap', lineHeight: 1 }}>{children}</div>
)

// the plain apps' top block (glass toolbar row + band), without controls
export const TopProxy = memo(function TopProxy({ w, toolbar = true, row2 = 0, labels }) {
  const ty = toolbar ? TOOL_H : 4
  return (
    <>
      <GlassRow y={0} w={w} h={ty} />
      {toolbar && <Lines x={10} y={10} w={Math.min(w - 60, 420)} n={1} gap={14} bar={12} color="rgba(225,240,255,0.35)" ragged={false} />}
      <Band y={ty} w={w} h={MENU_H + row2 + 5} />
      {labels && <div style={{ position: 'absolute', left: 15, top: ty + 6, fontFamily: HEAVY, fontSize: 10.5, color: C.menuText, whiteSpace: 'pre', wordSpacing: 10 }}>{labels}</div>}
      {row2 > 0 && box(62, ty + MENU_H + 1, w - 160, 18, { borderRadius: 9, background: 'linear-gradient(90deg, #d9ecfb 0, #e5effa 60%, #dce8f6 100%)' })}
    </>
  )
})

// a grid of images as one element (background layers)
export function ImageGrid({ x, y, w, h, urls, tw, th, gap, cols }) {
  const n = urls.length
  if (!n) return null
  const pos = urls.map((_, i) => `${(i % cols) * (tw + gap)}px ${Math.floor(i / cols) * (th + gap)}px`)
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        backgroundImage: urls.map((u) => `url("${u}")`).join(','),
        backgroundPosition: pos.join(','),
        backgroundSize: urls.map(() => `${tw}px ${th}px`).join(','),
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
