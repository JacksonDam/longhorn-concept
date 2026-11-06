// Shut Down and boot, after the second reference video (ref2 f02775-f02888, see os/session.js):
// the login screen fades linearly to black; the off screen is black with a glass power button
// (the machine has to be switchable back on); booting fades the login screen back in from black.
import { memo } from 'react'
import { clamp } from '../../core/anim.js'
import { CAPTURE } from '../../core/clock.js'
import { emit } from '../../core/events.js'
import { SHUTDOWN_HOLD, SHUTDOWN_FADE, BOOT_DUR, bootScreenDur } from '../../os/session.js'
import { logoSVG, BLOCKS_SVG, FADE, INTERIOR, BLOCKS_X0, GROUP, sweepOffset } from './bootScreen.js'

const fill = { position: 'absolute', left: 0, top: 0, width: 960, height: 720 }

// black over the login screen: fading in while shutting down, out while booting
export function blackLevel(screen, t) {
  const k = t - screen.t0
  if (screen.name === 'shutdown') return clamp((k - SHUTDOWN_HOLD) / SHUTDOWN_FADE)
  if (screen.name === 'boot') return 1 - clamp((k - bootScreenDur(screen)) / BOOT_DUR)
  if (screen.name === 'off') return 1
  return 0
}

export function Black({ level, block }) {
  if (level <= 0 && !block) return null
  return <div style={{ ...fill, background: '#000', opacity: level, pointerEvents: block ? 'auto' : 'none' }} />
}

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
      <circle r="42" fill="url(#pw-glow)" />
      <circle r="27" fill="none" stroke="url(#pw-rim)" strokeWidth="2" />
      <circle r="25.5" fill="url(#pw-body)" />
      <ellipse cx="0" cy="-11" rx="19" ry="12" fill="url(#pw-top)" />
      <path d="M -7.5 -6.5 A 10.5 10.5 0 1 0 7.5 -6.5" fill="none" stroke="#bfe0ff" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="0" y1="-12" x2="0" y2="-1" stroke="#bfe0ff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
})

// the off screen: black, with the power button fading in and breathing slowly
export function OffScreen({ t0, t, hover }) {
  const k = t - t0
  const show = clamp((k - 0.4) / 0.8)
  const pulse = 0.85 + 0.15 * Math.sin(k * ((2 * Math.PI) / 3))
  return (
    <div style={{ ...fill, background: '#000', pointerEvents: 'auto' }}>
      <div
        role="button"
        aria-label="Turn on"
        onPointerDown={(e) => {
          e.stopPropagation()
          if (!CAPTURE) emit('session.boot')
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
          opacity: show * (hover ? 1 : pulse),
          transform: `scale(${hover ? 1.06 : 1})`,
          filter: hover ? 'brightness(1.25)' : undefined,
        }}
      >
        <PowerOrb />
      </div>
    </div>
  )
}

// The power button's boot screen (os/session.js: the boot's first bootScreenDur s), the same
// artwork as the page's own while it loads (bootScreen.js), here a function of the clock: the
// logo and bar fade in over FADE s, then the blocks step through the bar.
const S = 1.5 // the bitmap's 640x480 -> stage px
const LOGO = <div style={{ position: 'absolute', inset: 0 }} dangerouslySetInnerHTML={{ __html: logoSVG('lhr') }} />
const BLOCKS = <div style={{ position: 'absolute', inset: 0 }} dangerouslySetInnerHTML={{ __html: BLOCKS_SVG }} />
export function BootScreen({ t0, t }) {
  const k = t - t0
  const x = k < FADE ? null : sweepOffset(k - FADE)
  return (
    <div style={{ ...fill, background: '#000', pointerEvents: 'auto' }}>
      <div style={{ ...fill, opacity: clamp(k / FADE) }}>{LOGO}</div>
      {x != null && (
        <div style={{ position: 'absolute', left: INTERIOR.x * S, top: INTERIOR.y * S, width: INTERIOR.w * S, height: INTERIOR.h * S, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: (BLOCKS_X0 - INTERIOR.x) * S, width: GROUP.w * S, height: GROUP.h * S, transform: `translateX(${x * S}px)` }}>{BLOCKS}</div>
        </div>
      )}
    </div>
  )
}
