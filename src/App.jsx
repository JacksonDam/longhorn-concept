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
import { PowerScreens, COVER } from './scenes/session/PowerScreens.jsx'
import { screens } from './os/session.js'
import { emit } from './core/events.js'
import { frameTime } from './core/clock.js'
import { sessionScenario } from './demo/session.js'

const params = new URLSearchParams(location.search)
const DEMO = CAPTURE || params.has('demo')
// ?scenario=session replaces the video's input with the scripted session flows (demo/session.js),
// for stepping and benchmarking the log off / switch user / shut down / boot transitions
const SCENARIO = params.get('scenario') === 'session' ? sessionScenario : null
const hiddenCursor = () => ({ hidden: true })

// Scene flow (os/session.js): login -> desktop (submit) -> login again (log off / switch user);
// Shut Down (login or desktop) -> shutting-down screen -> off screen -> boot (power button) ->
// login. The scene being left stays mounted under the next one until it is covered.
function Scenes() {
  const t = useTime()
  useEvents()
  const list = screens(t)
  const cur = list[list.length - 1]
  const prev = list.length > 1 ? list[list.length - 2] : null
  let desk = null
  if (cur.name === 'desktop') desk = cur
  else if (prev?.name === 'desktop' && ((cur.name === 'login' && t < cur.t0 + LOGIN_EXIT) || (cur.name === 'shutdown' && t < cur.t0 + COVER)))
    desk = prev
  const loginVisible =
    cur.name === 'login' ||
    (cur.name === 'desktop' && t < cur.t0 + LOGIN_EXIT) ||
    (cur.name === 'shutdown' && prev?.name === 'login' && t < cur.t0 + COVER)
  const enter = cur.name === 'login' && cur.from ? { t0: cur.t0, from: cur.from } : null
  const power = cur.name === 'shutdown' || cur.name === 'off' || cur.name === 'boot'
  const hover = cur.name === 'off' && !!last(t, (e) => e.type === 'power.hover' && e.t >= cur.t0)?.on
  return (
    <>
      {desk && <DesktopScene key={desk.t0} since={desk.t0} />}
      <LoginScene visible={loginVisible} enter={enter} />
      {power && <PowerScreens screen={cur} t={t} hover={hover} />}
    </>
  )
}

export default function App() {
  const [demo, setDemo] = useState(DEMO)
  useMemo(() => {
    if (DEMO) setLog(SCENARIO ? SCENARIO.map(({ frame, ...e }) => ({ ...e, t: frameTime(frame) })) : demoEvents())
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
        <Cursor path={demo ? (SCENARIO ? hiddenCursor : demoCursor) : null} />
      </Stage>
    </TimeProvider>
  )
}

// debugging / capture hooks
window.__lh = {
  seek,
  seekFrame: (n) => seek(((n - 1) * 1001) / 30000),
  log: getLog,
  emit, // debugging: drive the OS by hand, e.g. __lh.emit('session.logoff')
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
