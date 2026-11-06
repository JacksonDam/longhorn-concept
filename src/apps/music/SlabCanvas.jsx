// Like gl/Slab3D, but driven by an explicit time `t` (so each motion-blur copy of the
// window can render its own sub-frame pose) and without reading the clock itself.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useStageScale } from '../../core/Stage.jsx'
import { renderSlabs, SlabScene, texturesReady, textureReady, acquireSlabScene, releaseSlabScene, warmTextures } from '../../gl/slab.js'

// cacheKey: canvases rendering the same image in one frame (e.g. the blur copies of the window in
// real-time playback, which all show the slab at the frame time) share one GL render: the first
// renders, the others copy its pixels (a cheap 2D copy instead of another GPU readback).
const shared = new Map() // cacheKey -> { key, canvas }

// What a canvas shows is a function of its slabs, their poses at the sample times and the view:
// a canvas whose key hasn't changed keeps its pixels (no GL render, no readback), so a window
// drag, a re-render or a frame between two slab updates costs nothing here.
const drawn = new WeakMap() // canvas -> key of the image it holds
const slabIds = new WeakMap()
let nextSlabId = 1
const slabId = (slab) => {
  let id = slabIds.get(slab)
  if (!id) slabIds.set(slab, (id = nextSlabId++))
  return id
}
function imageKey(items, times, width, height, scale, P, origin) {
  let key = `${width}x${height}@${scale}:${P}:${origin ? origin.join(',') : ''}`
  for (const it of items) {
    key += `|${slabId(it.slab)}.${it.slab.canvasVersion ?? 0}${textureReady(it.slab.map) ? '' : '?'}`
    for (const tt of times) key += ':' + JSON.stringify(it.pose(tt))
  }
  return key
}

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
  // and once more when the pictures have loaded, uploading every slab texture (album covers)
  texturesReady().then(() => {
    draw()
    warmTextures()
  })
}

// skip: keep the last pixels (the canvas is on an invisible layer)
export function SlabCanvas({ t, width, height, items, samples = 1, shutter = 0, phase = -0.5, P = 1000, origin, style, cacheKey, skip }) {
  const ref = useRef(null)
  const scene = useMemo(() => acquireSlabScene(), [])
  useEffect(() => () => releaseSlabScene(scene), [scene])
  const { s } = useStageScale()
  // (device px per stage px, the page zoom included: see gl/Slab3D)
  const scale = Math.min(3, s * (window.devicePixelRatio || 1) * (window.visualViewport?.scale || 1))
  useLayoutEffect(() => {
    const c = ref.current
    if (!c || skip) return
    const n = Math.max(1, samples)
    const times = []
    for (let k = 0; k < n; k++) times.push(n === 1 ? t : t + shutter * ((k + 0.5) / n + phase))
    const key = imageKey(items, times, width, height, scale, P, origin)
    if (drawn.get(c) === key) return
    drawn.set(c, key)
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
