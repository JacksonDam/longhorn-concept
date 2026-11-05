// The window drop shadow, fitted on the video: the my Music window darkens the wallpaper around
// it (sides ~0.12, bottom edge ~0.25, nothing above; ref frames 1050-1340 against the minimised
// window's frames 1375-1390), a soft black shadow of the window's rounded outline, offset down.
// The second video (ref2 f01490, Edit Video over the explorer) shows the same kind of shadow.
//
// Cost: the shadow is pre-rendered once (canvas, at load) into nine-slice pieces and drawn as
// four strips around the window inside each window layer (live and motion-blur copies), so it is
// rasterised with the layer and then only transformed with it; no blur is ever computed per
// frame. The strips are separate elements so that a change of the shadow's opacity (focus
// cross-fade, maximise) only re-rasters the strips, never the window under them.
import { memo } from 'react'
import { preload } from '../core/preload.js'

// box-shadow terms (stage px): 0 DY BLUR SPREAD rgba(0,0,0,ALPHA), sigma = BLUR / 2; fitted by
// capture + RMSE over the ring around the window (frames 800-1300: 8.89 -> 6.86)
const ALPHA = 0.33
const SPREAD = -1
const DY = 9
const SIGMA = 8
export const SHADOW_RADIUS = 8 // the window's corner radius (PlexWindow RIM_R)

// O: how far the shadow reaches outside the window; C: the corner zone inside it (past C the
// profile along an edge is uniform)
const O = Math.ceil(SPREAD + DY + 3 * SIGMA)
const C = Math.ceil(SHADOW_RADIUS + SPREAD + DY + 3 * SIGMA)
const S = 2 // image px per stage px
const IW = 2 * C + 2 // the shape the image is drawn for (its middle 2 px are uniform)
const TOT = IW + 2 * O

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
  const K = O + C // corner piece size
  const mid = O + C // a uniform column / row
  return {
    tl: piece(0, 0, K, K), tm: piece(mid, 0, 1, K), tr: piece(TOT - K, 0, K, K),
    bl: piece(0, TOT - K, K, K), bm: piece(mid, TOT - K, 1, K), br: piece(TOT - K, TOT - K, K, K),
    l: piece(0, mid, O, 1), r: piece(TOT - O, mid, O, 1),
  }
}
const IMG = build()
if (IMG) preload(Object.values(IMG))

const K = O + C
const strip = (x, y, w, h, extra) => ({ position: 'absolute', left: x, top: y, width: w, height: h, pointerEvents: 'none', backgroundRepeat: 'no-repeat', ...extra })
const row = (a, m, b) => ({
  backgroundImage: `url(${a}), url(${m}), url(${b})`,
  backgroundPosition: `0 0, ${K}px 0, 100% 0`,
  backgroundSize: `${K}px 100%, calc(100% - ${2 * K}px) 100%, ${K}px 100%`,
})

// the shadow of a w x h window (window-local px), at opacity op (1 = the video's)
export const WindowShadow = memo(function WindowShadow({ w, h, op = 1 }) {
  if (!IMG || op <= 0 || w < 2 * K || h < 2 * C) return null
  const o = op >= 1 ? undefined : op
  return (
    <>
      <div style={strip(-O, -O, w + 2 * O, K, { ...row(IMG.tl, IMG.tm, IMG.tr), opacity: o })} />
      <div style={strip(-O, h - C, w + 2 * O, K, { ...row(IMG.bl, IMG.bm, IMG.br), opacity: o })} />
      <div style={strip(-O, C, O, h - 2 * C, { backgroundImage: `url(${IMG.l})`, backgroundSize: '100% 100%', opacity: o })} />
      <div style={strip(w, C, O, h - 2 * C, { backgroundImage: `url(${IMG.r})`, backgroundSize: '100% 100%', opacity: o })} />
    </>
  )
})
