// Login screen (video frames 1-522): aurora background, Windows/VAIO logos, the bottom bar with
// Shut Down, five user tiles and the clock; selecting a user flies their tile out as a glass slab
// beside the password panel; submit plays the element-wise exit over the desktop.
import { useEffect } from 'react'
import { useTime, useEvents } from '../../core/time.jsx'
import { emit } from '../../core/events.js'
import { CAPTURE } from '../../core/clock.js'
import { Aurora } from './Aurora.jsx'
import { Logo } from './Logo.jsx'
import { BarBand, ShutDown, Clock, clockText } from './Bar.jsx'
import { TileRow } from './TileRow.jsx'
import { Selected } from './Selected.jsx'
import { Panel } from './Panel.jsx'
import { rowState } from './select.js'
import { currentSelection, submitEvent, passwordLength } from './state.js'
import { LOGIN_EXIT, layerOpacity, chromeExit } from './exit.js'

export { LOGIN_EXIT }

const params = new URLSearchParams(location.search)
const DEMO = CAPTURE || params.has('demo')
// local verification aid: ?capture&refbg puts the reference video frame behind the UI instead of
// the aurora, so element-wise RMSE isolates the UI elements (ref/ is local only)
const REFBG = params.has('refbg')
const NOBAR = params.has('nobar') // local fitting aid: the aurora without the bar band
const refFrame = (t) => `${import.meta.env.BASE_URL}ref/frames/f${String(Math.round(t * (30000 / 1001)) + 1).padStart(5, '0')}.png`

function useKeys() {
  useEffect(() => {
    if (CAPTURE) return
    const onKey = (e) => {
      const sel = currentSelection(Infinity)
      if (submitEvent(Infinity)) return
      if (e.key === 'Escape') {
        if (sel.id) emit('login.deselect')
        return
      }
      if (!sel.id) return
      const len = passwordLength(Infinity)
      if (e.key === 'Enter') emit('login.submit')
      else if (e.key === 'Backspace') emit('login.pw', { len: Math.max(0, len - 1) })
      else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) emit('login.pw', { len: Math.min(len + 1, 24) })
      else return
      e.preventDefault()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])
}

export function LoginScene() {
  const t = useTime()
  useEvents()
  useKeys()
  const submit = submitEvent(t)
  const k = submit ? t - submit.t : null
  const row = rowState(t)
  const submitT = submit ? submit.t : null
  return (
    <div
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: k == null ? 1 : layerOpacity(k) }}
      onPointerDown={(e) => {
        if (CAPTURE || submit) return
        if (e.target === e.currentTarget || e.target.tagName === 'CANVAS') {
          if (currentSelection(Infinity).id) emit('login.deselect')
        }
      }}
    >
      {REFBG ? (
        <img src={refFrame(t)} alt="" style={{ position: 'absolute', left: 0, top: 0, width: 960, height: 720 }} />
      ) : (
        <Aurora />
      )}
      {!REFBG && !NOBAR && <BarBand />}
      <Logo t={t} submitT={submitT} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: k == null ? 1 : chromeExit(k).opacity }}>
        <ShutDown />
        <Clock text={clockText(DEMO)} />
      </div>
      <TileRow t={t} row={row} submitT={submitT} />
      <Panel t={t} row={row} submitT={submitT} />
      <Selected t={t} records={row.records} submitT={submitT} />
    </div>
  )
}
