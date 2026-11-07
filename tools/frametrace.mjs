// Where each frame of the ?bench path spends its time: a Chrome trace of one bench pass over
// `frames` (after a warm-up pass, as tools/bench.mjs measures), split per video frame (a
// performance mark after each frame's React render), with the main thread's style, layout,
// paint, layerise and commit, JS, raster (tile workers) and GPU time of each.
//
// usage: node tools/frametrace.mjs <frames e.g. 1595-1605> [--url base] [--size 1920x1080] [--dpr 1]
//        [--scaled] [--query apps=every] [--min 6] [--keep trace.json]
// --min: only frames whose bench interval is at least this many ms (default 0: all)
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
const flag = (name) => {
  const i = args.indexOf(name)
  if (i >= 0) args.splice(i, 1)
  return i >= 0
}
const [W, H] = opt('--size', '1920x1080').split('x').map(Number)
const dpr = +opt('--dpr', 1)
const base = opt('--url', 'http://127.0.0.1:5325/longhorn-concept/')
const extra = opt('--query', '')
const min = +opt('--min', 0)
const keep = opt('--keep', null)
const scaled = flag('--scaled')
const frames = []
for (const part of (args[0] || '1595-1605').split(',')) {
  const m = part.match(/^(\d+)(?:-(\d+))?(?::(\d+))?$/)
  const a = +m[1], b = m[2] ? +m[2] : a, step = m[3] ? +m[3] : 1
  for (let n = a; n <= b; n += step) frames.push(n)
}

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9800 + Math.floor(Math.random() * 90)
const profile = mkdtempSync(join(tmpdir(), 'lhtrace-'))
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
let chunks = []
let done = null
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending[m.id]) pending[m.id](m)
  else if (m.method === 'Tracing.dataCollected') chunks.push(...m.params.value)
  else if (m.method === 'Tracing.tracingComplete') done?.()
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
  await send('Page.navigate', { url: base + (base.includes('?') ? '&' : '?') + 'bench' + (scaled ? '&scaled' : '') + (extra ? '&' + extra : '') })
  for (let i = 0; i < 600 && !events.some((e) => e.method === 'Page.loadEventFired'); i++) await sleep(100)
  for (let i = 0; i < 600 && !(await evaluate('!!(window.__lh && window.__lh.seekFrame)')); i++) await sleep(100)
  await evaluate('window.__lh.ready()')
  await evaluate(`window.__lh.bench(${JSON.stringify(frames)}).then(() => true)`)
  // a mark after each frame's clock tick (this rAF loop is registered after the clock's, so it
  // runs after the tick's React render): 'lhf<n>' = video frame n was just rendered
  await evaluate(`(() => { const f = () => { if (window.__lhMark) performance.mark('lhf' + Math.round(window.__lh.now() * 30000 / 1001 + 1)); requestAnimationFrame(f) }; requestAnimationFrame(f); return true })()`)
  await send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing', 'cc', 'gpu', 'viz', 'v8.execute', 'blink'] },
  })
  await sleep(200)
  const out = await evaluate(`(window.__lhMark = true, window.__lh.bench(${JSON.stringify(frames)}).then((o) => (window.__lhMark = false, o)))`)
  await new Promise((r) => {
    done = r
    send('Tracing.end')
  })
  if (keep) writeFileSync(keep, JSON.stringify(chunks))
  const evs = chunks
  const threads = new Map()
  for (const e of evs) if (e.ph === 'M' && e.name === 'thread_name') threads.set(e.pid + ':' + e.tid, e.args.name)
  const marks = evs.filter((e) => e.cat?.includes('blink.user_timing') && /^lhf\d+$/.test(e.name) && (e.ph === 'R' || e.ph === 'I' || e.ph === 'n' || e.ph === 'b'))
  const seen = new Set()
  const ms = marks.filter((e) => !seen.has(e.name) && seen.add(e.name)).sort((a, b) => a.ts - b.ts)
  const mainKey = ms.length ? ms[0].pid + ':' + ms[0].tid : null
  const dt = new Map(out.map(([n, d]) => [n, d]))
  // top-level events only (a nested event's time is in its parent's)
  const KINDS = [
    ['js', /^(FunctionCall|EvaluateScript|v8\.callFunction|TimerFire|FireAnimationFrame|EventDispatch|RunMicrotasks|V8\.GCScavenger|MajorGC|MinorGC)$/],
    ['style', /^(UpdateLayoutTree|RecalculateStyles|ScheduleStyleRecalculation)$/],
    ['layout', /^(Layout|UpdateLayout)$/],
    ['prepaint', /^PrePaint$/],
    ['paint', /^Paint$/],
    ['layerize', /^Layerize$/],
    ['commit', /^(Commit|ProxyMain::BeginMainFrame::commit)$/],
  ]
  const byThread = (th) => evs.filter((e) => e.ph === 'X' && e.dur && (e.pid + ':' + e.tid === th))
  const main = mainKey ? byThread(mainKey) : []
  const tile = evs.filter((e) => e.ph === 'X' && e.dur && /CompositorTileWorker/.test(threads.get(e.pid + ':' + e.tid) || '') && /RasterTask|TaskGraphRunner|TileManager/.test(e.name))
  const gpu = evs.filter((e) => e.ph === 'X' && e.dur && /CrGpuMain|VizCompositor/.test(threads.get(e.pid + ':' + e.tid) || ''))
  // main thread: sum per kind of the events not nested in another one of a listed kind
  const sumIn = (arr, t0, t1, re) => {
    let s = 0, end = -1
    for (const e of arr) {
      if (e.ts < t0 || e.ts >= t1 || !re.test(e.name)) continue
      if (e.ts < end) continue
      s += e.dur
      end = e.ts + e.dur
    }
    return s / 1000
  }
  main.sort((a, b) => a.ts - b.ts)
  const topLevel = (arr, t0, t1) => {
    let s = 0, end = -1
    for (const e of arr) {
      if (e.ts < t0 || e.ts >= t1) continue
      if (e.ts < end) continue
      s += e.dur
      end = e.ts + e.dur
    }
    return s / 1000
  }
  tile.sort((a, b) => a.ts - b.ts)
  gpu.sort((a, b) => a.ts - b.ts)
  const rasterIn = (t0, t1) => tile.filter((e) => e.name === 'RasterTask' && e.ts >= t0 && e.ts < t1).reduce((s, e) => s + e.dur, 0) / 1000
  console.log('frame  bench | main: js style layout prepaint paint layerize commit (busy) | raster | gpu+viz busy   (js: the frame\'s rAF and events; the rest: after its render)')
  // (a frame's React render runs in the clock's rAF just before its mark; its style, layout, paint
  // and commit after it: its JS is in the window before the mark, the rest in the one after)
  for (let i = 1; i + 1 < ms.length; i++) {
    const n = +ms[i].name.slice(3)
    const t0 = ms[i].ts, t1 = ms[i + 1].ts
    const d = dt.get(n) ?? 0
    if (d < min) continue
    const row = KINDS.map(([k, re]) => (k === 'js' ? sumIn(main, ms[i - 1].ts, t0, re) : sumIn(main, t0, t1, re)).toFixed(1).padStart(5)).join(' ')
    console.log(`${String(n).padStart(5)} ${d.toFixed(1).padStart(6)} | ${row} (${topLevel(main, t0, t1).toFixed(1).padStart(5)}) | ${rasterIn(t0, t1).toFixed(1).padStart(5)} | ${topLevel(gpu, t0, t1).toFixed(1).padStart(5)}   ${((t1 - t0) / 1000).toFixed(1)}`)
  }
} finally {
  ws.close()
  chrome.kill()
  await sleep(200)
  rmSync(profile, { recursive: true, force: true })
}
