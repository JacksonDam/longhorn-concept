// Taskbar composition: entrance timing, clock text, the task-button group and the
// "My Music" button that appears once the music window exists.
import { memo } from 'react'
import { CAPTURE, FPS } from '../../core/clock.js'
import { emit } from '../../core/events.js'
import { clamp, ease } from '../../core/anim.js'
import { Tooltip, ContextMenu, pt } from '../../ui/index.js'
import { Bar, StartFlag, StartLabel, Clock, ShutDot, ClockChevron, EarlyBarTint } from './Taskbar.jsx'
import { TaskGroup, taskMenuItems } from './TaskGroup.jsx'
import { ramp } from './timing.js'
import { hover, popupState, togglePopup, toggleSidebar } from './shellState.js'
import { closeFlyout } from './Flyout.jsx'
import { calendarDate } from './Flyouts.jsx'
import { POINT } from '../../core/point.js'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const dateText = (d) => `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`

// hit areas: Start button, clock (calendar, date tooltip), chevron (hide / show the sidebar)
const HITS = [
  { id: 'tb.start', x: 0, y: 699, w: 64, h: 21, go: () => togglePopup('start') },
  { id: 'tb.clock', x: 878, y: 700, w: 60, h: 20, go: () => togglePopup('calendar') },
  { id: 'tb.chevron', x: 940, y: 700, w: 20, h: 20, go: () => toggleSidebar() },
]
const Hits = memo(function Hits() {
  return HITS.map((h) => (
    <div
      key={h.id}
      style={{ position: 'absolute', left: h.x, top: h.y, width: h.w, height: h.h, pointerEvents: 'auto' }}
      onPointerEnter={(e) => emit('hover', { id: h.id, on: true, ...pt(e) })}
      onPointerLeave={() => emit('hover', { id: h.id, on: false })}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.stopPropagation()
        closeFlyout()
        emit('hover', { id: h.id, on: false })
        h.go()
      }}
    />
  ))
})
const HITS_EL = <Hits />

// the start button lights up on hover and stays lit while the Start menu is open
function StartGlow({ t }) {
  const st = popupState(t, 'start')
  const df = (t - st.at) * FPS
  const open = st.open ? clamp(df / 2) : 1 - clamp(df / 3)
  const lv = Math.max(hover(t, 'tb.start') * 0.7, open)
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 699,
        width: 66,
        height: 21,
        opacity: lv,
        visibility: lv > 0 ? 'visible' : 'hidden',
        borderRadius: '0 9px 9px 0',
        background: 'linear-gradient(to bottom, rgba(150,200,255,0.55), rgba(90,150,235,0.35) 50%, rgba(60,120,220,0.3))',
        boxShadow: 'inset 0 1px 0 rgba(220,240,255,0.6), inset -1px 0 0 rgba(160,205,255,0.5)',
      }}
    />
  )
}

const DEMO = CAPTURE || new URLSearchParams(location.search).has('demo')

function realTime(upper) {
  const d = new Date()
  let h = d.getHours() % 12
  if (h === 0) h = 12
  const m = String(d.getMinutes()).padStart(2, '0')
  const ap = d.getHours() < 12 ? 'am' : 'pm'
  return `${h}:${m} ${upper ? ap.toUpperCase() : ap}`
}

export function TaskbarLayer({ t, f, sidebarHidden, sidebarAt }) {
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
    <div style={{ ...POINT, pointerEvents: 'none' }}>
      <Bar o={bar} />
      <Fade o={bar * (1 - built)}>{EARLY}</Fade>
      <TaskGroup t={t} f={f} />
      <StartGlow t={t} />
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
      <Fade o={chevron}>
        <div style={{ position: 'absolute', left: 943, top: 702, width: 15, height: 15, transformOrigin: '7.5px 7.5px', transform: `rotate(${chevronTurn(t, sidebarHidden, sidebarAt)}deg)` }}>
          <div style={{ position: 'absolute', left: -943, top: -702 }}>{CHEVRON}</div>
        </div>
        <div style={{ position: 'absolute', left: 941, top: 700, width: 19, height: 19, borderRadius: '50%', opacity: hover(t, 'tb.chevron') * 0.6, background: 'radial-gradient(circle, rgba(220,240,255,0.7), rgba(160,210,255,0) 70%)' }} />
      </Fade>
      <div style={{ position: 'absolute', left: 880, top: 702, width: 56, height: 16, borderRadius: 3, opacity: Math.max(hover(t, 'tb.clock'), popupState(t, 'calendar').open ? 1 : 0) * 0.35, background: 'rgba(170,210,255,0.6)' }} />
      <div style={{ ...POINT, visibility: start > 0 ? 'visible' : 'hidden' }}>{HITS_EL}</div>
      <Tooltip forId="tb.clock" text={dateText(calendarDate())} />
      <ContextMenu id="tb.ctx" items={taskMenuItems} />
    </div>
  )
}


// always-mounted opacity wrappers (no DOM mounts while the entrance animates); points, not
// full-stage boxes (core/point.js)
function Fade({ o, children }) {
  return <div style={{ ...POINT, opacity: o, visibility: o > 0 ? 'visible' : 'hidden' }}>{children}</div>
}
const EARLY = <EarlyBarTint />
const FLAG_PASTEL = <StartFlag pastel />
const FLAG = <StartFlag />
const START_LABEL = <StartLabel />
const DOT = <ShutDot />
const CHEVRON = <ClockChevron />

// the chevron turns over (points up) while the sidebar is hidden
function chevronTurn(t, hidden, at) {
  if (at === -Infinity) return 0
  const k = ease.inOut(clamp(((t - at) * FPS) / 5))
  return 180 * (hidden ? k : 1 - k)
}
