// Pre-mounted multi-sample motion blur for small boxes (perf brief: one rasterisation, many
// transforms). `n` copies of the (static, memoised) children always exist; while `moving`
// they are all shown, each posed at a sub-frame time of the shutter with opacity 1/n and
// plus-lighter inside an isolated group (the exact average of the samples, as in
// core/MotionBlur.jsx); while still, only copy 0 is shown at pose(t). Each copy is its own
// compositing layer the size of `box`, so a moving frame is a composite, not a repaint.
//
// box:   { left, top, width, height } stage px; children are drawn in stage coordinates
// pose(tt) -> { transform?, opacity?, transformOrigin? } (transform-origin in box px)
// shutter / phase: as MotionBlur (same time unit as t)
// live:  optional element shown in copy 0 only (dynamic bits such as hover highlights),
//        drawn between `children` and `front` (both static, in every copy)
import { memo } from 'react'

const Content = memo(function Content({ left, top, children }) {
  return <div style={{ position: 'absolute', left: -left, top: -top }}>{children}</div>
})

export function Blur({ t, box, n = 8, shutter = 1, phase = -0.5, pose, moving, children, live, front, style, hidden }) {
  const copies = []
  for (let k = 0; k < n; k++) {
    const show = !hidden && (moving || k === 0)
    const tt = moving ? t + shutter * ((k + 0.5) / n + phase) : t
    const p = show ? pose(tt) : null
    const op = p ? (p.opacity ?? 1) * (moving ? 1 / n : 1) : 0
    copies.push(
      <div
        key={k}
        style={{
          position: 'absolute',
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          overflow: 'visible',
          willChange: 'transform, opacity',
          transform: p?.transform || 'none',
          transformOrigin: p?.transformOrigin || '0 0',
          opacity: op,
          visibility: show && op > 0 ? 'visible' : 'hidden',
          mixBlendMode: moving ? 'plus-lighter' : 'normal',
          pointerEvents: k === 0 && !moving ? undefined : 'none',
        }}
      >
        <Content left={box.left} top={box.top}>
          {children}
        </Content>
        {k === 0 && live ? <Content left={box.left} top={box.top}>{live}</Content> : null}
        {front ? (
          <Content left={box.left} top={box.top}>
            {front}
          </Content>
        ) : null}
      </div>,
    )
  }
  return <div style={{ position: 'absolute', left: 0, top: 0, isolation: 'isolate', ...style }}>{copies}</div>
}
