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
import { ErrorBoundary } from './os/ErrorBoundary.jsx'
import { getVersion } from './core/events.js'
import { OffScreen, Black, blackLevel } from './scenes/session/PowerScreens.jsx'
import { screen } from './os/session.js'
import { emit } from './core/events.js'
import { frameTime } from './core/clock.js'
import { sessionScenario } from './demo/session.js'
import { shellScenario } from './demo/shell.js'
import { boot, bootStats } from './core/boot.js'

const params = new URLSearchParams(location.search)
const DEMO = CAPTURE || params.has('demo')
// ?scenario=session replaces the video's input with the scripted session flows (demo/session.js),
// for stepping and benchmarking the log off / switch user / shut down / boot transitions
// ?scenario=shell: the desktop shell's own scripted input (demo/shell.js)
const SCENARIO = { session: sessionScenario, shell: shellScenario }[params.get('scenario')] || null
const hiddenCursor = () => ({ hidden: true })

// the log the clock starts with: the demo's input, or the real OS, which boots (its login screen
// fades in from black, os/session.js)
const startLog = () =>
  DEMO ? (SCENARIO ? SCENARIO.map(({ frame, ...e }) => ({ ...e, t: frameTime(frame) })) : demoEvents()) : [{ type: 'session.boot', t: 0 }]

// Real time (?demo included) boots first (core/boot.js): the clock is held while every asset
// loads and the boot's warm-up draws everything once, under the session's own black layer (the
// one the boot fades out) held at 0.999: nearly opaque, because an opaque layer would let the
// compositor skip drawing what is under it, and drawing it is the point (0.1% of the warm-up
// shows through, below one 8-bit level). The same element as the boot fade, so the warm-up's
// layers are the ones the fade-in draws (a separate cover changed them enough for the GPU to
// compile new pipelines on the first fade frames). Capture never boots.
const BOOT = !CAPTURE
let booted = !BOOT
const bootDone = new Set()
const BOOT_BLACK = 0.999
function useBooted() {
  const [b, setB] = useState(booted)
  useEffect(() => {
    if (booted) return setB(true)
    bootDone.add(setB)
    return () => bootDone.delete(setB)
  }, [])
  return b
}
if (BOOT)
  boot(startLog()).then(() => {
    booted = true
    for (const fn of bootDone) fn(true)
  })

// Scene flow (os/session.js), after the two reference videos: login -> desktop (submit, the
// element-wise login exit over the desktop); log off / switch user: a hard cut back to the login
// screen; shut down (login or desktop): the login screen fades to black, then the off screen;
// its power button boots: the login screen fades in from black.
function Scenes() {
  const t = useTime()
  useEvents()
  const cur = screen(t)
  const desk = cur.name === 'desktop' ? cur : null
  const loginVisible = cur.name !== 'off' && (cur.name !== 'desktop' || t < cur.t0 + LOGIN_EXIT)
  const booting = !booted
  const black = Math.max(blackLevel(cur, t), booting ? BOOT_BLACK : 0)
  const hover = cur.name === 'off' && !!last(t, (e) => e.type === 'power.hover' && e.t >= cur.t0)?.on
  return (
    <>
      {/* the desktop stays mounted (pre-mounted under the login screen from the first frame, so a
          login doesn't mount it on the submit frame); between sessions it waits with since =
          Infinity (nothing of the shell shows) and its state is scoped to the session start */}
      <ErrorBoundary name="Windows Explorer" resetKey={getVersion()}>
        <DesktopScene since={desk ? desk.t0 : Infinity} user={desk ? desk.user : null} />
      </ErrorBoundary>
      <LoginScene visible={loginVisible} />
      {cur.name === 'off' && <OffScreen t0={cur.t0} t={t} hover={hover} />}
      {(cur.name !== 'off' || booting) && <Black level={black} block={booting || cur.name === 'shutdown' || cur.name === 'boot'} />}
    </>
  )
}

export default function App() {
  const [demo, setDemo] = useState(DEMO)
  const isBooted = useBooted()
  useMemo(() => {
    if (CAPTURE) setLog(startLog())
  }, [])
  useEffect(() => {
    if (!demo || CAPTURE || !isBooted) return
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
  }, [demo, isBooted])
  return (
    <TimeProvider>
      <Stage>
        <Scenes />
        {/* ?demo: no demo cursor while the boot rehearses (it would follow the rehearsal's times) */}
        <Cursor path={demo ? (SCENARIO || !isBooted ? hiddenCursor : demoCursor) : null} />
      </Stage>
    </TimeProvider>
  )
}

// debugging / capture hooks
window.__lh = {
  seek,
  seekFrame: (n) => seek(((n - 1) * 1001) / 30000),
  log: getLog,
  setLog, // tools/audit.mjs restores a scenario by restoring its event log
  emit, // debugging: drive the OS by hand, e.g. __lh.emit('session.logoff')
  now,
  bench: runBench,
  // resolves once React has committed the frame for the current clock time
  rendered: () =>
    new Promise((resolve) => {
      const check = () => (lastRenderedTime() === now() ? resolve(true) : requestAnimationFrame(check))
      check()
    }),
  // real time: false until the boot is done and the clock runs (bootStats: its timings in ms)
  get booted() {
    return booted
  },
  bootStats,
  // resolves once fonts, <img> elements, preloaded images and slab textures are decoded
  // (real time: once the boot is done)
  ready: async () => {
    if (BOOT) await new Promise((r) => (booted ? r() : bootDone.add(r)))
    await document.fonts.ready
    await preloaded()
    await Promise.all(
      [...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))),
    )
    await texturesReady()
    return true
  },
}
