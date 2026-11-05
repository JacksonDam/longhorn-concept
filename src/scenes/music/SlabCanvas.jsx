// Like gl/Slab3D, but driven by an explicit time `t` (so each motion-blur copy of the
// window can render its own sub-frame pose) and without reading the clock itself.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useStageScale } from '../../core/Stage.jsx'
import { renderSlabs, SlabScene, texturesReady } from '../../gl/slab.js'

// cacheKey: canvases rendering the same image in one frame (e.g. the blur copies of the window in
// real-time playback, which all show the slab at the frame time) share one GL render: the first
// renders, the others copy its pixels (a cheap 2D copy instead of another GPU readback).
const shared = new Map() // cacheKey -> { key, canvas }

// Shader warm-up: compile the slab program at load and keep one material alive for the page's
// lifetime, so slabs mounting later (the window open, the album page) never compile on their
// first frame (a 25-300 ms stall otherwise: three.js frees a program with its last material).
const warm = { scene: null }
export function warmSlabs(slab) {
  if (warm.scene || typeof document === 'undefined') return
  warm.scene = new SlabScene()
  const c = document.createElement('canvas')
  const draw = () =>
    renderSlabs(c.getContext('2d'), warm.scene, [{ slab: slab || { w: 4, h: 4, d: 2 }, pose: () => ({ x: 4, y: 4 }) }], [0], { cw: 8, ch: 8, scale: 1, P: 900 })
  draw()
  // and once more when the picture has loaded, so its texture (and mipmaps) are uploaded too
  texturesReady().then(draw)
}

// skip: keep the last pixels (the canvas is on an invisible layer)
export function SlabCanvas({ t, width, height, items, samples = 1, shutter = 0, phase = -0.5, P = 1000, origin, style, cacheKey, skip }) {
  const ref = useRef(null)
  const scene = useMemo(() => new SlabScene(), [])
  useEffect(() => () => scene.dispose(), [scene])
  const { s } = useStageScale()
  const scale = Math.min(3, s * (window.devicePixelRatio || 1))
  useLayoutEffect(() => {
    const c = ref.current
    if (!c || skip) return
    const key = cacheKey && `${t}:${samples}:${scale}`
    const hit = cacheKey && shared.get(cacheKey)
    if (hit && hit.key === key && hit.canvas !== c && hit.canvas.isConnected) {
      if (c.width !== hit.canvas.width || c.height !== hit.canvas.height) {
        c.width = hit.canvas.width
        c.height = hit.canvas.height
      }
      const g = c.getContext('2d')
      g.clearRect(0, 0, c.width, c.height)
      g.drawImage(hit.canvas, 0, 0)
      return
    }
    const n = Math.max(1, samples)
    const times = []
    for (let k = 0; k < n; k++) times.push(n === 1 ? t : t + shutter * ((k + 0.5) / n + phase))
    renderSlabs(c.getContext('2d'), scene, items, times, {
      cw: width,
      ch: height,
      scale,
      P,
      ox: origin ? origin[0] : width / 2,
      oy: origin ? origin[1] : height / 2,
    })
    if (cacheKey) shared.set(cacheKey, { key, canvas: c })
  })
  return <canvas ref={ref} style={{ position: 'absolute', width, height, pointerEvents: 'none', ...style }} />
}
