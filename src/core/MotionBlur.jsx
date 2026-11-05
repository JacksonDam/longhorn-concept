// Temporal-supersampling motion blur for DOM elements.
//
// While `moving`, the children are rendered `samples` times, each layer posed at a
// sub-frame time inside the shutter interval and drawn with opacity 1/samples and
// mix-blend-mode: plus-lighter inside an isolated group. The group therefore holds the
// exact average of the sampled poses (premultiplied), and is then composited normally
// over whatever is behind it: the same result as an accumulation-buffer / After Effects
// style multi-sample motion blur.
//
// pose(tt) -> CSS style object for one layer (transform, opacity, filter, ...).
// shutter: open time in seconds (default half a video frame = 180 degree shutter).
// phase:   where the shutter opens relative to t, in shutter lengths (-0.5 = centred,
//          -1 = trailing / AE "shutter phase -180").
import { memo } from 'react'
import { FPS } from './clock.js'

const layerBase = { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }

export function MotionBlur({
  t,
  pose,
  moving = true,
  samples = 8,
  shutter = 0.5 / FPS,
  phase = -0.5,
  style,
  className,
  layerStyle,
  children,
}) {
  const wrap = { position: 'absolute', ...style }
  if (!moving || samples <= 1) {
    return (
      <div className={className} style={wrap}>
        <div style={{ ...layerBase, ...layerStyle, ...pose(t) }}>{children}</div>
      </div>
    )
  }
  const layers = []
  for (let k = 0; k < samples; k++) {
    const tt = t + shutter * ((k + 0.5) / samples + phase)
    const p = pose(tt)
    const op = (p.opacity ?? 1) / samples
    layers.push(
      <div
        key={k}
        style={{ ...layerBase, ...layerStyle, ...p, opacity: op, mixBlendMode: 'plus-lighter' }}
      >
        {children}
      </div>,
    )
  }
  return (
    <div className={className} style={{ ...wrap, isolation: 'isolate' }}>
      {layers}
    </div>
  )
}

// Wrap heavy static content in this so the K copies don't re-render every frame.
export const Static = memo(function Static({ children }) {
  return children
})
