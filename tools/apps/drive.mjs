// Scripted interactive test of the apps / UI kit on the ?capture path: the clock only moves when
// the script seeks, real CDP mouse and keyboard input lands at the seeked time, screenshots are
// exact frames. Usage:
//   node tools/apps/drive.mjs <script.mjs> [--out out/drive] [--url http://localhost:5204/longhorn-concept/?capture]
// The script default-exports an array of steps (stage px = page px under ?capture):
//   { f: 1540 }                     seek to video frame 1540 (later frames run past the video's end)
//   { eval: "js" }                  evaluate in the page (window.__wm.emit(type, data, t) etc.)
//   { open: 'outlook', id?, props?} win.open at the current frame
//   { move: [x, y] } { down: [x, y], button? } { up: [x, y] } { click: [x, y], button?, count? }
//   { dbl: [x, y] } { wheel: [x, y, dy] } { type: 'text' } { key: 'Enter' | 'Backspace' | ... , mods? }
//   { shot: 'name' }                screenshot -> <out>/<name>.png
//   { log: "js" }                   print the value of an expression
// Frames advance by 1 after each input step unless `{ hold: true }` is set on it.
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  if (i < 0) return def
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const out = opt('--out', 'out/drive')
const url = opt('--url', 'http://localhost:5204/longhorn-concept/?capture')
const steps = (await import(pathToFileURL(resolve(args[0])).href)).default
mkdirSync(out, { recursive: true })

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9500 + Math.floor(Math.random() * 300)
const profile = mkdtempSync(join(tmpdir(), 'lhdrive-'))
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
  '--force-device-scale-factor=1', '--window-size=960,720', '--enable-gpu', '--ignore-gpu-blocklist', '--font-render-hinting=none', 'about:blank',
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
  new Promise((res, rej) => {
    const i = ++id
    pending[i] = (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result))
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  return r.result?.value
}
const raf2 = 'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))'

let frame = 1
let mouse = { x: 0, y: 0 }
async function seek(n) {
  frame = n
  await evaluate(`window.__lh.seekFrame(${n})`)
  await evaluate('window.__lh.rendered()')
  await evaluate(raf2)
}
const mods = (m = []) => (m.includes('alt') ? 1 : 0) | (m.includes('ctrl') ? 2 : 0) | (m.includes('meta') ? 4 : 0) | (m.includes('shift') ? 8 : 0)
async function mouseEv(type, [x, y], button = 'left', count = 1, extra = {}) {
  mouse = { x, y }
  await send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : button, clickCount: count, ...extra })
}
const KEYS = { Enter: 13, Backspace: 8, Tab: 9, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Delete: 46, Home: 36, End: 35 }

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 720, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url })
  for (let i = 0; i < 600 && !events.some((e) => e.method === 'Page.loadEventFired'); i++) await sleep(100)
  for (let i = 0; i < 600 && !(await evaluate('!!(window.__lh && window.__lh.seekFrame)')); i++) await sleep(100)
  await evaluate('window.__lh.ready()')
  for (const s of steps) {
    let input = false
    if (s.f != null) await seek(s.f)
    if (s.eval) await evaluate(s.eval)
    if (s.open) {
      await evaluate(`window.__wm.emit('win.open', ${JSON.stringify({ id: s.id || s.open, app: s.open, ...(s.props ? { props: s.props } : {}) })})`)
      input = true
    }
    if (s.move) {
      await mouseEv('mouseMoved', s.move)
      input = true
    }
    if (s.down) {
      await mouseEv('mouseMoved', s.down)
      await mouseEv('mousePressed', s.down, s.button || 'left')
      input = true
    }
    if (s.up) {
      await mouseEv('mouseMoved', s.up)
      await mouseEv('mouseReleased', s.up, s.button || 'left')
      input = true
    }
    if (s.click || s.dbl) {
      const p = s.click || s.dbl
      await mouseEv('mouseMoved', p)
      await mouseEv('mousePressed', p, s.button || 'left', 1)
      await mouseEv('mouseReleased', p, s.button || 'left', 1)
      if (s.dbl) {
        await mouseEv('mousePressed', p, 'left', 2)
        await mouseEv('mouseReleased', p, 'left', 2)
      }
      input = true
    }
    if (s.wheel) {
      const [x, y, dy] = s.wheel
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy })
      input = true
    }
    if (s.type) {
      await send('Input.insertText', { text: s.type })
      input = true
    }
    if (s.key) {
      const code = KEYS[s.key] ?? s.key.toUpperCase().charCodeAt(0)
      const m = mods(s.mods)
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: s.key, code: s.key.length === 1 ? 'Key' + s.key.toUpperCase() : s.key, windowsVirtualKeyCode: code, modifiers: m })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: s.key, windowsVirtualKeyCode: code, modifiers: m })
      input = true
    }
    if (input && !s.hold) await seek(frame + 1)
    if (s.wait) await seek(frame + s.wait)
    if (s.shot) {
      await evaluate('window.__lh.rendered()')
      await evaluate(raf2)
      const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 960, height: 720, scale: 1 } })
      writeFileSync(join(out, s.shot + '.png'), Buffer.from(shot.data, 'base64'))
      console.log(`shot ${s.shot} @ frame ${frame}`)
    }
    if (s.log) console.log(s.log, '=>', JSON.stringify(await evaluate(s.log)))
  }
  for (const e of events.filter((e) => e.method === 'Runtime.exceptionThrown'))
    console.error('page error:', e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text)
  for (const e of events.filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'))
    console.error('console.error:', e.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 400))
} finally {
  ws.close()
  chrome.kill()
  await sleep(200)
  rmSync(profile, { recursive: true, force: true })
}
