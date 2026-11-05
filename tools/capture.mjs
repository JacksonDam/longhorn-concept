// Capture the app at exact reference-video frames with headless Chrome over CDP.
//
// usage: node tools/capture.mjs <frames> [--out dir] [--url url] [--eval expr]
//   frames: comma list of frame numbers or ranges with optional step, e.g. "1,180-200,700-760:4"
//   --out:  output dir (default out/cap); files are fNNNNN.png (960x720)
//   --url:  app URL (default http://localhost:5199/longhorn-concept/?capture)
// The page runs in ?capture mode: the clock only moves when window.__lh.seekFrame(n) is called,
// and the demo script supplies the input, so each capture is the app's frame n.
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  if (i < 0) return def
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const out = opt('--out', 'out/cap')
const url = opt('--url', 'http://localhost:5199/longhorn-concept/?capture')
const extraEval = opt('--eval', null)
const spec = args[0]
if (!spec) {
  console.error('usage: node tools/capture.mjs <frames e.g. 1,180-200,700-760:4> [--out dir] [--url url]')
  process.exit(2)
}
const frames = []
for (const part of spec.split(',')) {
  const m = part.match(/^(\d+)(?:-(\d+))?(?::(\d+))?$/)
  if (!m) throw new Error('bad frame spec ' + part)
  const a = +m[1], b = m[2] ? +m[2] : a, step = m[3] ? +m[3] : 1
  for (let n = a; n <= b; n += step) frames.push(n)
}
mkdirSync(out, { recursive: true })

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9800 + Math.floor(Math.random() * 400)
const profile = mkdtempSync(join(tmpdir(), 'lhcap-'))
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=960,720',
  '--enable-gpu', '--ignore-gpu-blocklist', '--font-render-hinting=none', 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let list
for (let i = 0; i < 80 && !list; i++) {
  await sleep(100)
  try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() } catch { /* not up yet */ }
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

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 720, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url })
  for (let i = 0; i < 150 && !events.some((e) => e.method === 'Page.loadEventFired'); i++) await sleep(100)
  await evaluate('document.fonts.ready.then(() => true)')
  await evaluate('window.__lh && window.__lh.ready ? window.__lh.ready() : true')
  if (extraEval) console.log('eval:', JSON.stringify(await evaluate(extraEval)))
  const raf2 = 'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))'
  for (const n of frames) {
    await evaluate(`window.__lh.seekFrame(${n})`)
    await evaluate(raf2)
    await evaluate(`window.__lh && window.__lh.ready ? window.__lh.ready() : true`)
    await evaluate(raf2)
    const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 960, height: 720, scale: 1 } })
    const file = join(out, `f${String(n).padStart(5, '0')}.png`)
    writeFileSync(file, Buffer.from(shot.data, 'base64'))
  }
  console.log(`captured ${frames.length} frame(s) to ${out}`)
  for (const e of events.filter((e) => e.method === 'Runtime.exceptionThrown'))
    console.error('page error:', e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text)
  for (const e of events.filter((e) => e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'))
    console.error('console.error:', e.params.args.map((a) => a.value ?? a.description).join(' '))
} finally {
  ws.close()
  chrome.kill()
  await sleep(200)
  rmSync(profile, { recursive: true, force: true })
}
