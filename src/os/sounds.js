// System sounds: the Longhorn / Vista-beta sound scheme (public/sounds, tools/sounds/encode.py),
// played for the OS's own events the way Windows maps them (docs/sounds.md has the table).
//
// Only in real use: never under ?capture, ?bench, ?demo or ?scenario (the video has no sound),
// and only for events appended to the log while the clock runs, as they happen: a log that is
// replaced (the boot's start log, a tool restoring a state) or an event stamped in the past plays
// nothing, so replaying a log is silent. The startup sound is the one timed sound: it plays when
// the welcome screen starts to appear after a boot (os/session.js), or not at all if that moment
// has passed.
//
// Playback is Web Audio: one AudioContext, created and resumed in the first user gesture (the
// power button's press, index.html; else the first pointer or key press), which Safari / iOS and
// Chrome's autoplay policy require. A sound asked for before the context runs (no gesture yet)
// is dropped, never played late. Files are fetched and decoded (off the main thread) once the
// context exists, the startup sound first; decoded they are ~10 MB in all (26 s of stereo), kept
// for the session so a click's sound starts at once. The output goes through one gain node: the
// Sounds and Audio Devices applet's volume and mute (apps/applet, 'sys.volume' / 'sys.mute').
import { CAPTURE, clockRunning, now, onFrame } from '../core/clock.js'
import { onEvents, getLog, getEpoch } from '../core/events.js'
import { asset } from '../core/preload.js'
import { lastOf } from '../ui/state.js'
import { screens, bootScreenDur } from './session.js'
import { getWindow } from './wm.js'

const q = new URLSearchParams(location.search)
export const SOUNDS_ON = !CAPTURE && !q.has('demo') && !q.has('scenario')
// ?sounds=load (a measurement, e.g. tools/memory.mjs --query sounds=load): fetch and decode every
// sound at load, in any mode, without playing one (decoding needs no gesture)
const LOAD_ALL = q.get('sounds') === 'load'

// the files (public/sounds/<name>.m4a), in the order they are fetched
const NAMES = ['SystemStart', 'WindowsLogon', 'SystemAsterisk', 'SystemExclamation', 'SystemHand', 'Default', 'EmptyRecycleBin', 'WindowsLogoff', 'SystemExit']
// a message box's icon -> its sound (MessageBox: the icon picks the system sound; the question
// mark's "Question" event has none by default; one with its own icon, e.g. the CD prompt, plays
// the default beep as MB_OK does)
const BOX = { info: 'SystemAsterisk', warning: 'SystemExclamation', error: 'SystemHand', cd: 'Default' }

// the system volume (the applet's slider and Mute box; session-wide 'ui.value's, as Windows' is)
export const VOLUME = 'sys.volume'
export const MUTE = 'sys.mute'
export const DEFAULT_VOLUME = 0.7
export function systemVolume(t) {
  const v = lastOf(t, 'ui.value', VOLUME)
  const m = lastOf(t, 'ui.value', MUTE)
  return { volume: v ? v.value : DEFAULT_VOLUME, mute: m ? !!m.value : false }
}

// ---- playback ---------------------------------------------------------------------------------
let ctx = null
let out = null
const buffers = new Map() // name -> AudioBuffer | Promise
// what the console / a test harness can read: [{ name, at (performance.now()), t (clock), event }]
export const played = []
const LATE = 250 // ms: a sound that can't start within this of its moment is dropped

function context() {
  if (ctx) return ctx
  const C = window.AudioContext || window.webkitAudioContext
  if (!C) return null
  // the power button's press made one inside its gesture (index.html)
  ctx = window.__lhPower?.audio || new C()
  out = ctx.createGain()
  out.connect(ctx.destination)
  applyVolume()
  loadAll()
  return ctx
}
function applyVolume() {
  if (!out) return
  const { volume, mute } = systemVolume(now())
  out.gain.value = mute ? 0 : volume
}

function load(name) {
  let b = buffers.get(name)
  if (!b) {
    b = fetch(asset(`sounds/${name}.m4a`))
      .then((r) => r.arrayBuffer())
      .then((data) => new Promise((res, rej) => ctx.decodeAudioData(data, res, rej)))
      .then((buf) => (buffers.set(name, buf), buf))
      .catch(() => (buffers.delete(name), null))
    buffers.set(name, b)
  }
  return b
}
// one file at a time, in the background
async function loadAll() {
  for (const n of NAMES) await load(n)
}

// play `name` now (or drop it when it can't start within LATE ms; before any gesture there is
// no context: nothing plays)
function play(name, event) {
  const c = ctx
  if (!c) return
  const asked = performance.now()
  const start = (buf) => {
    if (!buf || c.state !== 'running' || performance.now() - asked > LATE) return
    const s = c.createBufferSource()
    s.buffer = buf
    s.connect(out)
    s.start()
    played.push({ name, at: performance.now(), t: now(), event })
    if (played.length > 200) played.shift()
  }
  if (c.state !== 'running') c.resume?.().catch(() => {})
  const b = buffers.get(name)
  if (b && !(b instanceof Promise)) {
    if (c.state === 'running') start(b)
    else Promise.resolve().then(() => start(b))
  } else load(name).then(start)
}

// ---- unlocking ----------------------------------------------------------------------------------
// The first gesture creates (or resumes) the context. Engines differ in which events count as one
// (iOS: the end of a touch, a click); each is tried until the context runs.
function unlock() {
  const c = context()
  if (!c) return
  if (c.state === 'running') return done()
  c.resume?.().then(() => c.state === 'running' && done(), () => {})
}
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']
function done() {
  for (const g of GESTURES) removeEventListener(g, unlock, true)
}

// ---- the events ---------------------------------------------------------------------------------
// the sound an appended event plays, from the state it leaves (os/session.js, os/wm.js)
function soundFor(e) {
  switch (e.type) {
    case 'login.submit':
    case 'session.logoff':
    case 'session.shutdown': {
      const s = screens(e.t)
      const cur = s[s.length - 1]
      if (cur.t0 !== e.t) return null // not accepted (e.g. a second submit)
      if (cur.name === 'desktop') return 'WindowsLogon'
      if (cur.name === 'login' && e.type === 'session.logoff') return 'WindowsLogoff'
      if (cur.name === 'shutdown') return 'SystemExit'
      return null
    }
    case 'win.open': {
      const w = getWindow(e.t, e.id)
      return w && w.app === 'dialog' && w.openedAt === e.t ? BOX[w.props?.icon || 'info'] || null : null
    }
    case 'fs.delete':
      // a file or folder sent to the Recycle Bin (the shell plays the recycle sound)
      return 'EmptyRecycleBin'
    case 'ui.value':
      if (e.id === VOLUME || e.id === MUTE) applyVolume()
      return null
    default:
      return null
  }
}

// a boot's welcome screen: when it starts to appear (the black fading out, os/session.js)
let welcome = null // { at (clock s) }
function bootStarted(e) {
  const s = screens(e.t)
  const cur = s[s.length - 1]
  if (cur.name === 'boot' && cur.t0 === e.t) welcome = { at: e.t + bootScreenDur(cur) }
}

// (for test harnesses: what played, the context, the decoded sounds)
if (SOUNDS_ON || LOAD_ALL) window.__lhSounds = { played, context: () => ctx, decoded: () => [...buffers.values()].filter((b) => b && !(b instanceof Promise)).length }
if (LOAD_ALL) context()

if (SOUNDS_ON) {
  for (const g of GESTURES) addEventListener(g, unlock, true)
  // the press of the page's power button (it may come before this module has loaded)
  window.__lhPower?.done.then(() => context())
  let epoch = getEpoch()
  let seen = getLog().length
  onEvents(() => {
    const log = getLog()
    if (getEpoch() !== epoch) {
      // replaced (or an event inserted before the end): nothing in it plays
      epoch = getEpoch()
      seen = log.length
      return
    }
    for (; seen < log.length; seen++) {
      const e = log[seen]
      if (!clockRunning() || e.t < now() - LATE / 1000) continue
      if (e.type === 'session.boot') bootStarted(e)
      const name = soundFor(e)
      if (name) play(name, e.type)
    }
  })
  // the startup sound: the page's own boot (its start log begins with 'session.boot' at t = 0:
  // the welcome screen fades in as the clock starts) and the off screen's power button
  let started = false
  onFrame((t) => {
    if (!clockRunning()) return
    if (!started) {
      started = true
      const first = getLog()[0]
      if (first && first.type === 'session.boot' && first.t <= 0) welcome = { at: 0 }
    }
    if (welcome && t >= welcome.at) {
      const late = t - welcome.at > LATE / 1000
      welcome = null
      if (!late) play('SystemStart', 'welcome')
    }
  })
}
