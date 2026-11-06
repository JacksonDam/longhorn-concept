// A DOM-positioned canvas showing one or more glass slabs rendered by gl/slab.js.
//
// <Slab3D width height items=[{ slab, pose: (t) => pose }] moving samples shutter phase
//         P={perspective px} origin={[ox, oy]} style />
// Poses are in this canvas's own px (x, y = slab centre). When `moving`, `samples`
// sub-frame poses are averaged (multi-sample motion blur, see core/MotionBlur.jsx).
import { useLayoutEffect, useRef, useMemo } from 'react'
import { useTime } from '../core/time.jsx'
import { FPS } from '../core/clock.js'
import { useStageScale } from '../core/Stage.jsx'
import { renderSlabs, SlabScene } from './slab.js'

export function Slab3D({
  width,
  height,
  items,
  moving = false,
  samples = 8,
  shutter = 0.5 / FPS,
  phase = -0.5,
  P = 1000,
  origin,
  style,
  className,
}) {
  const t = useTime()
  const ref = useRef(null)
  const scene = useMemo(() => new SlabScene(), [])
  const { s } = useStageScale()
  // device px per stage px: the stage's scale times the device pixel ratio (on a phone, whose page
  // is laid out 960 wide and zoomed out, index.html has devicePixelRatio include the page zoom:
  // it is the device px per CSS px actually shown)
  const scale = Math.min(3, s * (window.devicePixelRatio || 1))
  useLayoutEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    const n = moving ? samples : 1
    const times = []
    for (let k = 0; k < n; k++) times.push(n === 1 ? t : t + shutter * ((k + 0.5) / n + phase))
    renderSlabs(ctx, scene, items, times, {
      cw: width,
      ch: height,
      scale,
      P,
      ox: origin ? origin[0] : width / 2,
      oy: origin ? origin[1] : height / 2,
    })
  })
  return (
    <canvas
      ref={ref}
      className={className}
      style={{ position: 'absolute', width, height, pointerEvents: 'none', ...style }}
    />
  )
}
