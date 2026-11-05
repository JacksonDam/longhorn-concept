// Shut Down and boot: the Plex-style "shutting down" screen, the dark off screen with a power
// button, and the boot screen that leads back to the login. All pure functions of time since the
// screen started (os/session.js decides which screen is showing).
import { memo } from 'react'
import { clamp, ease } from '../../core/anim.js'
import { CAPTURE } from '../../core/clock.js'
import { emit } from '../../core/events.js'
import { asset, preload } from '../../core/preload.js'
import { SHUTDOWN_DUR, BOOT_DUR } from '../../os/session.js'

const FLAG = asset('img/login/flag.svg')
const WORDS = asset('img/login/wordmark.svg')
preload([FLAG, WORDS])

export const COVER = 0.5 // seconds for the shutting-down screen to cover what was showing

const fill = { position: 'absolute', left: 0, top: 0, width: 960, height: 720 }
const ramp = (k, a, b) => ease.inOut(clamp((k - a) / (b - a)))

// the "Microsoft Windows" lockup, centred, 1.35x the login size
const LW = 142.1 * 1.35
const LH = 94.61 * 1.35
const Lockup = memo(function Lockup() {
  const style = { position: 'absolute', left: 0, top: 0, width: LW, height: LH }
  return (
    <div style={{ position: 'absolute', left: 480 - LW / 2 - 6, top: 238, width: LW, height: LH }}>
      <img src={FLAG} alt="" draggable={false} style={style} />
      <img src={WORDS} alt="" draggable={false} style={style} />
    </div>
  )
})

const Backdrop = memo(function Backdrop() {
  return (
    <div
      style={{
        ...fill,
        background: 'radial-gradient(ellipse 70% 60% at 50% 46%, #2149b8 0%, #0e2a86 42%, #051349 78%, #020a2c 100%)',
      }}
    />
  )
})

const caption = {
  position: 'absolute',
  left: 0,
  width: 960,
  textAlign: 'center',
  fontFamily: 'Libre Franklin',
  fontWeight: 500,
  fontSize: 15,
  color: '#d4e2ff',
  textShadow: '0 1px 2px rgba(0,10,60,0.6)',
  whiteSpace: 'nowrap',
}

// five glass dots with a light running across them
function Dots({ k, y }) {
  const dots = []
  for (let i = 0; i < 5; i++) {
    const ph = (((k * 1.2 - i * 0.16) % 1) + 1) % 1
    const glow = Math.exp(-Math.pow((ph - 0.15) / 0.12, 2))
    dots.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: 480 - 2 * 16 + i * 16 - 4.5,
          top: y - 4.5,
          width: 9,
          height: 9,
          borderRadius: 5,
          background: 'radial-gradient(circle at 40% 35%, #ffffff 0%, #9fc4ff 35%, #3a6fe0 75%, #1d47b0 100%)',
          opacity: 0.35 + 0.65 * glow,
          transform: `scale(${(0.85 + 0.25 * glow).toFixed(3)})`,
        }}
      />,
    )
  }
  return dots
}

export function ShutdownScreen({ t0, t }) {
  const k = t - t0
  const cover = ramp(k, 0, COVER)
  const content = ramp(k, 0.3, 0.8) * (1 - ramp(k, SHUTDOWN_DUR - 0.75, SHUTDOWN_DUR - 0.25))
  const dark = ramp(k, SHUTDOWN_DUR - 0.7, SHUTDOWN_DUR - 0.1)
  return (
    <div style={{ ...fill, pointerEvents: 'auto' }}>
      <div style={{ ...fill, opacity: cover }}>
        <Backdrop />
      </div>
      <div style={{ ...fill, opacity: content }}>
        <Lockup />
        <div style={{ ...caption, top: 392 }}>Windows is shutting down...</div>
        <Dots k={k} y={432} />
      </div>
      <div style={{ ...fill, background: '#000', opacity: dark }} />
    </div>
  )
}

// the off screen: black, with a glass power button that boots the machine again
const PowerOrb = memo(function PowerOrb() {
  return (
    <svg width="84" height="84" viewBox="-42 -42 84 84" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        <radialGradient id="pw-glow" r="0.5">
          <stop offset="0.55" stopColor="#3d7bff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#3d7bff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pw-body" cx="0.5" cy="0.75" r="0.65">
          <stop offset="0" stopColor="#4f8cff" />
          <stop offset="0.6" stopColor="#1f4fd0" />
          <stop offset="1" stopColor="#0d2a8a" />
        </radialGradient>
        <linearGradient id="pw-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6eeff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#a9c4ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pw-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8d8ff" />
          <stop offset="1" stopColor="#5b86e6" />
        </linearGradient>
      </defs>
      <circle r="42" fill="url(#pw-glow)" className="pw-glow" />
      <circle r="27" fill="none" stroke="url(#pw-rim)" strokeWidth="2" />
      <circle r="25.5" fill="url(#pw-body)" />
      <ellipse cx="0" cy="-11" rx="19" ry="12" fill="url(#pw-top)" />
      <path d="M -7.5 -6.5 A 10.5 10.5 0 1 0 7.5 -6.5" fill="none" stroke="#bfe0ff" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="0" y1="-12" x2="0" y2="-1" stroke="#bfe0ff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
})

function boot() {
  if (!CAPTURE) emit('session.boot')
}

export function OffScreen({ t0, t, hover }) {
  const k = t - t0
  const show = ramp(k, 0.3, 1.0)
  const pulse = 0.75 + 0.25 * Math.sin((t - t0) * ((2 * Math.PI) / 3))
  const lift = hover ? 1 : 0
  return (
    <div style={{ ...fill, background: '#000', pointerEvents: 'auto' }}>
      <div
        role="button"
        aria-label="Turn on"
        onPointerDown={(e) => {
          e.stopPropagation()
          boot()
        }}
        onPointerEnter={() => !CAPTURE && emit('power.hover', { on: true })}
        onPointerLeave={() => !CAPTURE && emit('power.hover', { on: false })}
        style={{
          position: 'absolute',
          left: 480 - 42,
          top: 360 - 42,
          width: 84,
          height: 84,
          borderRadius: 42,
          cursor: 'pointer',
          opacity: show * (0.8 + 0.2 * pulse) + 0.2 * lift * show,
          transform: `scale(${(1 + 0.06 * lift).toFixed(3)})`,
          filter: lift ? 'brightness(1.25)' : undefined,
        }}
      >
        <PowerOrb />
      </div>
    </div>
  )
}

export function BootScreen({ t0, t }) {
  const k = t - t0
  const content = ramp(k, 0.15, 0.7) * (1 - ramp(k, BOOT_DUR - 0.55, BOOT_DUR - 0.1))
  // XP-style boot bar, Plex glass: three blue blocks sliding through a rounded track
  const ph = ((k * 0.75) % 1 + 1) % 1
  const blocks = []
  for (let i = 0; i < 3; i++) {
    const x = -24 + (ph * 1.4 - 0.2) * 128 + i * 9
    if (x < -8 || x > 104) continue
    blocks.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: x,
          top: 2,
          width: 7,
          height: 8,
          borderRadius: 2,
          background: 'linear-gradient(#bcd6ff, #3f7cf0 55%, #1d4fc8)',
        }}
      />,
    )
  }
  return (
    <div style={{ ...fill, background: '#000', pointerEvents: 'auto' }}>
      <div style={{ ...fill, opacity: content }}>
        <Lockup />
        <div
          style={{
            position: 'absolute',
            left: 480 - 52,
            top: 404,
            width: 104,
            height: 12,
            borderRadius: 6,
            border: '1px solid #8aa6d8',
            background: 'linear-gradient(#0a0f20, #121c38)',
            overflow: 'hidden',
          }}
        >
          {blocks}
        </div>
      </div>
    </div>
  )
}

export function PowerScreens({ screen, t, hover }) {
  if (screen.name === 'shutdown') return <ShutdownScreen t0={screen.t0} t={t} />
  if (screen.name === 'off') return <OffScreen t0={screen.t0} t={t} hover={hover} />
  if (screen.name === 'boot') return <BootScreen t0={screen.t0} t={t} />
  return null
}
