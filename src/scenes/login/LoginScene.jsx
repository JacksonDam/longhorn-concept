// Login screen (video frames 1-522): aurora background, Windows/VAIO logos, the bottom bar with
// Shut Down, five user tiles and the clock; selecting a user flies their tile out as a glass slab
// beside the password panel; submit plays the element-wise exit over the desktop.
import { memo, useEffect } from 'react'
import { useTime, useEvents } from '../../core/time.jsx'
import { emit } from '../../core/events.js'
import { CAPTURE, FPS, now } from '../../core/clock.js'
import { Aurora } from './Aurora.jsx'
import { Logo } from './Logo.jsx'
import { BarBand, ShutDown, Clock, clockText } from './Bar.jsx'
import { TileRow } from './TileRow.jsx'
import { Selected } from './Selected.jsx'
import { Panel } from './Panel.jsx'
import { rowState } from './select.js'
import { currentSelection, submitEvent, passwordLength } from './state.js'
import { LOGIN_EXIT, layerOpacity, chromeExit } from './exit.js'
import { POINT } from '../../core/point.js'
import { logoffReverse, screen } from '../../os/session.js'
import { asset } from '../../core/preload.js'
import { clamp } from '../../core/anim.js'
import { toStage } from '../../core/Stage.jsx'
import { popupState } from '../desktop/shellState.js'

export { LOGIN_EXIT }

const params = new URLSearchParams(location.search)
const DEMO = CAPTURE || params.has('demo')
// local verification aid: ?capture&refbg puts the reference video frame behind the UI instead of
// the aurora, so element-wise RMSE isolates the UI elements (ref/ is local only)
const REFBG = params.has('refbg')
const NOBAR = params.has('nobar') // local fitting aid: the aurora without the bar band
const refFrame = (t) => `${import.meta.env.BASE_URL}ref/frames/f${String(Math.round(t * (30000 / 1001)) + 1).padStart(5, '0')}.png`

// The pointer for the selected slab's tilt (Selected.jsx, core/tilt.js): 'login.pointer' events
// in stage px, at most one per animation frame, only while a user is selected and nothing is
// submitted; { gone: true } when it leaves the page. Never under ?demo / ?capture (the video's
// slab doesn't follow the mouse).
function usePointerSamples(active) {
  useEffect(() => {
    if (DEMO || !active) return
    let pending = null, raf = 0, gone = true
    const live = () => {
      const t = now()
      return !!currentSelection(t).id && !submitEvent(t)
    }
    const flush = () => {
      raf = 0
      if (!pending || !live()) return
      emit('login.pointer', pending)
      gone = !!pending.gone
      pending = null
    }
    const queue = (p) => {
      pending = p
      if (!raf) raf = requestAnimationFrame(flush)
    }
    const onMove = (e) => {
      const p = toStage(e.clientX, e.clientY)
      queue({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })
    }
    const onOut = (e) => {
      if (!e.relatedTarget && !gone) queue({ gone: true })
    }
    addEventListener('pointermove', onMove)
    document.addEventListener('pointerout', onOut)
    return () => {
      removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerout', onOut)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [active])
}

function useKeys(active) {
  useEffect(() => {
    if (CAPTURE || !active) return
    const onKey = (e) => {
      const t = now()
      const sel = currentSelection(t)
      if (submitEvent(t)) return
      if (e.key === 'Escape') {
        if (sel.id) emit('login.deselect')
        return
      }
      if (!sel.id) return
      const len = passwordLength(t)
      if (e.key === 'Enter') emit('login.submit', { id: sel.id })
      else if (e.key === 'Backspace') emit('login.pw', { len: Math.max(0, len - 1) })
      else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) emit('login.pw', { len: Math.min(len + 1, 24) })
      else return
      e.preventDefault()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [active])
}

const shutDown = () => {
  if (!CAPTURE && !submitEvent(now())) emit('session.shutdown')
}

// visible: the login screen is showing (or leaving); otherwise only the aurora's canvas stays
// mounted, paused, so the next visit (log off, boot) starts without a GL context or shader compile.
export function LoginScene({ visible = true }) {
  const t = useTime()
  useEvents()
  useKeys(visible)
  usePointerSamples(visible)
  // While hidden, the content stays mounted but frozen as a fresh login screen (t = 0: no
  // selection, nothing typed) on an invisible layer, so coming back (log off, boot) is a small
  // update, not a mount; the aurora keeps its canvas and GL context, paused. Its rendering is
  // skipped meanwhile (content-visibility): WebKit otherwise keeps every composited layer of a
  // hidden subtree backed (a phone kept ~10 MB of login layers under the desktop).
  return (
    <div style={{ position: 'absolute', inset: 0, visibility: visible ? 'visible' : 'hidden', contentVisibility: visible ? 'visible' : 'hidden', pointerEvents: visible ? 'auto' : 'none' }}>
      <LoginContent t={visible ? t : 0} visible={visible} glKeep={visible || popupState(t, 'start').open} />
    </div>
  )
}

// Longhorn 4015's shutting-down screen (guidebookgallery.org, assets-src/longhorn-shutdown),
// measured at 800x600 and scaled to the stage (x 1.2): the flag 40x34 centred at (400, 270), the
// text's cap height 12 px centred on x 400 at y 303-315, white with a soft dark shadow; the face
// is Tahoma's (single-storey g), Verdana where there is no Tahoma
const FLAG = asset('img/desktop/flag.svg')
const ShuttingDown = memo(function ShuttingDown({ o }) {
  return (
    <div style={{ ...POINT, opacity: o, pointerEvents: 'none' }}>
      <img
        src={FLAG}
        alt=""
        draggable={false}
        style={{ position: 'absolute', left: 480 - 24, top: 324 - 21, width: 48, height: 41, filter: 'brightness(0) invert(1) drop-shadow(0 0 2px rgba(220, 235, 255, 0.6))', opacity: 0.86 }}
      />
      <div
        style={{
          position: 'absolute',
          left: 280,
          width: 400,
          top: 360,
          textAlign: 'center',
          fontFamily: 'Tahoma, Verdana, sans-serif',
          fontWeight: 700,
          fontSize: 18.2,
          lineHeight: '24px',
          color: '#fff',
          whiteSpace: 'nowrap',
          textShadow: '1px 1px 2px rgba(0, 20, 80, 0.75)',
        }}
      >
        Windows is shutting down...
      </div>
    </div>
  )
})

const LoginContent = memo(function LoginContent({ t, visible, glKeep }) {
  const submit = submitEvent(t)
  // the exit clock: seconds since the submit; after a log off it unwinds instead (the login
  // transition in reverse, os/session.js logoffReverse), k from the exit's end down to 0
  const exitK = (tt) => (submit ? tt - submit.t : logoffReverse(tt)?.k ?? null)
  const k = exitK(t)
  const row = rowState(t)
  const submitT = submit ? submit.t : null
  // shutting down: the logon screen's shutting-down state (Longhorn 4015's, assets-src/
  // longhorn-shutdown): the background with a white Windows flag over "Windows is shutting
  // down...", nothing else. From the login screen its parts fade out as the message fades in;
  // from the desktop the whole layer comes back in that state (logoffReverse).
  const cur = screen(t)
  const sd = cur.name === 'shutdown' ? (t - cur.t0) * FPS : null
  const ui = sd == null ? 1 : cur.from === 'desktop' ? 0 : 1 - clamp(sd / 8)
  const msg = sd == null ? 0 : cur.from === 'desktop' ? 1 : clamp((sd - 3) / 8)
  return (
    <div
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: k == null ? 1 : layerOpacity(k) }}
      onPointerDown={(e) => {
        if (CAPTURE || submit) return
        if (e.target === e.currentTarget || e.target.tagName === 'CANVAS') {
          if (currentSelection(now()).id) emit('login.deselect')
        }
      }}
    >
      {REFBG ? (
        <img src={refFrame(t)} alt="" style={{ position: 'absolute', left: 0, top: 0, width: 960, height: 720 }} />
      ) : (
        <Aurora paused={!visible} keep={glKeep} />
      )}
      {/* (static, so it adds no layer: an opacity group only while shutting down) */}
      <div style={{ opacity: ui, visibility: ui > 0 ? undefined : 'hidden' }}>
        {!REFBG && !NOBAR && <BarBand />}
        <Logo t={t} exitK={exitK} />
        {/* (a point, not a full-stage box: core/point.js) */}
        <div style={{ ...POINT, pointerEvents: 'none', opacity: k == null ? 1 : chromeExit(k).opacity }}>
          <div style={{ pointerEvents: 'auto' }}>
            <ShutDown onClick={shutDown} />
          </div>
          <Clock text={clockText(DEMO)} />
        </div>
        <TileRow t={t} row={row} exitK={exitK} />
        <Panel t={t} row={row} submitT={submitT} />
        <Selected t={t} records={row.records} submitT={submitT} />
      </div>
      {msg > 0 && <ShuttingDown o={msg} />}
    </div>
  )
})
