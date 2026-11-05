// Fast DOM-tweak search: load the app once at a frame, then for each JS snippet in a JSON list
// run it, screenshot, and write out/tune/<i>.png. Used to tune static decoration parameters.
// usage: node tools/music/tune.mjs <frame> <snippets.json> [--url url]
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const args = process.argv.slice(2)
const ui = args.indexOf('--url')
const url = ui >= 0 ? args.splice(ui, 2)[1] : 'http://localhost:5203/longhorn-concept/?capture&plate'
const frame = +args[0]
const snippets = JSON.parse(readFileSync(args[1], 'utf8'))
const out = 'out/tune'
mkdirSync(out, { recursive: true })
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9800 + Math.floor(Math.random() * 400)
const profile = mkdtempSync(join(tmpdir(), 'lhtune-'))
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
  '--force-device-scale-factor=1', '--window-size=960,720', '--enable-gpu', '--ignore-gpu-blocklist', '--font-render-hinting=none', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let list
for (let i = 0; i < 80 && !list; i++) { await sleep(100); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
let id = 0; const pending = {}; const events = []
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending[m.id]) pending[m.id](m); else if (m.method) events.push(m) }
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending[i] = (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)); ws.send(JSON.stringify({ id: i, method, params })) })
const evaluate = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result?.value }
try {
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 720, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url })
  for (let i = 0; i < 150 && !events.some((e) => e.method === 'Page.loadEventFired'); i++) await sleep(100)
  await evaluate('window.__lh.ready()')
  const raf2 = 'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))'
  await evaluate(`window.__lh.seekFrame(${frame})`); await evaluate(raf2); await evaluate('window.__lh.ready()'); await evaluate(raf2)
  for (let i = 0; i < snippets.length; i++) {
    await evaluate(snippets[i]); await evaluate(raf2)
    const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 960, height: 720, scale: 1 } })
    writeFileSync(join(out, `${i}.png`), Buffer.from(shot.data, 'base64'))
  }
} finally { ws.close(); chrome.kill(); await sleep(200); rmSync(profile, { recursive: true, force: true }) }
