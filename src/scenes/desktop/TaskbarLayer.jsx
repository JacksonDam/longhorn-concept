// Taskbar composition: entrance timing, clock text, the task-button group and the
// "My Music" button that appears once the music window exists.
import { CAPTURE, now, FPS } from '../../core/clock.js'
import { emit, last } from '../../core/events.js'
import { MotionBlur } from '../../core/MotionBlur.jsx'
import { ease, clamp, track } from '../../core/anim.js'
import { musicWindowState } from '../music/MusicWindow.jsx'
import { Bar, GroupBg, TaskButton, StartFlag, StartLabel, Clock, ShutDot, ClockChevron, EarlyBarTint, LAYOUT4, LAYOUT5 } from './Taskbar.jsx'
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

function onTaskClick(id) {
  if (id !== 'music') return
  const s = musicWindowState(now())
  emit('tb.press', { id })
  emit(s.minimized ? 'music.restore' : 'music.minimize')
}

// ---- "My Music" insertion (video frames 701.5-716, i.e. 8 frames after music.open) -------
// The group opens a gap around the new button: the left buttons slide left, the right ones
// right (overshooting to -95 / +84 px), hold, then close in on it. Offsets are relative to
// the final 5-button layout; keys are frame centres measured on the video (frames 702-716).
const INSERT_DELAY = 8
const OFF_L = track([[0, 64], [0.5, 22], [1.5, -34], [2.5, -73], [3.5, -87], [4.5, -91], [5.5, -93], [6.5, -94], [7.5, -95], [10.9, -95], [11.5, -71], [12.5, -16], [13.5, 5], [14.5, 0]])
const OFF_R = track([[0, -55], [0.5, -18], [1.5, 23], [2.5, 52], [3.5, 62], [4.5, 69], [5.5, 74], [6.5, 79], [7.5, 82], [8.5, 84], [10.9, 84], [11.5, 70], [12.5, 19], [13.5, -5], [14.5, 0]])
const INSERT_END = 15
const LEFT_IDS = new Set(['inbox', 'yahoo'])

function GroupInsert({ rel, t }) {
  const moving = rel > -0.5 && rel < INSERT_END
  const music = LAYOUT5.buttons.find((b) => b.id === 'music')
  const pose = (side) => (r) => {
    const o = r < 0 ? (side === 'L' ? 64 : -55) : side === 'L' ? OFF_L(r) : OFF_R(r)
    return { transform: `translateX(${o}px)` }
  }
  const bgPose = (r) => {
    const l = LAYOUT5.x0 + (r < 0 ? 64 : OFF_L(r))
    const rr = LAYOUT5.x1 + (r < 0 ? -55 : OFF_R(r))
    return { transform: `translateX(${l}px) scaleX(${(rr - l) / 100})`, transformOrigin: '0 0' }
  }
  const mb = { moving, samples: 12, shutter: 1, phase: -0.5 }
  const full = { left: 0, top: 0, width: 960, height: 720 }
  return (
    <>
      <MotionBlur t={rel} pose={bgPose} {...mb} style={full}>
        <GroupBg x0={0} x1={100} />
      </MotionBlur>
      <MotionBlur t={rel} pose={pose('L')} {...mb} style={full}>
        {LAYOUT5.buttons
          .filter((b) => LEFT_IDS.has(b.id))
          .map((b) => (
            <TaskButton key={b.id} b={b} onClick={onTaskClick} />
          ))}
      </MotionBlur>
      <MotionBlur t={rel} pose={pose('R')} {...mb} style={full}>
        {LAYOUT5.buttons
          .filter((b) => !LEFT_IDS.has(b.id) && b.id !== 'music')
          .map((b) => (
            <TaskButton key={b.id} b={b} onClick={onTaskClick} />
          ))}
      </MotionBlur>
      <TaskButton b={music} onClick={onTaskClick} />
      <PressFlash t={t} b={music} />
      <BirthFlare rel={rel} />
    </>
  )
}

// The light flare on the new button (frames 700.5-711.5): first a sharp X of two rays,
// then a two-lobed glow that fades out.
function BirthFlare({ rel }) {
  const r = rel + 1 // frames since 700.5
  if (r < 0 || r > 11) return null
  const rays = r < 1 ? r : clamp(1 - (r - 1.5) / 3)
  const blob = clamp((r - 1) / 2.5) * (1 - clamp((r - 8.5) / 2.5))
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" style={{ position: 'absolute', left: 400, top: 640, mixBlendMode: 'plus-lighter', pointerEvents: 'none' }}>
      <defs>
        <radialGradient id="dk-flare">
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.45" stopColor="#d8f0ff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#9fd4ff" stopOpacity="0" />
        </radialGradient>
        <filter id="dk-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      {rays > 0 && (
        <g opacity={rays} filter="url(#dk-soft)">
          <ellipse cx="59" cy="38" rx="3.2" ry="26" transform="rotate(-24 59 60)" fill="url(#dk-flare)" />
          <ellipse cx="59" cy="38" rx="3.2" ry="26" transform="rotate(24 59 60)" fill="url(#dk-flare)" />
          <ellipse cx="59" cy="64" rx="10" ry="9" fill="url(#dk-flare)" />
        </g>
      )}
      {blob > 0 && (
        <g opacity={blob} filter="url(#dk-soft)">
          <ellipse cx="49" cy="62" rx="15" ry="10" transform="rotate(-25 49 62)" fill="url(#dk-flare)" />
          <ellipse cx="69" cy="62" rx="15" ry="10" transform="rotate(25 69 62)" fill="url(#dk-flare)" />
          <ellipse cx="59" cy="70" rx="14" ry="9" fill="url(#dk-flare)" />
        </g>
      )}
    </svg>
  )
}

// Click flash on a task button (restore click at video frame ~1403): the button lightens,
// strongest over the icon, peaking 1.5 frames after the click and fading over ~8 frames.
function PressFlash({ t, b }) {
  const e = last(t, (e) => e.type === 'tb.press' && e.id === b.id)
  if (!e) return null
  const df = (t - e.t) * FPS
  if (df > 11) return null
  const lv = df < 1.4 ? (0.8 * df) / 1.4 + 0.2 * clamp(df) : Math.exp(-(df - 1.4) / 3.2)
  return (
    <div
      style={{
        position: 'absolute',
        left: b.x + 2,
        top: 700,
        width: b.w - 4,
        height: 19,
        opacity: lv,
        mixBlendMode: 'plus-lighter',
        background: 'linear-gradient(to right, rgba(60,75,30,0.9) 0%, rgba(55,70,28,0.9) 22%, rgba(40,50,14,0.7) 40%, rgba(22,28,8,0.4) 75%, rgba(0,0,0,0) 100%)',
      }}
    />
  )
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
  // task buttons rise into place within one frame (smeared vertically on video frame 523)
  const rise = (ff) => 14 * (1 - ease.out(clamp((ff - (522.5 - 509)) / 1.05)))
  const groupOp = ramp(f, 521.6, 523)
  const ms = musicWindowState(t)
  const rel = ms.exists ? (t - ms.openedAt) * FPS - INSERT_DELAY : -Infinity
  const inserted = rel >= 0
  const oldClock = DEMO ? '7:09 PM' : realTime(true)
  const newLabel = DEMO ? '11:31 am' : realTime(false)
  const moving = f > 521.5 && f < 524.5
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: bar }}>
        <Bar />
      </div>
      {bar * (1 - built) > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: bar * (1 - built) }}>
          <EarlyBarTint />
        </div>
      )}
      {groupOp > 0 && !inserted && (
        <>
          <div style={{ position: 'absolute', inset: 0, opacity: groupOp }}>
            <GroupBg x0={LAYOUT4.x0} x1={LAYOUT4.x1} />
          </div>
          <MotionBlur
            t={f}
            style={{ left: 0, top: 0, width: 960, height: 720, clipPath: 'inset(698px 0 0 0)' }}
            moving={moving}
            samples={8}
            shutter={1}
            pose={(ff) => ({ transform: `translateY(${rise(ff)}px)` })}
          >
            {LAYOUT4.buttons.map((b) => (
              <TaskButton key={b.id} b={b} onClick={onTaskClick} />
            ))}
          </MotionBlur>
        </>
      )}
      {inserted && <GroupInsert rel={rel} t={t} />}
      {flag * (1 - built) > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: flag * (1 - built) }}>
          <StartFlag pastel />
        </div>
      )}
      {flag * built > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: flag * built }}>
          <StartFlag />
        </div>
      )}
      {start > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: start }}>
          <StartLabel />
        </div>
      )}
      {dotIn * (1 - dotOut) > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: dotIn * (1 - dotOut) }}>
          <ShutDot />
        </div>
      )}
      {clockIn * (1 - oldClockOut) > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: clockIn * (1 - oldClockOut) }}>
          <Clock label={oldClock} old />
        </div>
      )}
      {newClock > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: newClock }}>
          <Clock label={newLabel} />
        </div>
      )}
      {chevron > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: chevron }}>
          <ClockChevron />
        </div>
      )}
    </div>
  )
}

