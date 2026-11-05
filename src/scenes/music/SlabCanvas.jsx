// Like gl/Slab3D, but driven by an explicit time `t` (so each motion-blur copy of the
// window can render its own sub-frame pose) and without reading the clock itself.
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useStageScale } from '../../core/Stage.jsx'
import { renderSlabs, SlabScene } from '../../gl/slab.js'

export function SlabCanvas({ t, width, height, items, samples = 1, shutter = 0, phase = -0.5, P = 1000, origin, style }) {
  const ref = useRef(null)
  const scene = useMemo(() => new SlabScene(), [])
  const { s } = useStageScale()
  const scale = Math.min(3, s * (window.devicePixelRatio || 1))
  useLayoutEffect(() => {
    const c = ref.current
    if (!c) return
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
  })
  return <canvas ref={ref} style={{ position: 'absolute', width, height, pointerEvents: 'none', ...style }} />
}
