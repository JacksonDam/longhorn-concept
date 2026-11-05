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
  return { s, x: (innerWidth - W * s) / 2, y: (innerHeight - H * s) / 2 }
}

// client (page) coordinates -> stage coordinates
let current = fit()
export const toStage = (cx, cy) => ({ x: (cx - current.x) / current.s, y: (cy - current.y) / current.s })
export const stageScale = () => current.s

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
