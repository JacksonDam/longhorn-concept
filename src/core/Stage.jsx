// The stage: the reference video's 960x720 frame, extended to the screen's shape and scaled to
// fit. All layout inside is authored in video pixels against that frame; the stage is W x H or
// larger: in a wider window it keeps the frame's height (720) and grows wider, in a taller one it
// keeps the width (960) and grows taller. Things on the frame's right or bottom edge follow the
// stage's (dw = w - W, dh = h - H: anchor right-edge things at x + dw, bottom-edge things at
// y + dh, centred ones at + dw / 2, + dh / 2); full-stage things cover w x h.
// ?capture and ?bench pin the frame at scale 1 at 0,0; ?demo (the video's input replayed, with its
// cursor) keeps the frame's own size, letterboxed, unless &fit is given too (a scripted scenario
// played at the screen's shape, for checks on phones and the simulator: ?demo&scenario=shell&fit;
// the video's own cursor, drawn for the frame, is hidden then).
//
// How the scale is applied: CSS zoom where the engine has standard zoom (Chrome 128+, Safari's
// WebKit, Firefox 126+), so the page is laid out at its shown size and every layer, glyph, border
// and image is rasterised at the screen's density. Under a scale transform WebKit backs each
// composited layer at its untransformed size x devicePixelRatio and stretches it (the live site
// was blurry in Safari at any scale above 1), and Chrome keeps a will-change: transform layer at
// the raster scale it was first drawn at. Zoom's semantics (checked in Chrome, Playwright WebKit
// and the system WebKit): every length inside is multiplied (transforms' px, filters, shadows,
// borders, which snap to whole device px), getBoundingClientRect and event clientX/Y are in
// viewport px (so toStage maps both), while offsetWidth, scrollTop, ResizeObserver and
// getComputedStyle stay in stage px. An engine with the old zoom (rects divided by the zoom),
// or none, keeps the transform. Phones keep it too: index.html lays their page out at the
// stage's size with a page zoom, so the stage's own scale is 1 there and nothing changes.
// ?stage=transform|zoom overrides the choice (comparisons).
import { useEffect, useState, createContext, useContext } from 'react'
import { CAPTURE } from './clock.js'

export const W = 960
export const H = 720
const q = new URLSearchParams(location.search)
// ?demo&fit: the demo at the screen's shape
export const FIT = !CAPTURE && q.has('demo') && q.has('fit')
const PINNED = CAPTURE || (q.has('demo') && !q.has('fit'))

// standard zoom: an element inside a zoom: 2 box reports its rect at twice its size
function standardZoom() {
  try {
    if (!CSS.supports('zoom', '2')) return false
    const a = document.createElement('div')
    a.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;zoom:2'
    const b = document.createElement('div')
    b.style.cssText = 'width:10px;height:10px'
    a.appendChild(b)
    document.documentElement.appendChild(a)
    const w = b.getBoundingClientRect().width
    a.remove()
    return Math.abs(w - 20) < 0.5
  } catch {
    return false
  }
}
const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
const force = q.get('stage')
// 'zoom' | 'transform'
export const STAGE_MODE = force === 'transform' || force === 'zoom' ? force : !CAPTURE && !coarse && standardZoom() ? 'zoom' : 'transform'
const ZOOM = STAGE_MODE === 'zoom'

const FRAME = { s: 1, x: 0, y: 0, w: W, h: H, dw: 0, dh: 0 }
const ScaleCtx = createContext(FRAME)
// { s (CSS px per stage px), x, y (the stage's corner in the page), w, h (the stage's size in
// stage px), dw, dh (w - W, h - H), dpr (device px per CSS px when fitted) }; components that
// read it redraw when it changes
export const useStageScale = () => useContext(ScaleCtx)
export const useStageSize = useStageScale

function fit() {
  const dpr = window.devicePixelRatio || 1
  if (CAPTURE) return FRAME
  const vw = innerWidth, vh = innerHeight
  let s, w = W, h = H
  if (PINNED) s = Math.min(vw / W, vh / H)
  else if (vw * H >= vh * W) {
    s = vh / H
    w = Math.max(W, Math.round(vw / s))
  } else {
    s = vw / W
    h = Math.max(H, Math.round(vh / s))
  }
  // the stage's corner on a whole device pixel (see seam)
  const px = (v) => Math.round(v * dpr) / dpr
  return { s, x: px((vw - w * s) / 2), y: px((vh - h * s) / 2), w, h, dw: w - W, dh: h - H, dpr }
}

// client (page) coordinates -> stage coordinates (pointer events' clientX / Y, and under standard
// zoom or a transform getBoundingClientRect's values too)
let current = fit()
export const toStage = (cx, cy) => ({ x: (cx - current.x) / current.s, y: (cy - current.y) / current.s })
export const stageScale = () => current.s
// the stage's size outside React (event handlers): { w, h, dw, dh }
export const stageSize = () => current
// A stage coordinate moved to the nearest whole device pixel, for an edge where two layers meet
// (the taskbar and the sidebar's clock foot): each puts its edge there. At a phone's page zoom
// (1.19 device px per stage px on an iPhone Duo; devicePixelRatio includes the zoom) the edge
// otherwise falls inside a device pixel, Safari snaps each layer's edges to whole device pixels on
// its own, and the two can round apart: the column between showed the wallpaper as a dark line.
// Unchanged at whole scales (capture, the bench). (Callers read useStageScale() so they redraw
// when it changes.)
export const seam = (v) => {
  const d = current.s * (window.devicePixelRatio || 1)
  return Math.round(v * d) / d
}

export function Stage({ children }) {
  const [f, setF] = useState(fit)
  useEffect(() => {
    const on = () => {
      const n = fit()
      if (n.s === current.s && n.x === current.x && n.y === current.y && n.w === current.w && n.h === current.h && n.dpr === current.dpr) return
      current = n
      setF(n)
    }
    addEventListener('resize', on)
    // a new device pixel ratio without a resize (the window moved to another display): canvases
    // and seams follow it
    let mq = null
    const watch = () => {
      mq?.removeEventListener('change', onDpr)
      mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`)
      mq.addEventListener('change', onDpr)
    }
    const onDpr = () => (on(), watch())
    watch()
    return () => {
      removeEventListener('resize', on)
      mq?.removeEventListener('change', onDpr)
    }
  }, [])
  current = f
  const zoom = ZOOM && f.s !== 1
  return (
    <ScaleCtx.Provider value={f}>
      <div
        id="stage"
        // (tools read the stage's geometry here: tools/interact.mjs, audit.mjs, core/report.js)
        data-s={f.s}
        data-x={f.x}
        data-y={f.y}
        data-w={f.w}
        data-h={f.h}
        data-mode={STAGE_MODE}
        style={{
          position: 'absolute',
          // (zoom multiplies the element's own lengths too: its corner is given in zoomed px)
          left: zoom ? f.x / f.s : f.x,
          top: zoom ? f.y / f.s : f.y,
          width: f.w,
          height: f.h,
          zoom: zoom ? f.s : undefined,
          // (under zoom an identity transform: the stage stays the stacking context and containing
          // block it is under the transform)
          transform: `scale(${ZOOM ? 1 : f.s})`,
          transformOrigin: '0 0',
          overflow: 'hidden',
          background: '#000',
        }}
      >
        {children}
      </div>
    </ScaleCtx.Provider>
  )
}
