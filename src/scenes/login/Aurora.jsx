// Full-stage WebGL canvas for the aurora background (see aurora.js).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTime } from '../../core/time.jsx'
import { useStageScale } from '../../core/Stage.jsx'
import { AuroraRenderer, keysReady } from './aurora.js'

const RES = 0.5

// paused: keep the canvas and its GL context (so coming back is instant) but draw nothing
export function Aurora({ style, paused = false }) {
  const t = useTime()
  const ref = useRef(null)
  const r = useRef(null)
  const [, setReady] = useState(false)
  useEffect(() => {
    keysReady.then(() => setReady(true))
  }, [])
  const { s } = useStageScale()
  // drawn at half the pixels it shows in each direction and scaled up by the compositor: the
  // aurora is soft gradients and gaussian ribbons (sigma 2.8 stage px or more), so a quarter of
  // the pixels looks the same (RMSE over the login frames unchanged) for a quarter of the
  // canvas's memory and fill
  const k = Math.min(2, s * (window.devicePixelRatio || 1)) * RES
  useLayoutEffect(() => {
    if (!ref.current) return
    if (!r.current) r.current = new AuroraRenderer(ref.current)
    if (!paused) r.current.render(t, Math.round(960 * k), Math.round(720 * k))
  })
  return <canvas ref={ref} style={{ position: 'absolute', left: 0, top: 0, width: 960, height: 720, ...style }} />
}
