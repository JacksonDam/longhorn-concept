// The 960x720 stage (the reference video's frame), scaled to fit the window.
// All layout inside is authored in video pixels. ?capture pins scale 1 at 0,0.
import { useEffect, useState, createContext, useContext } from 'react'
import { CAPTURE } from './clock.js'

export const W = 960
export const H = 720

const ScaleCtx = createContext({ s: 1, x: 0, y: 0 })
export const useStageScale = () => useContext(ScaleCtx)

function fit() {
  if (CAPTURE) return { s: 1, x: 0, y: 0 }
  const s = Math.min(innerWidth / W, innerHeight / H)
  // the stage's corner on a whole device pixel (see seam)
  const dpr = window.devicePixelRatio || 1
  const px = (v) => Math.round(v * dpr) / dpr
  return { s, x: px((innerWidth - W * s) / 2), y: px((innerHeight - H * s) / 2) }
}

// client (page) coordinates -> stage coordinates
let current = fit()
export const toStage = (cx, cy) => ({ x: (cx - current.x) / current.s, y: (cy - current.y) / current.s })
export const stageScale = () => current.s
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
          width: W,
          height: H,
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
