// Full-stage WebGL canvas for the aurora background (see aurora.js).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTime } from '../../core/time.jsx'
import { useStageScale } from '../../core/Stage.jsx'
import { AuroraRenderer, keysReady } from './aurora.js'

export function Aurora({ style }) {
  const t = useTime()
  const ref = useRef(null)
  const r = useRef(null)
  const [, setReady] = useState(false)
  useEffect(() => {
    keysReady.then(() => setReady(true))
  }, [])
  const { s } = useStageScale()
  const k = Math.min(2, s * (window.devicePixelRatio || 1))
  useLayoutEffect(() => {
    if (!ref.current) return
    if (!r.current) r.current = new AuroraRenderer(ref.current)
    r.current.render(t, Math.round(960 * k), Math.round(720 * k))
  })
  return <canvas ref={ref} style={{ position: 'absolute', left: 0, top: 0, width: 960, height: 720, ...style }} />
}
