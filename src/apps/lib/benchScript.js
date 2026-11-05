// ?apps=<name>: a demo-like event list for the apps, appended after the video's input (frames
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
  return ev
}

if (NAME) {
  // App.jsx installs the demo log at start-up; add the script once that has happened
  let done = false
  const add = () => {
    if (done) return
    const log = getLog()
    if (!log.some((e) => e.type === 'login.submit')) return
    done = true
    for (const { f, type, ...data } of script(NAME)) emit(type, data, frameTime(f))
  }
  onEvents(add)
  queueMicrotask(add)
}
