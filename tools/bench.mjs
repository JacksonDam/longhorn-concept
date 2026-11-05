// Frame-cost benchmark on the exact ?capture rendering path (which must also be the real-time
// path: see docs/briefs/perf.md). The app's ?bench clock steps one video frame per animation
// frame, as fast as Chrome renders with vsync and the frame-rate limit off, at a real display
// size; each frame's interval is its cost. 144 Hz needs every frame under 6.94 ms.
//
// usage: node tools/bench.mjs [frames, default 1-1529] [--size 1440x1080] [--dpr 1] [--url base]
//        [--repeat 2] [--json out.json]
// Prints per-segment p50 / p95 / max and the worst frames. Each frame is measured `repeat` times
// (after a warm-up pass over the range) and the minimum is kept, to filter scheduler noise.
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
const [W, H] = opt('--size', '1440x1080').split('x').map(Number)
const dpr = +opt('--dpr', 1)
const base = opt('--url', 'http://127.0.0.1:5299/longhorn-concept/')
const repeat = +opt('--repeat', 2)
const jsonOut = opt('--json', null)
const spec = args[0] || '1-1529'
const frames = []
for (const part of spec.split(',')) {
  const m = part.match(/^(\d+)(?:-(\d+))?(?::(\d+))?$/)
  const a = +m[1], b = m[2] ? +m[2] : a, step = m[3] ? +m[3] : 1
  for (let n = a; n <= b; n += step) frames.push(n)
}

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9900 + Math.floor(Math.random() * 90)
const profile = mkdtempSync(join(tmpdir(), 'lhbench-'))
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
  `--window-size=${W},${H}`, `--force-device-scale-factor=${dpr}`, '--enable-gpu', '--ignore-gpu-blocklist',
  '--disable-gpu-vsync', '--disable-frame-rate-limit', 'about:blank',
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

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: dpr, mobile: false })
  await send('Page.navigate', { url: base + '?bench' })
  for (let i = 0; i < 600 && !events.some((e) => e.method === 'Page.loadEventFired'); i++) await sleep(100)
  for (let i = 0; i < 600 && !(await evaluate('!!(window.__lh && window.__lh.seekFrame)')); i++) await sleep(100)
  await evaluate('window.__lh.ready()')
  // the app's ?bench clock renders the frames back to back, one per animation frame; the
  // interval after each frame is its cost. A warm-up pass first (shader compiles, decodes),
  // then `repeat` measured passes, keeping each frame's minimum.
  await evaluate(`window.__lh.bench(${JSON.stringify(frames)}).then(() => true)`)
  let best = null
  for (let r = 0; r < repeat; r++) {
    const out = await evaluate(`window.__lh.bench(${JSON.stringify(frames)})`)
    const ms = out.map((p) => p[1])
    best = best ? best.map((v, i) => Math.min(v, ms[i])) : ms
  }
  const rows = frames.map((n, i) => ({ n, ms: best[i] }))
  const segs = [[1, 182, 'login idle'], [183, 200, 'tile flight'], [201, 509, 'login rest'], [510, 530, 'login exit'],
    [531, 693, 'desktop + flyout'], [694, 716, 'window open'], [717, 967, 'window idle'], [968, 992, 'album flip'],
    [993, 1352, 'album idle'], [1353, 1365, 'minimise'], [1366, 1402, 'desktop'], [1403, 1415, 'restore'], [1416, 1529, 'end']]
  const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))]
  let fail = 0
  for (const [a, b, name] of segs) {
    const v = rows.filter((r) => r.n >= a && r.n <= b).map((r) => r.ms).sort((p, q) => p - q)
    if (!v.length) continue
    const over = v.filter((x) => x > 6.94).length
    fail += over
    console.log(`${String(a).padStart(4)}-${String(b).padEnd(4)} ${name.padEnd(17)} p50 ${pct(v, 0.5).toFixed(2).padStart(6)}  p95 ${pct(v, 0.95).toFixed(2).padStart(6)}  max ${v[v.length - 1].toFixed(2).padStart(7)}  over 6.94 ms: ${over}`)
  }
  const worst = [...rows].sort((p, q) => q.ms - p.ms).slice(0, 12)
  console.log('worst:', worst.map((r) => `${r.n}:${r.ms.toFixed(1)}`).join(' '))
  console.log(`frames over 6.94 ms: ${fail} of ${rows.length}`)
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(rows))
  for (const e of events.filter((e) => e.method === 'Runtime.exceptionThrown'))
    console.error('page error:', e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text)
} finally {
  ws.close()
  chrome.kill()
  await sleep(200)
  rmSync(profile, { recursive: true, force: true })
}
