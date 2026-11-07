// Shut Down and boot, after the second reference video (ref2 f02775-f02888, see os/session.js):
// the login screen fades linearly to black; the off screen is black with the power button (the
// machine has to be switchable back on; the page opens on the same, powerButton.js); booting
// shows the boot screen, then fades the login screen back in from black.
import { useEffect } from 'react'
import { clamp } from '../../core/anim.js'
import { CAPTURE } from '../../core/clock.js'
import { emit, last } from '../../core/events.js'
import { SHUTDOWN_HOLD, SHUTDOWN_FADE, BOOT_DUR, bootScreenDur } from '../../os/session.js'
import { logoSVG, BLOCKS_SVG, FADE, INTERIOR, BLOCKS_X0, GROUP, sweepOffset } from './bootScreen.js'
import { orbSVG, ORB, HIT, HOVER, PRESS, FADE_IN } from './powerButton.js'
import { useStageScale } from '../../core/Stage.jsx'
import { centreOffset } from '../login/layout.js'

// the whole stage (the screen: wider or taller than the video's frame, core/Stage.jsx), and the
// video's 960x720 frame centred in it, where the screens' artwork sits (a 4:3 boot screen, the
// power button: centred on the screen, like index.html's boot screen)
const fill = { position: 'absolute', inset: 0 }
const frame = { position: 'absolute', left: 0, top: 0, width: 960, height: 720 }

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

// the power button's orb: the login's Shut Down orb scaled up (powerButton.js, the same drawing as
// the page's own power-on screen in index.html)
const ORB_EL = <div style={{ position: 'absolute', inset: 0 }} dangerouslySetInnerHTML={{ __html: orbSVG('pwo') }} />

// The off screen: black, with the power button fading in, as the page opens on in real use
// (index.html, powerButton.js). Hover ('power.hover') brightens it, a press ('power.press') sinks
// it, and the click (or Enter / Space) boots: the boot screen, then the welcome screen.
export function OffScreen({ t0, t, hover }) {
  const c = centreOffset(useStageScale())
  const k = t - t0
  const show = clamp((k - FADE_IN.delay) / FADE_IN.dur)
  const pe = last(t, (e) => e.type === 'power.press' && e.t >= t0)
  const fx = pe?.on ? PRESS : hover ? HOVER : null
  useEffect(() => {
    if (CAPTURE) return
    const key = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      emit('session.boot')
    }
    addEventListener('keydown', key)
    return () => removeEventListener('keydown', key)
  }, [])
  const press = (on) => () => !CAPTURE && emit('power.press', { on })
  return (
    <div style={{ ...fill, background: '#000', pointerEvents: 'auto' }}>
      <div
        role="button"
        aria-label="Turn on"
        onPointerDown={(e) => {
          e.stopPropagation()
          if (e.button === 0) press(true)()
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (CAPTURE) return
          emit('power.press', { on: false })
          emit('session.boot')
        }}
        onPointerEnter={() => !CAPTURE && emit('power.hover', { on: true })}
        onPointerLeave={() => {
          if (CAPTURE) return
          if (pe?.on) emit('power.press', { on: false })
          emit('power.hover', { on: false })
        }}
        style={{ position: 'absolute', left: c.x + 480 - HIT / 2, top: c.y + 360 - HIT / 2, width: HIT, height: HIT, borderRadius: HIT / 2, cursor: 'pointer' }}
      >
        <div
          style={{
            position: 'absolute',
            left: (HIT - ORB) / 2,
            top: (HIT - ORB) / 2,
            width: ORB,
            height: ORB,
            opacity: show,
            transform: fx ? `scale(${fx.scale})` : undefined,
            filter: fx ? `brightness(${fx.brightness})` : undefined,
          }}
        >
          {ORB_EL}
        </div>
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
  const c = centreOffset(useStageScale())
  const k = t - t0
  const x = k < FADE ? null : sweepOffset(k - FADE)
  return (
    <div style={{ ...fill, background: '#000', pointerEvents: 'auto' }}>
      <div style={{ ...frame, left: c.x, top: c.y, opacity: clamp(k / FADE) }}>{LOGO}</div>
      {x != null && (
        <div style={{ position: 'absolute', left: c.x + INTERIOR.x * S, top: c.y + INTERIOR.y * S, width: INTERIOR.w * S, height: INTERIOR.h * S, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: (BLOCKS_X0 - INTERIOR.x) * S, width: GROUP.w * S, height: GROUP.h * S, transform: `translateX(${x * S}px)` }}>{BLOCKS}</div>
        </div>
      )}
    </div>
  )
}
