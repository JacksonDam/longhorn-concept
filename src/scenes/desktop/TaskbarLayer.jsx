// Taskbar composition: entrance timing, clock text, the task-button group and the
// "My Music" button that appears once the music window exists.
import { CAPTURE, now } from '../../core/clock.js'
import { emit, last } from '../../core/events.js'
import { MotionBlur } from '../../core/MotionBlur.jsx'
import { ease, clamp } from '../../core/anim.js'
import { musicWindowState } from '../music/MusicWindow.jsx'
import { Bar, GroupBg, TaskButton, StartFlag, StartLabel, Clock, ShutDot, ClockChevron, LAYOUT4, LAYOUT5 } from './Taskbar.jsx'
import { ramp, df } from './timing.js'

const DEMO = CAPTURE || new URLSearchParams(location.search).has('demo')

function realTime(upper) {
  const d = new Date()
  let h = d.getHours() % 12
  if (h === 0) h = 12
  const m = String(d.getMinutes()).padStart(2, '0')
  const ap = d.getHours() < 12 ? 'am' : 'pm'
  return `${h}:${m} ${upper ? ap.toUpperCase() : ap}`
}

function onTaskClick(id) {
  if (id !== 'music') return
  const s = musicWindowState(now())
  emit(s.minimized ? 'music.restore' : 'music.minimize')
}

function hovered(t, id) {
  const e = last(t, (e) => e.type === 'hover' && e.id === id)
  return !!e?.on
}

export function TaskbarLayer({ t, f }) {
  const bar = ramp(f, 516, 520)
  const flag = ramp(f, 520, 521)
  const oldIn = ramp(f, 518, 520)
  const swap = ramp(f, 569, 572)
  const start = ramp(f, 569, 573)
  // task buttons rise into place (vertical motion blur), frames ~521.5-524
  const rise = (ff) => 22 * (1 - ease.outCubic(clamp((ff - (521.5 - 509)) / 2.5)))
  const groupOp = ramp(f, 521, 523)
  const ms = musicWindowState(t)
  const layout = ms.exists ? LAYOUT5 : LAYOUT4
  const oldClock = DEMO ? '7:09 PM' : realTime(true)
  const newClock = DEMO ? '11:31 am' : realTime(false)
  const moving = f > 521 && f < 525
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: bar }}>
        <Bar />
      </div>
      {groupOp > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: groupOp }}>
          <GroupBg x0={layout.x0} x1={layout.x1} />
        </div>
      )}
      {groupOp > 0 && (
        <MotionBlur
          t={f}
          style={{ left: 0, top: 0, width: 960, height: 720, overflow: 'hidden', clipPath: 'inset(698px 0 0 0)' }}
          moving={moving}
          samples={8}
          shutter={1}
          pose={(ff) => ({ transform: `translateY(${rise(ff)}px)` })}
        >
          {layout.buttons.map((b) => (
            <TaskButton key={b.id} b={b} onClick={onTaskClick} hover={hovered(t, 'tb.' + b.id)} />
          ))}
        </MotionBlur>
      )}
      {flag > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: flag }}>
          <StartFlag />
        </div>
      )}
      {start > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: start }}>
          <StartLabel />
        </div>
      )}
      {oldIn * (1 - swap) > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: oldIn * (1 - swap) }}>
          <ShutDot />
          <Clock label={oldClock} />
        </div>
      )}
      {swap > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: swap }}>
          <Clock label={newClock} />
          <ClockChevron />
        </div>
      )}
    </div>
  )
}

export { df }
