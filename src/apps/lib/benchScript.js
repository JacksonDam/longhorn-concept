// ?apps=<name> ('all', 'pictures', 'mail', 'ie', 'word', 'media', 'opens', 'focus', 'every'): a demo-like event list for the apps, appended after the video's input (frames
// 1530+), so tools/bench.mjs and tools/capture.mjs can step and measure the apps' windows on the
// ?capture path:  node tools/bench.mjs 1530-1960 --url "http://localhost:5304/longhorn-concept/?apps=all"
import { onEvents, getLog, emit } from '../../core/events.js'
import { frameTime } from '../../core/clock.js'

const params = new URLSearchParams(location.search)
const NAME = params.get('apps')

const LOGIN = 510 // the video's login.submit frame: the running-at-login windows open then
const wid = (id, openFrame, name) => `${id}@${frameTime(openFrame)}/${name}`

function script(name) {
  const ev = []
  const at = (f, type, data) => ev.push({ f, type, ...data })
  if (name === 'all' || name === 'pictures') {
    at(1540, 'win.open', { id: 'pictures', app: 'pictures' })
    at(1575, 'ui.value', { id: wid('pictures', 1540, 'size'), value: 0.7 })
    at(1585, 'ui.value', { id: wid('pictures', 1540, 'grid') + ':scroll', value: 120 })
    at(1590, 'ui.value', { id: wid('pictures', 1540, 'photo'), value: 'ridge-5' })
    at(1592, 'ui.value', { id: wid('pictures', 1540, 'view'), value: 'detail' })
    at(1605, 'win.open', { id: 'slideshow', app: 'slideshow', props: { auto: true } })
    at(1650, 'win.close', { id: 'slideshow' })
    at(1660, 'win.minimize', { id: 'pictures' })
  }
  if (name === 'all' || name === 'mail') {
    at(1670, 'win.open', { id: 'inbox', app: 'outlook', props: { message: 'Hello' } })
    at(1700, 'ui.menu', { id: wid('inbox', LOGIN, 'm') + '.menubar', open: 'file', x: 60, y: 130 })
    at(1712, 'ui.menu', { id: wid('inbox', LOGIN, 'm') + '.menubar', open: null })
    at(1716, 'ui.value', { id: wid('inbox', LOGIN, 'list:inbox') + ':sel', value: { keys: ['m3'], anchor: 'm3' } })
  }
  if (name === 'all' || name === 'ie') {
    at(1725, 'win.open', { id: 'ie', app: 'ie', props: { url: 'www.ofoto.com' } })
    at(1760, 'ie.refresh', { id: 'ie' })
  }
  if (name === 'all' || name === 'word') {
    at(1790, 'win.open', { id: 'doc1', app: 'word' })
    at(1825, 'ui.focus', { id: 'kbd', field: wid('doc1', LOGIN, 'doc') })
    at(1826, 'ui.value', { id: wid('doc1', LOGIN, 'sel'), value: { a: 0, b: 7 } })
  }
  if (name === 'all' || name === 'media') {
    at(1840, 'win.open', { id: 'winamp', app: 'winamp' })
    at(1845, 'media.play', {})
    at(1880, 'win.open', { id: 'im:Hank', app: 'im', props: { buddy: 'Hank' } })
    at(1910, 'im.send', { id: 'im:Hank', buddy: 'Hank', text: 'Are we still on for Saturday?' })
    at(1920, 'win.close', { id: 'im:Hank' })
    at(1935, 'win.minimize', { id: 'winamp' })
  }
  if (name === 'focus') {
    // focus switches between overlapping windows (the active / inactive cross-fade, os/focus.js):
    // three windows over my Music, clicks between them, then the active one minimised, restored
    // and closed (each hands the active look over), frames 1540-1800
    at(1540, 'win.open', { id: 'inbox', app: 'outlook', props: { message: 'Hello' } })
    at(1560, 'win.open', { id: 'ie', app: 'ie', props: { url: 'www.msn.com' } })
    at(1580, 'win.move', { id: 'ie', x: 250, y: 150 })
    at(1590, 'win.open', { id: 'calc', app: 'calc' })
    const order = ['inbox', 'music', 'ie', 'calc', 'inbox', 'ie', 'music', 'calc']
    order.forEach((id, i) => at(1620 + i * 12, 'win.focus', { id }))
    at(1720, 'win.minimize', { id: 'calc' })
    at(1745, 'win.restore', { id: 'calc' })
    at(1770, 'win.close', { id: 'calc' })
    at(1790, 'win.focus', { id: 'inbox' })
  }
  if (name === 'every') {
    // every registered app in turn (EVERY, below): opens, settles, minimises, restores,
    // maximises, restores down and closes, one app per EVERY_SLOT frames from 1540 (EVERY_AT:
    // open f, minimise f + 40, restore f + 60, maximise f + 90, restore down f + 110, close
    // f + 150); tools/appbench.mjs prints the cost of each phase per app. my Music (the video's
    // window, open since its restore) is closed before the video's end, so its slot opens it anew.
    at(1505, 'win.close', { id: 'music' })
    EVERY.forEach(([app, id, props], i) => {
      const f = 1540 + i * EVERY_SLOT
      at(f + EVERY_AT.open, 'win.open', props ? { id, app, props } : { id, app })
      at(f + EVERY_AT.minimise, 'win.minimize', { id })
      at(f + EVERY_AT.restore, 'win.restore', { id })
      at(f + EVERY_AT.maximise, 'win.maximize', { id })
      at(f + EVERY_AT.unmaximise, 'win.unmaximize', { id })
      at(f + EVERY_AT.close, 'win.close', { id })
    })
  }
  if (name === 'opens') {
    // each heavy app opens, settles and closes: frames 1540-1540+7*60
    const list = [['pictures', 'pictures'], ['outlook', 'inbox', { message: 'Hello' }], ['ie', 'ie', { url: 'www.msn.com' }], ['im', 'im:Hank', { buddy: 'Hank' }], ['word', 'doc1'], ['programs', 'programs'], ['documents', 'documents']]
    list.forEach(([app, id, props], i) => {
      const f = 1540 + i * 60
      at(f, 'win.open', props ? { id, app, props } : { id, app })
      at(f + 45, 'win.close', { id })
    })
  }
  return ev
}

// A user's pointer reaches the minimise, close or taskbar button before it clicks: each scripted
// minimise, restore and close gets the 'win.prepare' that pointer would make, PREP frames before,
// or as soon as the window's previous animation has played (os/PlexWindow residency: the
// window's motion-blur copies grow from it, three steps a copy, a step a frame)
const PREP = 32
const PREPARED = new Set(['win.minimize', 'win.restore', 'win.close'])
const PLAYS = { 'win.open': 26, 'win.minimize': 11, 'win.restore': 11, 'win.close': 15, 'win.maximize': 8, 'win.unmaximize': 8 } // frames (incl. delays)
export function withPrepares(ev, at = 'f') {
  const out = [...ev]
  const last = new Map() // window id -> end of its latest animation (frame)
  for (const e of [...ev].sort((a, b) => a[at] - b[at])) {
    if (PREPARED.has(e.type)) out.push({ [at]: Math.max(e[at] - PREP, (last.get(e.id) ?? -Infinity) + 0.5), type: 'win.prepare', id: e.id })
    if (PLAYS[e.type]) last.set(e.id, e[at] + PLAYS[e.type])
  }
  return out.sort((a, b) => a[at] - b[at])
}

// ?apps=every: frames per app and each phase's event frame in its slot (tools/appbench.mjs reads them)
export const EVERY_SLOT = 180
export const EVERY_AT = { open: 0, minimise: 40, restore: 60, maximise: 90, unmaximise: 110, close: 150 }
// [app, window id, props] (the ids and props the shell's launchers use)
export const EVERY = [
  ['music', 'music'], ['about', 'about'], ['acquire', 'acquire'], ['album', 'album'], ['applet', 'applet', { applet: 'network' }], ['autoplay', 'autoplay'],
  ['burncd', 'burncd', { what: 'music' }], ['calc', 'calc'], ['charmap', 'charmap'], ['compose', 'compose:1', { mode: 'new' }], ['computer', 'computer'],
  ['control', 'control'], ['dialog', 'dialog:x', { title: 'Windows', text: 'Windows' }], ['display', 'display'], ['documents', 'documents'], ['help', 'help'],
  ['ie', 'ie', { url: 'www.msn.com' }], ['im', 'im:Hank', { buddy: 'Hank' }], ['notepad', 'notepad'], ['outlook', 'inbox', { message: 'Hello' }], ['paint', 'paint'],
  ['picedit', 'picedit'], ['pictures', 'pictures'], ['playlist', 'playlist'], ['programs', 'programs'], ['run', 'run'], ['search', 'search'],
  ['sharemusic', 'sharemusic'], ['solitaire', 'solitaire'], ['winamp', 'winamp'], ['word', 'doc1'],
]

if (NAME) {
  // App.jsx installs the demo log at start-up; add the script once that has happened
  let done = false
  const add = () => {
    if (done) return
    const log = getLog()
    if (!log.some((e) => e.type === 'login.submit')) return
    done = true
    for (const { f, type, ...data } of withPrepares(script(NAME))) emit(type, data, frameTime(f))
  }
  onEvents(add)
  queueMicrotask(add)
}
