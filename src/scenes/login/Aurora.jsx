// Full-stage WebGL canvas for the aurora background (see aurora.js).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTime } from '../../core/time.jsx'
import { useStageScale } from '../../core/Stage.jsx'
import { AuroraRenderer, keysReady } from './aurora.js'

const RES = 0.5

// paused: draw nothing. keep: hold a GL context (false: release it, its GPU memory with it; a
// WebGL context's is tens of MB on a phone). The login scene keeps it while it shows and while the
// Start menu is open on the desktop (log off and shut down are there), so the context is created
// and its program compiled, with one frame drawn unseen, before the login screen comes back.
export function Aurora({ style, paused = false, keep = true }) {
  const t = useTime()
  const ref = useRef(null)
  const r = useRef(null)
  const [gen, setGen] = useState(0) // a released context can't come back: a new canvas
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
    if (!keep) {
      if (r.current) {
        r.current.dispose()
        r.current = null
        setGen((g) => g + 1)
      }
      return
    }
    const fresh = !r.current
    if (fresh) r.current = new AuroraRenderer(ref.current)
    if (!paused || fresh) r.current.render(t, Math.round(960 * k), Math.round(720 * k))
  })
  return <canvas key={gen} ref={ref} style={{ position: 'absolute', left: 0, top: 0, width: 960, height: 720, ...style }} />
}
