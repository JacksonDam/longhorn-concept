// Interactive smoke test: drive the real (non-demo) app with CDP mouse/keyboard input at real
// speed, screenshot each step and report page errors and frame-time stats per step.
//
// usage: node tools/interact.mjs [--out out/interact] [--url http://127.0.0.1:5299/longhorn-concept/]
//        [--size 1280x960] [--dpr 1] [--uncapped]
// --uncapped: vsync and the frame-rate limit off (like bench.mjs), so each step's frame times
// are the frames' costs rather than the display's interval
// --size: the window's CSS size (default 1280x960, the frame's 4:3: the stage is the frame). At
// another shape the stage is wider or taller than the frame (core/Stage.jsx) and the script's
// frame coordinates move with what they hit: window buttons are found by their data-hit (the
// window's other targets move with it), the taskbar's My Music button by its text, the sidebar
// and its flyout follow the right edge (x + dw), the login screen is taken as centred
// (+ dw / 2, + dh / 2). The stage's geometry comes from #stage's data-s/x/y/w/h.
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i < 0 ? def : args[i + 1]
}
const out = opt('--out', 'out/interact')
const url = opt('--url', 'http://127.0.0.1:5299/longhorn-concept/')
mkdirSync(out, { recursive: true })
const [VW, VH] = opt('--size', '1280x960').split('x').map(Number)
const DPR = +opt('--dpr', 1)
const UNCAPPED = args.includes('--uncapped')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9300 + Math.floor(Math.random() * 400)
const profile = mkdtempSync(join(tmpdir(), 'lhint-'))
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
  `--force-device-scale-factor=${DPR}`, `--window-size=${VW},${VH}`, '--enable-gpu', '--ignore-gpu-blocklist',
  ...(UNCAPPED ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : []), 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let list
for (let i = 0; i < 80 && !list; i++) {
  await sleep(100)
  try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() } catch { /* not up */ }
}
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
let id = 0
const pending = {}
const events = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending[m.id]) pending[m.id](m)
  else if (m.method) events.push(m)
}
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id
    pending[i] = (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result))
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r.result?.value
}

let rect
// a frame coordinate -> client px; `at`: where the target is at the stage's shape (see --size)
const toClient = (x, y) => ({ x: rect.x + x * rect.s, y: rect.y + y * rect.s })
const RIGHT = [1, 0], CENTRE = [0.5, 0.5]
async function at(x, y, how) {
  if (!how || (!rect.dw && !rect.dh)) return [x, y]
  if (Array.isArray(how)) return [x + how[0] * rect.dw, y + how[1] * rect.dh]
  const p = await evaluate(`(${how})()`)
  if (p) return [p.x + (x - p.fx), p.y + (y - p.fy)]
  console.log(`  (no target found for ${x},${y}: the frame coordinates are kept)`)
  return [x, y]
}
// the my Music window's title-bar buttons (the window's own targets move with it): the button's
// stage position, with the frame position the script has for it
const winBtn = (type, fx, fy) => `() => {
  const st = document.getElementById('stage'), s = +st.dataset.s, b = st.getBoundingClientRect()
  const e = [...document.querySelectorAll('[data-hit="${type}"]')].find((e) => e.getBoundingClientRect().width > 0)
  if (!e) return null
  const r = e.getBoundingClientRect()
  return { x: (r.left - b.left) / s + 8, y: (r.top - b.top) / s + 9, fx: ${fx}, fy: ${fy} }
}`
// the taskbar button with this label (the bottom 40 stage px)
const taskBtn = (label, fx, fy) => `() => {
  const st = document.getElementById('stage'), s = +st.dataset.s, b = st.getBoundingClientRect()
  for (const e of document.querySelectorAll('#stage *')) {
    if (e.children.length || e.textContent.trim() !== ${JSON.stringify(label)}) continue
    const r = e.getBoundingClientRect()
    const y = (r.top + r.height / 2 - b.top) / s
    if (r.width > 0 && y > +st.dataset.h - 40) return { x: (r.left + r.width / 2 - b.left) / s, y, fx: ${fx}, fy: ${fy} }
  }
  return null
}`
async function move(x, y, steps = 12, how) {
  ;[x, y] = await at(x, y, how)
  const to = toClient(x, y)
  for (let i = 1; i <= steps; i++) {
    const k = i / steps
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k })
    await sleep(16)
  }
  from = to
}
async function click(x, y, how) {
  ;[x, y] = await at(x, y, how)
  await move(x, y)
  const p = toClient(x, y)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 })
  await sleep(60)
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 })
}
async function key(k, code = k, text) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, text, windowsVirtualKeyCode: k === 'Enter' ? 13 : k.toUpperCase().charCodeAt(0) })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: k === 'Enter' ? 13 : k.toUpperCase().charCodeAt(0) })
}
let from = { x: 0, y: 0 }
let shotN = 0
async function shot(name) {
  const s = await send('Page.captureScreenshot', { format: 'png' })
  const f = join(out, `${String(++shotN).padStart(2, '0')}-${name}.png`)
  writeFileSync(f, Buffer.from(s.data, 'base64'))
  const st = await evaluate(`(() => { const a = window.__ft.splice(0); a.sort((p, q) => p - q);
    return a.length ? { n: a.length, avg: a.reduce((p, q) => p + q, 0) / a.length, p95: a[Math.floor(a.length * 0.95)], max: a[a.length - 1] } : null })()`)
  console.log(`${f}  frames ${st?.n} avg ${st?.avg?.toFixed(1)} ms p95 ${st?.p95?.toFixed(1)} max ${st?.max?.toFixed(1)}`)
}

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: DPR, mobile: false })
  await send('Page.navigate', { url })
  for (let i = 0; i < 150 && !events.some((e) => e.method === 'Page.loadEventFired'); i++) await sleep(100)
  // the bundle may still be running after the load event: wait for the app's hooks, then for
  // the boot (real time: the clock starts once everything is loaded and warmed up)
  for (let i = 0; i < 300 && !(await evaluate('!!window.__lh')); i++) await sleep(100)
  await evaluate('window.__lh.ready()')
  await evaluate(`(() => { window.__ft = []; let l = performance.now(); const f = () => { const n = performance.now(); window.__ft.push(n - l); l = n; requestAnimationFrame(f) }; requestAnimationFrame(f) })()`)
  // the stage's corner and scale, and how much wider / taller than the frame it is
  const r = await evaluate(`(() => { const e = document.getElementById('stage'), b = e.getBoundingClientRect(), d = e.dataset
    return d.s ? { x: b.x, y: b.y, s: +d.s, dw: d.w - 960, dh: d.h - 720, mode: d.mode } : { x: b.x, y: b.y, s: b.width / 960, dw: 0, dh: 0 } })()`)
  rect = r
  console.log(`window ${VW}x${VH} at DPR ${DPR}: stage scale ${r.s.toFixed(4)}${r.mode ? ' (' + r.mode + ')' : ''}, ${960 + r.dw}x${720 + r.dh} stage px`)
  from = toClient(...(await at(950, 600, CENTRE)))
  await sleep(1500)
  await shot('login')
  await move(563, 634, 12, CENTRE)
  await sleep(700)
  await shot('hover-tommy')
  await click(462, 634, CENTRE)
  await sleep(1800)
  await shot('selected-sondra')
  for (const c of 'secret') await key(c, 'Key' + c.toUpperCase(), c), await sleep(90)
  await sleep(300)
  await shot('password')
  await key('Enter', 'Enter', '\r')
  await sleep(3500)
  await shot('desktop')
  await click(873, 268, RIGHT)
  await sleep(1200)
  await shot('flyout')
  await click(786, 484, RIGHT)
  await sleep(3500)
  await shot('my-music')
  await click(405, 480, winBtn('win.minimize', 771, 33))
  await sleep(2500)
  await shot('album')
  await click(771, 33, winBtn('win.minimize', 771, 33)) // title-bar minimise
  await sleep(1800)
  await shot('minimised')
  await click(460, 710, taskBtn('My Music', 460, 710)) // taskbar My Music button
  await sleep(1800)
  await shot('restored')
  await click(805, 33, winBtn('win.close', 805, 33)) // title-bar close
  await sleep(1800)
  await shot('closed')
  const log = await evaluate('window.__lh.log().map(e => e.type + (e.id != null ? ":" + e.id : ""))')
  console.log('events:', log.join(', '))
  for (const e of events.filter((e) => e.method === 'Runtime.exceptionThrown'))
    console.error('page error:', e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text)
  for (const e of events.filter((e) => e.method === 'Runtime.consoleAPICalled' && (e.params.type === 'error' || e.params.type === 'warning')))
    console.error('console.' + e.params.type + ':', e.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300))
} finally {
  ws.close()
  chrome.kill()
  await sleep(200)
  rmSync(profile, { recursive: true, force: true })
}
