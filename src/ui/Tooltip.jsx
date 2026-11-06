// Tooltip for any control that logs 'hover' with the pointer position (every kit control does):
// shows after the pointer has rested `delay` s, fades in over 3 frames, hides on press, after
// `hold` s, or when the pointer leaves. Drawn in the overlay layer.
//
//   <Tooltip forId="ie.back" text="Back" />
import { memo } from 'react'
import { FPS } from '../core/clock.js'
import { useUITime as useTime, useLive } from './scope.jsx'
import { clamp } from '../core/anim.js'
import { lastOf } from './state.js'
import { Overlay } from './Overlay.jsx'
import { FONT } from './theme.js'
import { stageSize } from '../core/Stage.jsx'

const Tip = memo(function Tip({ text, x, y }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        padding: '2px 7px 3px',
        borderRadius: 4,
        background: 'linear-gradient(180deg, #ffffff 0, #eaf3ff 100%)',
        boxShadow: '0 0 0 1px #8fa9cf, 2px 3px 5px rgba(20,50,100,0.3)',
        fontFamily: FONT,
        fontWeight: 500,
        fontSize: 10.5,
        lineHeight: '14px',
        color: '#3d5a8c',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      {text}
    </div>
  )
})

export function Tooltip({ forId, text, delay = 0.6, hold = 5, t: tProp }) {
  const t0 = useTime()
  const t = tProp ?? t0
  const live = useLive()
  const e = lastOf(t, 'hover', forId)
  if (!live || !e || !e.on || e.x == null) return null
  const p = lastOf(t, 'press', forId)
  if (p && p.t >= e.t) return null
  const dt = t - e.t
  if (dt < delay || dt > delay + hold) return null
  const k = clamp(((dt - delay) * FPS) / 3)
  const w = String(text).length * 6 + 16
  // (inside the stage, above the taskbar: core/Stage.jsx, the video's frame extended by dw x dh)
  const S = stageSize()
  const x = Math.min(Math.round(e.x + 1), (S.w || 960) - 2 - w)
  const y = e.y + 38 > 698 + (S.dh || 0) ? Math.round(e.y - 22) : Math.round(e.y + 20)
  return (
    <Overlay>
      <div style={{ position: 'absolute', left: 0, top: 0, opacity: k }}>
        <Tip text={text} x={x} y={y} />
      </div>
    </Overlay>
  )
}
