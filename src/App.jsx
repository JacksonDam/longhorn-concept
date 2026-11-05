import { useEffect, useMemo, useState } from 'react'
import { Stage } from './core/Stage.jsx'
import { TimeProvider, useTime, useEvents, lastRenderedTime } from './core/time.jsx'
import { Cursor } from './core/Cursor.jsx'
import { CAPTURE, now, seek, runBench } from './core/clock.js'
import { last, setLog, getLog } from './core/events.js'
import { demoEvents, demoCursor } from './demo/index.js'
import { preloaded } from './core/preload.js'
import { texturesReady } from './gl/slab.js'
import { LoginScene, LOGIN_EXIT } from './scenes/login/LoginScene.jsx'
import { DesktopScene } from './scenes/desktop/DesktopScene.jsx'

const params = new URLSearchParams(location.search)
const DEMO = CAPTURE || params.has('demo')

function Scenes() {
  const t = useTime()
  useEvents()
  const submit = last(t, (e) => e.type === 'login.submit')
  const showLogin = !submit || t < submit.t + LOGIN_EXIT
  return (
    <>
      {submit && <DesktopScene since={submit.t} />}
      {showLogin && <LoginScene />}
    </>
  )
}

export default function App() {
  const [demo, setDemo] = useState(DEMO)
  useMemo(() => {
    if (DEMO) setLog(demoEvents())
  }, [])
  useEffect(() => {
    if (!demo || CAPTURE) return
    // any real input during the demo hands control to the user from this moment on
    const takeOver = () => {
      const t = now()
      setLog(getLog().filter((e) => e.t <= t))
      setDemo(false)
    }
    addEventListener('pointerdown', takeOver, { capture: true, once: true })
    addEventListener('keydown', takeOver, { capture: true, once: true })
    return () => {
      removeEventListener('pointerdown', takeOver, { capture: true })
      removeEventListener('keydown', takeOver, { capture: true })
    }
  }, [demo])
  return (
    <TimeProvider>
      <Stage>
        <Scenes />
        <Cursor path={demo ? demoCursor : null} />
      </Stage>
    </TimeProvider>
  )
}

// debugging / capture hooks
window.__lh = {
  seek,
  seekFrame: (n) => seek(((n - 1) * 1001) / 30000),
  log: getLog,
  now,
  bench: runBench,
  // resolves once React has committed the frame for the current clock time
  rendered: () =>
    new Promise((resolve) => {
      const check = () => (lastRenderedTime() === now() ? resolve(true) : requestAnimationFrame(check))
      check()
    }),
  // resolves once fonts, <img> elements, preloaded images and slab textures are decoded
  ready: async () => {
    await document.fonts.ready
    await preloaded()
    await Promise.all(
      [...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))),
    )
    await texturesReady()
    return true
  },
}
