// The stage: the reference video's 960x720 frame, extended to the screen's shape and scaled to
// fit. All layout inside is authored in video pixels against that frame; the stage is W x H or
// larger: in a wider window it keeps the frame's height (720) and grows wider, in a taller one it
// keeps the width (960) and grows taller. Things on the frame's right or bottom edge follow the
// stage's (dw = w - W, dh = h - H: anchor right-edge things at x + dw, bottom-edge things at
// y + dh, centred ones at + dw / 2, + dh / 2); full-stage things cover w x h.
// ?capture and ?bench pin the frame at scale 1 at 0,0; ?demo (the video's input replayed, with its
// cursor) keeps the frame's own size, letterboxed.
import { useEffect, useState, createContext, useContext } from 'react'
import { CAPTURE } from './clock.js'

export const W = 960
export const H = 720
const PINNED = CAPTURE || new URLSearchParams(location.search).has('demo')

const FRAME = { s: 1, x: 0, y: 0, w: W, h: H, dw: 0, dh: 0 }
const ScaleCtx = createContext(FRAME)
// { s (CSS px per stage px), x, y (the stage's corner in the page), w, h (the stage's size in
// stage px), dw, dh (w - W, h - H) }; components that read it redraw when it changes
export const useStageScale = () => useContext(ScaleCtx)
export const useStageSize = useStageScale

function fit() {
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
  const dpr = window.devicePixelRatio || 1
  const px = (v) => Math.round(v * dpr) / dpr
  return { s, x: px((vw - w * s) / 2), y: px((vh - h * s) / 2), w, h, dw: w - W, dh: h - H }
}

// client (page) coordinates -> stage coordinates
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
      current = fit()
      setF(current)
    }
    addEventListener('resize', on)
    return () => removeEventListener('resize', on)
  }, [])
  current = f
  return (
    <ScaleCtx.Provider value={f}>
      <div
        id="stage"
        style={{
          position: 'absolute',
          left: f.x,
          top: f.y,
          width: f.w,
          height: f.h,
          transform: `scale(${f.s})`,
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
