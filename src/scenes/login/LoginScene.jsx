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
import { currentSelection, submitEvent, passwordLength } from './state.js'
import { LOGIN_EXIT, layerOpacity } from './exit.js'

export { LOGIN_EXIT }

const DEMO = CAPTURE || new URLSearchParams(location.search).has('demo')

function useKeys() {
  useEffect(() => {
    if (CAPTURE) return
    const onKey = (e) => {
      const t = performance.now() // only used to detect auto-repeat floods; visuals use the clock
      void t
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
      <Aurora />
      <BarBand />
      <Logo t={t} submitT={submit ? submit.t : null} />
      <ShutDown />
      <TileRow t={t} />
      <Clock text={clockText(DEMO)} />
    </div>
  )
}
