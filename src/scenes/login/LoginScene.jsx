// Login screen (video frames 1-522): aurora background, Windows/VAIO logos, the bottom bar with
// Shut Down, five user tiles and the clock; selecting a user flies their tile out as a glass slab
// beside the password panel; submit plays the element-wise exit over the desktop.
import { memo, useEffect } from 'react'
import { useTime, useEvents } from '../../core/time.jsx'
import { emit } from '../../core/events.js'
import { CAPTURE, now } from '../../core/clock.js'
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

export { LOGIN_EXIT }

const params = new URLSearchParams(location.search)
const DEMO = CAPTURE || params.has('demo')
// local verification aid: ?capture&refbg puts the reference video frame behind the UI instead of
// the aurora, so element-wise RMSE isolates the UI elements (ref/ is local only)
const REFBG = params.has('refbg')
const NOBAR = params.has('nobar') // local fitting aid: the aurora without the bar band
const refFrame = (t) => `${import.meta.env.BASE_URL}ref/frames/f${String(Math.round(t * (30000 / 1001)) + 1).padStart(5, '0')}.png`

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
  // While hidden, the content stays mounted but frozen as a fresh login screen (t = 0: no
  // selection, nothing typed) on an invisible layer, so coming back (log off, boot) is a small
  // update, not a mount; the aurora keeps its canvas and GL context, paused. Its rendering is
  // skipped meanwhile (content-visibility): WebKit otherwise keeps every composited layer of a
  // hidden subtree backed (a phone kept ~10 MB of login layers under the desktop).
  return (
    <div style={{ position: 'absolute', inset: 0, visibility: visible ? 'visible' : 'hidden', contentVisibility: visible ? 'visible' : 'hidden', pointerEvents: visible ? 'auto' : 'none' }}>
      <LoginContent t={visible ? t : 0} visible={visible} />
    </div>
  )
}

const LoginContent = memo(function LoginContent({ t, visible }) {
  const submit = submitEvent(t)
  // exit clock: seconds into the exit after submit
  const exitK = (tt) => (submit ? tt - submit.t : null)
  const k = exitK(t)
  const row = rowState(t)
  const submitT = submit ? submit.t : null
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
        <Aurora paused={!visible} />
      )}
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
  )
})
