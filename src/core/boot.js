// Boot (real time, ?demo included; never under ?capture / ?bench): the OS's clock starts only
// once everything it can show has been loaded and drawn once, so first-time costs don't land on
// animation frames. Until then the screen is the session's black layer, held nearly opaque
// (App.jsx), and the clock is held (core/clock.js).
//
//  1. assets: every font face (the CSS @font-face rules load only when text first uses them),
//     every file under public/img fetched and decoded (virtual:boot-assets, vite.config.js), the
//     scenes' other registered assets (preload.js: aurora keys, the halo) and the slab textures.
//     The login screen is mounted and drawn under the black meanwhile.
//  2. rehearsal (core/rehearsal.js): a scripted session (the video's input, the desktop shell,
//     every app, the session screens) drawn state by state under the black. That is where a new
//     machine pays its first-time costs: the GPU compiles a pipeline for each new kind of draw,
//     compositing mode and WebGL program (on a cold shader cache tens to hundreds of ms each,
//     ~160 of them for the login-to-my-Music path), textures upload, images decode at their
//     drawn sizes, glyphs rasterise, and each component's code runs, styles and lays out for
//     the first time.
//  3. the start log (the real OS: 'session.boot' at t = 0, so the login screen fades in from
//     black; ?demo: the video's input) and the clock starts at t = 0.
//
// How much is rehearsed: everything on a browser's first boot of this build (and after a browser
// update); later boots, whose GPU pipelines are cached on disk (the profile's and the system's
// shader caches), rehearse the video's path only (per-session costs: first runs of code, first
// layouts and rasters). ?rehearse=all|video|none overrides it. A deadline keeps a very slow or
// brand-new machine (empty system shader cache: a full rehearsal there takes ~14 s on an M4)
// or a broken asset from holding the boot: what isn't done by then happens on first use.
// ?boottrace records each rehearsed state (bootStats.trace).
import ASSETS from 'virtual:boot-assets'
import { asset, preload, preloaded } from './preload.js'
import { seek, startClock, frameTime } from './clock.js'
import { setLog } from './events.js'
import { texturesReady } from '../gl/slab.js'
import { rehearsal } from './rehearsal.js'
import { PHOTOS, CAMERA_PHOTOS } from '../apps/lib/pictures.jsx'

const LIMIT = 8000 // ms from the boot's start
const params = new URLSearchParams(location.search)
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(performance.now())))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ms from the boot's start (fonts, images, total), ms per rehearsal part (video, shell, apps,
// session), states drawn; level: what was rehearsed
export const bootStats = { level: null, assets: 0, rehearsal: 0, frames: 0, total: 0, timedOut: false, trace: params.has('boottrace') ? [] : null }

// the first boot of this build in this browser rehearses everything (storage off: every boot)
const KEY = 'longhorn.boot'
const BUILD = import.meta.url + ' ' + navigator.userAgent
function level() {
  const p = params.get('rehearse')
  if (p === 'all' || p === 'video' || p === 'none') return p
  try {
    return localStorage.getItem(KEY) === BUILD ? 'video' : 'all'
  } catch {
    return 'all'
  }
}
function remember() {
  try {
    localStorage.setItem(KEY, BUILD)
  } catch {
    /* storage off */
  }
}

// fonts and files first (the rehearsal's first states need them); the generated stand-in photos
// (rasterised to JPEG blobs on first use, ~0.3 s of main-thread work) start after them and only
// the apps part waits for them
async function loadAssets() {
  const t0 = performance.now()
  const lap = (k) => (bootStats[k] = Math.round(performance.now() - t0))
  preload(ASSETS.map(asset))
  await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})))
  await document.fonts.ready
  lap('fonts')
  await preloaded()
  await texturesReady()
  lap('images')
  for (const p of PHOTOS) void p.url
  for (const p of CAMERA_PHOTOS) void p.url
}

// GPU fence: one pixel read back from a tiny WebGL context returns once the GPU process has run
// what was queued before it, i.e. once it is no longer busy (compiling pipelines) with an earlier
// frame. About a millisecond when the GPU keeps up.
let fenceGl = null
function gpuFence() {
  if (fenceGl === null) fenceGl = document.createElement('canvas').getContext('webgl2', { antialias: false, depth: false, stencil: false }) || false
  if (!fenceGl) return
  fenceGl.clear(fenceGl.COLOR_BUFFER_BIT)
  fenceGl.readPixels(0, 0, 1, 1, fenceGl.RGBA, fenceGl.UNSIGNED_BYTE, new Uint8Array(4))
}

let aborted = false
async function rehearse(lvl, deadline) {
  if (lvl === 'none') return true
  const { log, frames: all, parts } = rehearsal()
  const frames = lvl === 'video' ? all.filter((f) => f < parts[1].from) : all
  setLog(log)
  // Each state is set at the start of an animation frame, so that frame draws it, and the next
  // one only once the GPU has caught up: a state the compositor never started drawing (still busy
  // with an earlier one, compiling its pipelines) would be dropped for the next, and its
  // pipelines would compile on first use later.
  let part = -1, t = performance.now()
  for (const f of frames) {
    if (performance.now() > deadline || aborted) return false
    if (part + 1 < parts.length && f >= parts[part + 1].from) {
      if (part >= 0) bootStats[parts[part].name] = Math.round(performance.now() - t)
      part++
      t = performance.now()
      if (parts[part].name === 'apps') await preloaded()
    }
    await nextFrame()
    if (aborted) return false
    const g0 = performance.now()
    gpuFence()
    const wait = Math.round(performance.now() - g0)
    seek(frameTime(f))
    bootStats.frames++
    // ?boottrace: [video frame, performance.now() when it was set, ms the fence before it waited]
    if (bootStats.trace) bootStats.trace.push([f, Math.round(performance.now()), wait])
  }
  await nextFrame()
  gpuFence()
  if (part >= 0) bootStats[parts[part].name] = Math.round(performance.now() - t)
  return true
}

export async function boot(startLog) {
  const t0 = performance.now()
  const lvl = (bootStats.level = level())
  const work = (async () => {
    await loadAssets()
    bootStats.assets = Math.round(performance.now() - t0)
    const done = await rehearse(lvl, t0 + LIMIT)
    bootStats.rehearsal = Math.round(performance.now() - t0 - bootStats.assets)
    // anything the rehearsal started (pictures it showed) finishes too
    await preloaded()
    return done
  })()
  const done = await Promise.race([work, sleep(LIMIT + 500).then(() => false)])
  aborted = true
  bootStats.timedOut = !done
  if (done && lvl === 'all') remember()
  setLog(startLog)
  seek(0)
  await nextFrame()
  await nextFrame()
  bootStats.total = Math.round(performance.now() - t0)
  startClock()
}
