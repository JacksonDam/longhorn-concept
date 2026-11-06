// Full-stage WebGL canvas for the aurora background (see aurora.js), drawn at the screen's pixel
// density: the field fitted over the video's frame, on a wider stage placed where the login
// places the frame (layout.js frameOffset) and run on past its sides; on a taller stage scaled up
// uniformly to the stage's height, centred across, its sides cropped (a portrait phone would
// otherwise be ~60% sky with nothing in it).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTime } from '../../core/time.jsx'
import { useStageScale } from '../../core/Stage.jsx'
import { AuroraRenderer, keysReady } from './aurora.js'
import { frameOffset } from './layout.js'

// device px per stage px at most (like the slabs, gl/Slab3D.jsx): past 3 the compositor scales it up
const MAX_DENSITY = 3

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
  const stage = useStageScale()
  const { s, w, h } = stage
  const off = frameOffset(stage)
  const fs = stage.dh > 0 ? h / 720 : 1
  const view = stage.dh > 0 ? { w, h, ox: (960 - 960 * fs) / 2, oy: 0, k: fs } : { w, h, ox: off.x, oy: off.y, k: 1 }
  // one canvas pixel per device pixel (on a phone devicePixelRatio includes the page zoom,
  // index.html), up to MAX_DENSITY
  const k = Math.min(MAX_DENSITY, s * (window.devicePixelRatio || 1))
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
    if (!paused || fresh) r.current.render(t, Math.round(w * k), Math.round(h * k), view)
  })
  return <canvas key={gen} ref={ref} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, ...style }} />
}
