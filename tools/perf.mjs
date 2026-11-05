// Real-time ?demo playback in headless Chrome at 1440x1080: per-second frame-time stats.
// usage: [UNCAPPED=1] node tools/perf.mjs [app base url, default http://127.0.0.1:5299/longhorn-concept/]
// UNCAPPED=1 disables vsync / the frame-rate limit, so frame times show the achievable rate
// (144 Hz needs every frame under 6.94 ms).
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9700 + Math.floor(Math.random() * 200)
const profile = mkdtempSync(join(tmpdir(), 'lhperf-'))
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1440,1080', '--enable-gpu', '--ignore-gpu-blocklist', ...(process.env.UNCAPPED ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : []), 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let list
for (let i = 0; i < 80 && !list; i++) { await sleep(100); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
let id = 0; const pending = {}
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending[m.id]) pending[m.id](m) }
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending[i] = (m) => res(m.result); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }))?.result?.value
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: '' + (process.argv[2] || 'http://127.0.0.1:5299/longhorn-concept/') + '?demo' })
await sleep(4000)
await ev(`(() => { window.__pf = []; let l = performance.now(); const f = () => { const n = performance.now(); window.__pf.push([window.__lh.now(), n - l]); l = n; requestAnimationFrame(f) }; requestAnimationFrame(f) })()`)
await sleep(48000)
const data = await ev('window.__pf')
const per = {}
for (const [t, d] of data) { const s = Math.floor(t); (per[s] ??= []).push(d) }
for (const s of Object.keys(per).sort((a, b) => a - b)) {
  const a = per[s].sort((p, q) => p - q)
  console.log(`t=${s}s frames ${a.length} avg ${(a.reduce((p, q) => p + q, 0) / a.length).toFixed(2)} p95 ${a[Math.floor(a.length * 0.95)].toFixed(1)} p99 ${a[Math.floor(a.length * 0.99)].toFixed(1)} max ${a[a.length - 1].toFixed(1)}`)
}
ws.close(); chrome.kill(); await sleep(200); rmSync(profile, { recursive: true, force: true })
