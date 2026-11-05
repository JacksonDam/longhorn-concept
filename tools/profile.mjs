// CPU profile of the ?bench path over a frame range: top functions by self time (JS), plus the
// share of frame time spent outside JS (style/layout/paint/composite, GPU wait).
//
// usage: node tools/profile.mjs <frames e.g. 800-900> [--url base] [--size 1440x1080] [--top 30]
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
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
const base = opt('--url', 'http://127.0.0.1:5299/longhorn-concept/')
const [W, H] = opt('--size', '1440x1080').split('x').map(Number)
const top = +opt('--top', 30)
const frames = []
for (const part of (args[0] || '800-900').split(',')) {
  const m = part.match(/^(\d+)(?:-(\d+))?(?::(\d+))?$/)
  const a = +m[1], b = m[2] ? +m[2] : a, step = m[3] ? +m[3] : 1
  for (let n = a; n <= b; n += step) frames.push(n)
}
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9500 + Math.floor(Math.random() * 90)
const profile = mkdtempSync(join(tmpdir(), 'lhprof-'))
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
  `--window-size=${W},${H}`, '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit', 'about:blank',
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
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: base + (base.includes('?') ? '&' : '?') + 'bench' })
  for (let i = 0; i < 600 && !events.some((e) => e.method === 'Page.loadEventFired'); i++) await sleep(100)
  for (let i = 0; i < 600 && !(await evaluate('!!(window.__lh && window.__lh.bench)')); i++) await sleep(100)
  await evaluate('window.__lh.ready()')
  await evaluate(`window.__lh.bench(${JSON.stringify(frames)}).then(() => true)`)
  await send('Profiler.enable')
  await send('Profiler.setSamplingInterval', { interval: 100 })
  await send('Profiler.start')
  const out = await evaluate(`window.__lh.bench(${JSON.stringify(frames)})`)
  const { profile: p } = await send('Profiler.stop')
  const total = out.reduce((s, x) => s + x[1], 0)
  // self time per node
  const dt = new Map()
  for (let i = 0; i < p.samples.length; i++) dt.set(p.samples[i], (dt.get(p.samples[i]) || 0) + (p.timeDeltas[i] || 0))
  const byFn = new Map()
  let idle = 0, prog = 0, gc = 0, js = 0
  for (const n of p.nodes) {
    const us = dt.get(n.id) || 0
    const cf = n.callFrame
    if (cf.functionName === '(idle)') { idle += us; continue }
    if (cf.functionName === '(program)') { prog += us; continue }
    if (cf.functionName === '(garbage collector)') { gc += us; continue }
    js += us
    const file = cf.url.replace(/^.*\/src\//, 'src/').replace(/^.*node_modules\/(\.vite\/deps\/)?/, 'nm/').replace(/\?.*$/, '')
    const key = `${cf.functionName || '(anon)'}  ${file}:${cf.lineNumber + 1}`
    byFn.set(key, (byFn.get(key) || 0) + us)
  }
  const ms = (us) => (us / 1000 / frames.length).toFixed(3)
  console.log(`frames ${frames.length}, avg frame ${(total / frames.length).toFixed(2)} ms`)
  console.log(`per frame: JS ${ms(js)} ms, GC ${ms(gc)} ms, (program: style/layout/paint/raster setup) ${ms(prog)} ms, idle (GPU/compositor wait) ${ms(idle)} ms`)
  for (const [k, us] of [...byFn].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`${ms(us).padStart(7)} ms  ${k}`)
} finally {
  ws.close()
  chrome.kill()
  await sleep(200)
  rmSync(profile, { recursive: true, force: true })
}
