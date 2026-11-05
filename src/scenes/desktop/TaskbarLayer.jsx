// Taskbar composition: entrance timing, clock text, the task-button group and the
// "My Music" button that appears once the music window exists.
import { CAPTURE } from '../../core/clock.js'
import { Bar, StartFlag, StartLabel, Clock, ShutDot, ClockChevron, EarlyBarTint } from './Taskbar.jsx'
import { TaskGroup } from './TaskGroup.jsx'
import { ramp } from './timing.js'

const DEMO = CAPTURE || new URLSearchParams(location.search).has('demo')

function realTime(upper) {
  const d = new Date()
  let h = d.getHours() % 12
  if (h === 0) h = 12
  const m = String(d.getMinutes()).padStart(2, '0')
  const ap = d.getHours() < 12 ? 'am' : 'pm'
  return `${h}:${m} ${upper ? ap.toUpperCase() : ap}`
}

export function TaskbarLayer({ t, f }) {
  // entrance (absolute video frames, measured element by element)
  const bar = ramp(f, 516, 520)
  const flag = ramp(f, 520.3, 521.3)
  const dotIn = ramp(f, 519.4, 520.4)
  const clockIn = ramp(f, 519.5, 520.5)
  const dotOut = ramp(f, 568.3, 574.3)
  const oldClockOut = ramp(f, 569.3, 574)
  const newClock = ramp(f, 568.3, 574.3)
  const chevron = ramp(f, 567.6, 574.2)
  const start = ramp(f, 569.4, 574.8)
  const built = ramp(f, 568.5, 574)
  const oldClock = DEMO ? '7:09 PM' : realTime(true)
  const newLabel = DEMO ? '11:31 am' : realTime(false)
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <Fade o={bar}>{BAR}</Fade>
      <Fade o={bar * (1 - built)}>{EARLY}</Fade>
      <TaskGroup t={t} f={f} />
      <Fade o={flag * (1 - built)}>{FLAG_PASTEL}</Fade>
      <Fade o={flag * built}>{FLAG}</Fade>
      <Fade o={start}>{START_LABEL}</Fade>
      <Fade o={dotIn * (1 - dotOut)}>{DOT}</Fade>
      <Fade o={clockIn * (1 - oldClockOut)}>
        <Clock label={oldClock} old />
      </Fade>
      <Fade o={newClock}>
        <Clock label={newLabel} />
      </Fade>
      <Fade o={chevron}>{CHEVRON}</Fade>
    </div>
  )
}


// always-mounted opacity wrappers (no DOM mounts while the entrance animates)
function Fade({ o, children }) {
  return <div style={{ position: 'absolute', inset: 0, opacity: o, visibility: o > 0 ? 'visible' : 'hidden' }}>{children}</div>
}
const BAR = <Bar />
const EARLY = <EarlyBarTint />
const FLAG_PASTEL = <StartFlag pastel />
const FLAG = <StartFlag />
const START_LABEL = <StartLabel />
const DOT = <ShutDot />
const CHEVRON = <ClockChevron />
