// The inactive window look (os/focus.js decides which windows are active and cross-fades the
// level). A window that isn't active keeps its layout and content; its chrome (title bar, glass
// toolbar, menu and command bands) is calmed by a pale, cool wash: lighter, less saturated, the
// title and toolbar labels lower in contrast; its shadow is lighter.
//
// PlexWindow provides the level per window layer (WindowLook: 0 = active, 1 = inactive; motion-
// blur copies always draw the active look). Chrome drawn by an app (src/apps/lib/chrome.jsx
// AppTop) puts a <ChromeWash> over its own bars; only those consumers re-render while the level
// fades, and the wash only re-rasters its own rect.
import { createContext, useContext } from 'react'

export const WindowLook = createContext(0)

// fitted by eye against the active chrome (see docs/briefs/os.md, window chrome)
const WASH = 'rgb(214, 225, 240)'
const WASH_ALPHA = 0.34
export const INACTIVE_SHADOW = 0.5 // the inactive shadow's opacity relative to the active one

// a wash over the chrome box (x, y, w, h: local px of the element it is drawn in)
export function ChromeWash({ x = 0, y = 0, w, h, radius }) {
  const level = useContext(WindowLook)
  if (level <= 0) return null
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, height: h, background: WASH, opacity: WASH_ALPHA * level,
        borderRadius: radius, pointerEvents: 'none',
      }}
    />
  )
}
