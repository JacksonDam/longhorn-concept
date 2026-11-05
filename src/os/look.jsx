// The inactive window look (os/focus.js decides which windows are active and cross-fades the
// level). A window that isn't active keeps its layout and content; its top chrome (title bar,
// glass toolbar, menu and command bands: app.chromeTop px from the window's top) is calmed by a
// pale, cool wash (lighter, less saturated, toolbar labels lower in contrast), its title row is
// dimmed towards the bar (a dimmer title and window buttons), and its shadow is lighter.
//
// Design sources: neither video shows an inactive look (ref2 f01090-f01112 and f01512-f01600:
// the explorer behind Edit Pictures / Create an album keeps its title bar and title colours
// within noise), so this follows the Plex theme's Luna lineage (XP's inactive caption: lighter,
// desaturated blue, greyed caption text), kept subtle.
//
// Cost: the wash is one small layer per window above its window layers (WindowLayer's group),
// painted once; the cross-fade only changes its opacity (compositor work, no repaint). It shows
// only while the window is at rest: motion-blur copies always draw the active look.
import { memo } from 'react'

const WASH = 'rgb(214, 225, 240)'
const WASH_ALPHA = 0.34
// the title row: the bar's own gradient over the title text and buttons (they fade towards it)
const TITLE_DIM = 0.35
const titleGrad =
  'linear-gradient(90deg, #4985d7 0%, #4f8bdd 5%, #5793e2 15%, #5fa1ed 26%, #6eb0fa 37%, #6ab0f8 42%, #68aaf8 46%, #66a8f4 57%, #5fa2ee 64%, #5a9ce9 72%, #558fe2 82%, #4e84d7 90%, #4a86d8 100%)'
export const INACTIVE_SHADOW = 0.5 // the inactive shadow's opacity relative to the active one

// the wash over a window at (x, y), w wide, its top chrome h tall, title row th, corner radius r;
// op = how inactive it looks (0..1)
export const LookLayer = memo(function LookLayer({ x, y, w, h, th, r, op }) {
  const top = 3 // the window body starts 3 px down (PlexWindow's clip; the rim is above it)
  const inset = r > 0 ? 1 : 0 // and 1 px in from the left along the top chrome (the rim's place)
  const round = r > 0 ? `${r}px ${r}px 0 0` : 0
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, height: h, pointerEvents: 'none',
        opacity: op, visibility: op > 0 ? 'visible' : 'hidden', willChange: 'opacity',
      }}
    >
      <div style={{ position: 'absolute', left: inset, top, width: w - inset, height: th - top, background: titleGrad, opacity: TITLE_DIM, borderRadius: round }} />
      <div style={{ position: 'absolute', left: inset, top, width: w - inset, height: h - top, background: WASH, opacity: WASH_ALPHA, borderRadius: round }} />
    </div>
  )
})
