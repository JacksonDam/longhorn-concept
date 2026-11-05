// The window drop shadow, fitted on the video: the my Music window darkens the wallpaper around
// it (sides ~0.12, bottom edge ~0.25, nothing above; ref frames 1050-1340 against the minimised
// window's frames 1375-1390), a soft black shadow of the window's rounded outline, offset down.
// The second video (ref2 f01490, Edit Video over the explorer) shows the same kind of shadow.
//
// Cost: the shadow is pre-rendered once (canvas, at load) into nine-slice pieces (one stylesheet)
// and drawn as four strips around the window on one layer per window (PlexWindow) that follows
// the live window's pose (during motion blur: the pose at the middle of the shutter), so it is
// rasterised once and then only transformed; the blur copies' layers stay the window's size, and
// the focus cross-fade (a lighter shadow while inactive) is compositor work. No blur is ever
// computed per frame.
import { memo } from 'react'
import { preload } from '../core/preload.js'

// box-shadow terms (stage px): 0 DY BLUR SPREAD rgba(0,0,0,ALPHA), sigma = BLUR / 2; fitted by
// capture + RMSE over the ring around the window (frames 800-1300: 8.89 -> 6.86)
const ALPHA = 0.33
const SPREAD = -1
const DY = 9
const SIGMA = 8
export const SHADOW_RADIUS = 8 // the window's corner radius (PlexWindow RIM_R)

// How far the shadow reaches outside the window on each side (cut where its alpha falls under
// 1/400: 2.5 sigma past the spread edge): sides, bottom (offset down by DY) and top (little or
// nothing). The strips cover only that ring (and the corner radius R inside it, where the rounded
// corners leave room), so the window layers grow as little as possible (every motion-blur copy
// composites its whole layer) and re-rastering a strip never touches the window's content.
// C: the corner zone (past C from a corner the profile along an edge is uniform).
const TAIL = 2.5 * SIGMA
const OS = Math.ceil(SPREAD + TAIL)
const OB = Math.ceil(SPREAD + DY + TAIL)
const OT = Math.max(0, Math.ceil(SPREAD - DY + TAIL))
const C = Math.ceil(SHADOW_RADIUS + SPREAD + DY + TAIL)
const O = Math.max(OS, OB, OT) // the image's margin
const S = 2 // image px per stage px
const IW = 2 * C + 2 // the shape the image is drawn for (its middle 2 px are uniform)
const TOT = IW + 2 * O
const R = SHADOW_RADIUS
const KS = OS + C // corner piece width (top and bottom strips)
const KT = OT + R // top strip height
const KB = OB + R // bottom strip height
const KV = C - R // corner piece height (side strips)

function build() {
  if (typeof document === 'undefined') return null
  const n = TOT * S
  const c = document.createElement('canvas')
  c.width = c.height = n
  const g = c.getContext('2d')
  const rr = (x, y, w, h, r) => {
    g.beginPath()
    g.roundRect(x, y, w, h, r)
  }
  // the shadow alone: draw the shape far off the canvas and offset its shadow back
  const off = n * 4
  g.shadowColor = `rgba(0,0,0,${ALPHA})`
  g.shadowBlur = 2 * SIGMA * S
  g.shadowOffsetX = off
  g.shadowOffsetY = DY * S
  g.fillStyle = '#000'
  rr((O - SPREAD) * S - off, (O - SPREAD) * S, (IW + 2 * SPREAD) * S, (IW + 2 * SPREAD) * S, (SHADOW_RADIUS + SPREAD) * S)
  g.fill()
  // the window itself covers its shape: cut it out (translucent chrome never shows shadow)
  g.shadowColor = 'transparent'
  g.globalCompositeOperation = 'destination-out'
  rr(O * S, O * S, IW * S, IW * S, SHADOW_RADIUS * S)
  g.fill()
  const piece = (x, y, w, h) => {
    const p = document.createElement('canvas')
    p.width = w * S
    p.height = h * S
    p.getContext('2d').drawImage(c, x * S, y * S, w * S, h * S, 0, 0, w * S, h * S)
    return p.toDataURL('image/png')
  }
  const xl = O - OS, xr = O + IW // left / right side strips
  const x1 = O + IW - C // right corner pieces
  const yt = O - OT, yb = O + IW - R // top / bottom strips
  const mid = O + C // a uniform column / row
  return {
    tl: piece(xl, yt, KS, KT), tm: piece(mid, yt, 1, KT), tr: piece(x1, yt, KS, KT),
    bl: piece(xl, yb, KS, KB), bm: piece(mid, yb, 1, KB), br: piece(x1, yb, KS, KB),
    lt: piece(xl, O + R, OS, KV), lm: piece(xl, mid, OS, 1), lb: piece(xl, O + IW - C, OS, KV),
    rt: piece(xr, O + R, OS, KV), rm: piece(xr, mid, OS, 1), rb: piece(xr, O + IW - C, OS, KV),
  }
}
const IMG = build()
if (IMG) preload(Object.values(IMG))

// The strips' images go into one stylesheet, parsed once: elements only carry a class (inline
// data-URL backgrounds would be re-parsed for every mounted window layer)
const CLS = { t: 'lh-shadow-t', b: 'lh-shadow-b', l: 'lh-shadow-l', r: 'lh-shadow-r' }
if (IMG) {
  const row = (a, m, b) =>
    `background: url(${a}) 0 0 / ${KS}px 100% no-repeat, url(${m}) ${KS}px 0 / calc(100% - ${2 * KS}px) 100% no-repeat, url(${b}) 100% 0 / ${KS}px 100% no-repeat;`
  const col = (a, m, b) =>
    `background: url(${a}) 0 0 / 100% ${KV}px no-repeat, url(${m}) 0 ${KV}px / 100% calc(100% - ${2 * KV}px) no-repeat, url(${b}) 0 100% / 100% ${KV}px no-repeat;`
  const css = document.createElement('style')
  css.textContent = [
    `.${CLS.t} { ${row(IMG.tl, IMG.tm, IMG.tr)} }`,
    `.${CLS.b} { ${row(IMG.bl, IMG.bm, IMG.br)} }`,
    `.${CLS.l} { ${col(IMG.lt, IMG.lm, IMG.lb)} }`,
    `.${CLS.r} { ${col(IMG.rt, IMG.rm, IMG.rb)} }`,
  ].join('\n')
  document.head.appendChild(css)
}
const strip = (x, y, w, h, op) => ({ position: 'absolute', left: x, top: y, width: w, height: h, pointerEvents: 'none', opacity: op })

// the shadow of a w x h window (window-local px), at opacity op (1 = the video's)
export const WindowShadow = memo(function WindowShadow({ w, h, op = 1 }) {
  if (!IMG || op <= 0 || w < 2 * C || h < 2 * C) return null
  const o = op >= 1 ? undefined : op
  return (
    <>
      <div className={CLS.t} style={strip(-OS, -OT, w + 2 * OS, KT, o)} />
      <div className={CLS.b} style={strip(-OS, h - R, w + 2 * OS, KB, o)} />
      <div className={CLS.l} style={strip(-OS, R, OS, h - 2 * R, o)} />
      <div className={CLS.r} style={strip(w, R, OS, h - 2 * R, o)} />
    </>
  )
})
