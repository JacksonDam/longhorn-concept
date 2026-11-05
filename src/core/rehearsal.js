// The boot's warm-up script (core/boot.js): a session that shows everything the OS can show
// (the video's input, the desktop shell's own input, every registered app, the session screens)
// and the frames of it to draw. Drawing them once under the boot screen does every first-time
// cost the OS has (GPU pipeline compiles for each kind of content, compositing mode and WebGL
// program; texture uploads; image decodes at their drawn sizes; glyph rasterisation; the first
// run of each component's code; first style / layout of every tree) before the clock starts.
// Each frame drawn costs at least a display frame, so the list is kept short: the frames just
// after each event (mounts, the first frames of a motion, its motion-blur copies) and a settled
// one, the first of each kind of hover only.
//
// rehearsal() -> { log: [{ t, type, ...data }], frames: [video frame numbers, ascending],
//                  parts: [{ name, from }] (the first frame of each part: video, shell, apps, session) }
import { frameTime } from './clock.js'
import { demoEvents } from '../demo/index.js'
import { shellScenario } from '../demo/shell.js'
import { listApps } from '../os/apps.js'

// props the shell's own launchers pass (scenes/desktop/appInfo.jsx, os/ExplorerChrome.jsx),
// and for windows other apps open, what those apps pass
const PROPS = {
  ie: { url: 'www.msn.com' },
  im: { buddy: 'Hank' },
  slideshow: { auto: true },
  applet: { applet: 'network' },
  burncd: { what: 'music' },
  dialog: { title: 'Windows', text: 'Windows' },
}
const ID = { outlook: 'inbox', word: 'doc1', im: 'im:Hank' }

// frames to draw after an event, by type: its first frames (mounts, the start of a motion), the
// stretch where the motion-blur copies show, settled. ONCE: the first of a kind only.
const AFTER = {
  default: [1, 5, 14],
  'login.select': [1, 6, 18, 26],
  'login.submit': [1, 4],
  'music.open': [1, 3, 6, 12, 25],
  'win.open': [1, 3, 6, 12, 25],
  'win.close': [2, 6, 14],
  'music.minimize': [2, 5, 9],
  'win.restore': [2, 5, 9, 14],
  'music.restore': [2, 5, 9, 14],
  'music.album': [3],
  'shell.popup': [1, 4, 10],
  'desk.flyout': [2, 6, 12],
  'shell.sidebar': [2, 6],
  'ui.menu': [1, 4],
  'session.logoff': [1],
  'session.shutdown': [1, 40, 95],
  // the boot screen fading in, its blocks, the black, the login fading in
  'session.boot': [1, 20, 50, 70, 88, 92, 105, 125],
  'tb.press': [],
}
const ONE = new Set(['hover', 'login.hover', 'login.pw', 'media.play', 'media.next', 'media.pause', 'desk.flypress'])
const ONCE = new Set(['hover', 'login.hover', 'login.pw', 'media.next', 'media.pause', 'ui.menu', 'shell.sidebar'])
// frames of the video drawn besides those after its events: the tile flight, the long exit and
// entrance after the submit, the album flip (it starts 22 frames after the click), the end
const VIDEO_FRAMES = [1, 186, 194, 516, 523, 533, 545, 562, 580, 970, 978, 986, 995, 1529]

const BATCH = 12 // apps shown together (each window keeps a few composited layers while it shows)

// The window warm-up, kept apart so other window warm-ups (e.g. pre-building each app's
// motion-blur copy trees) can join it: every registered app, a batch at a time, opened and drawn
// settled (the open and close motions themselves are the shell part's window's), then closed.
// That is the first run of each app's code and its first style, layout and raster (the windows
// running since login are among them: Outlook, Word). Appends to the log `ev` and the frames to
// draw from video frame `f` on; returns the first frame after it.
export function rehearseWindows(f, ev, frames) {
  const apps = listApps().filter((a) => a.id !== 'music')
  for (let i = 0; i < apps.length; i += BATCH) {
    const batch = apps.slice(i, i + BATCH)
    for (const a of batch) ev.push({ type: 'win.open', id: ID[a.id] || 'warm.' + a.id, app: a.id, ...(PROPS[a.id] ? { props: PROPS[a.id] } : {}), t: frameTime(f) })
    frames.add(f + 40).add(f + 41)
    for (const a of batch) ev.push({ type: 'win.close', id: ID[a.id] || 'warm.' + a.id, t: frameTime(f + 42) })
    f += 72
  }
  frames.add(f)
  return f
}

export function rehearsal() {
  const ev = []
  const frames = new Set(VIDEO_FRAMES)
  const seen = new Set()
  const add = (e, frame) => {
    ev.push(e)
    const kind = e.type === 'login.hover' ? e.type + (e.big ? ':big' : '') : e.type
    if (ONCE.has(e.type) && seen.has(kind)) return
    seen.add(kind)
    // closing a popup or flyout: one frame
    const off = ONE.has(e.type) || e.open === false || e.open === null ? [1] : AFTER[e.type] || AFTER.default
    for (const d of off) frames.add(Math.round(frame + d))
  }
  const at = (frame, type, data = {}) => add({ ...data, type, t: frameTime(frame) }, frame)
  // 1. the video's input (login, desktop, flyout, my Music, album, minimise, restore)
  for (const e of demoEvents()) add(e, (e.t * 30000) / 1001 + 1)
  // 2. the desktop shell's scripted input after the video's end (Start menu, a window opening
  //    and closing with its taskbar button, the weather and calendar flyouts, sidebar hide /
  //    show, the media strip, the my Music flyout, the desktop menu, a taskbar restore)
  const SHELL0 = 1545
  const parts = [{ name: 'video', from: 0 }, { name: 'shell', from: SHELL0 }]
  for (const { frame, type, ...data } of shellScenario.filter((e) => e.frame >= 95 && e.frame < 400)) at(SHELL0 + frame - 95, type, data)
  let f = SHELL0 + 400 - 95
  parts.push({ name: 'apps', from: f })
  // 3. every registered app's window (rehearseWindows)
  f = rehearseWindows(f, ev, frames)
  // 4. the session screens: log off (back to the login screen), a second login, shut down from
  //    the desktop (the login screen fades to black), the off screen, boot (fading in)
  parts.push({ name: 'session', from: f })
  at(f, 'session.logoff')
  ev.push({ type: 'login.select', id: 'tommy', t: frameTime(f + 30) }, { type: 'login.submit', id: 'tommy', t: frameTime(f + 40) })
  at(f + 120, 'session.shutdown')
  at(f + 230, 'session.boot')
  return { log: ev.sort((a, b) => a.t - b.t), frames: [...frames].sort((a, b) => a - b), parts }
}
