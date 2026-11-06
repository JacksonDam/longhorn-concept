// Real Windows XP / Office 2003 icon art (assets-src/SOURCES.md section 13): icons and toolbar
// images read out of the XP SP3 and Office 2003 binaries by tools/icons/xpicons.py into one sprite
// per size design (public/img/xp/xp16/24/32/48.webp, index in ./xpSheet.js). <XpIcon name size />
// draws the design nearest the drawn size (XP's 16 px designs are not shrunk 32 px ones, so a
// 16-18 px icon uses the 16 px art), scaled to the box. `crisp` keeps 16-colour pixel art (Paint's
// tools) hard-edged when the stage scales it.
import { memo } from 'react'
import { asset, preload } from '../core/preload.js'
import { COLS, PAD, SHEETS, ICONS } from './xpSheet.js'

const URL = Object.fromEntries(Object.keys(SHEETS).map((s) => [s, asset(`img/xp/xp${s}.webp`)]))
preload(Object.values(URL))

export const hasXp = (name) => name in ICONS
export const xpSheetUrl = (s) => URL[s]

// the size design to draw at `size` stage px: the nearest by ratio (16 for 14-19, 24 for 20-27, ...)
export function xpVariant(name, size) {
  const v = ICONS[name]
  if (!v) return 0
  let best = 0
  let err = Infinity
  for (const k in v) {
    const s = +k
    const e = Math.abs(Math.log(size / s))
    if (e < err - 1e-9) {
      err = e
      best = s
    }
  }
  return best
}

// CSS for a box showing the icon (size px square)
export function xpStyle(name, size, crisp) {
  const s = xpVariant(name, size)
  if (!s) return null
  const i = ICONS[name][s]
  const k = size / s
  const c = s + 2 * PAD
  const [W, H] = SHEETS[s]
  return {
    width: size,
    height: size,
    flex: 'none',
    backgroundImage: `url(${URL[s]})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${W * k}px ${H * k}px`,
    backgroundPosition: `${-((i % COLS) * c + PAD) * k}px ${-(Math.floor(i / COLS) * c + PAD) * k}px`,
    imageRendering: crisp ? 'pixelated' : undefined,
  }
}

// x, y: absolute position in the parent (omit for an in-flow block)
export const XpIcon = memo(function XpIcon({ name, size = 16, x, y, crisp, style }) {
  const st = xpStyle(name, size, crisp)
  if (!st) return null
  return <div data-xp={name} style={{ ...(x != null || y != null ? { position: 'absolute', left: x, top: y } : null), ...st, ...style }} />
})
