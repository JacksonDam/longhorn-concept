// Real-input window drag bench: the interactive app (no ?capture / ?bench: the real clock) in
// headless Chrome with vsync and the frame-rate limit off, a window dragged by its title bar
// with CDP mouse events at a mouse's report rate (144 Hz, or 500-1000 Hz for gaming mice), as a
// user drags. Each animation frame's interval is its cost; prints p50 / p95 / max and the frames
// over 6.94 ms (144 Hz) per run, and the session's peak memory (renderer + GPU, tools/lib/memory.mjs).
//
// usage: node tools/dragbench.mjs [--url http://127.0.0.1:5312/longhorn-concept/] [--dpr 1.5,2]
//        [--size 1440x1080] [--rate 144,1000] [--scenario wallpaper,windows,glass,music,outlook,
//        pictures,maximise,resize,idle,minrestore,minrestore0] [--prefill 0,5000,20000] [--secs 3]
//        [--trace] [--json out.json]
// Scenarios (stage px):
//   wallpaper  Notepad dragged in loops over the empty desktop
//   windows    Notepad dragged over Outlook and Internet Explorer
//   glass      Notepad dragged in and out from under the sidebar glass
//   music      my Music (3D slab canvases) dragged, partly under the glass
//   outlook    Outlook dragged over the desktop
//   pictures   my Pictures & Videos dragged over the desktop
//   maximise   Outlook maximised and restored by double-clicks on its title bar, repeatedly
//   resize     Outlook resized by its grip
//   idle       my Music open, no input
//   minrestore my Music minimised (title bar) and restored (taskbar), the pointer resting 300 ms
//              on each control first (minrestore0: clicked at once)
// --prefill N adds N 'win.move' events of the dragged window to the log first (a long session).
// --trace adds a Chrome trace of the drag and prints where the frame time goes per thread.
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { memorySampler } from './lib/memory.mjs'

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
  if (i < 0) return false
  args.splice(i, 1)
  return true
}
const base = opt('--url', 'http://127.0.0.1:5312/longhorn-concept/')
const dprs = opt('--dpr', '1.5,2').split(',').map(Number)
const [W, H] = opt('--size', '1440x1080').split('x').map(Number)
const rates = opt('--rate', '144,1000').split(',').map(Number)
const scenarios = opt('--scenario', 'wallpaper,windows,glass,music,outlook,pictures,maximise,resize').split(',')
const prefills = opt('--prefill', '0').split(',').map(Number)
const secs = +opt('--secs', 3)
const trace = flag('--trace')
const profile = flag('--profile') // JS CPU profile of the drag: top functions by self time
const jsonOut = opt('--json', null)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// what each scenario opens (in order), the window it drags and its path: a function of the
// phase k (0..1, loops) giving the window's top-left in stage px
const SCEN = {
  wallpaper: { open: [['notepad', 'notepad']], drag: 'notepad', grab: [140, 12], path: (k) => loop(k, 120, 90, 260, 170) },
  windows: { open: [['inbox', 'outlook', { message: 'Hello' }], ['ie', 'ie', { url: 'www.msn.com' }], ['notepad', 'notepad']], drag: 'notepad', grab: [140, 12], path: (k) => loop(k, 160, 140, 230, 160) },
  glass: { open: [['notepad', 'notepad']], drag: 'notepad', grab: [140, 12], path: (k) => ({ x: 420 + 360 * (0.5 - 0.5 * Math.cos(k * 2 * Math.PI * 2)), y: 150 + 60 * Math.sin(k * 2 * Math.PI) }) },
  music: { open: [['music', 'music']], drag: 'music', grab: [300, 12], path: (k) => ({ x: 45 + 140 * Math.sin(k * 2 * Math.PI), y: 23 + 40 * (1 - Math.cos(k * 2 * Math.PI)) }) },
  outlook: { open: [['inbox', 'outlook', { message: 'Hello' }]], drag: 'inbox', grab: [300, 12], path: (k) => loop(k, 50, 40, 70, 60) },
  pictures: { open: [['pictures', 'pictures']], drag: 'pictures', grab: [300, 12], path: (k) => loop(k, 45, 23, 60, 40) },
  maximise: { open: [['inbox', 'outlook', { message: 'Hello' }]], drag: 'inbox', grab: [300, 12], mode: 'maximise' },
  resize: { open: [['inbox', 'outlook', { message: 'Hello' }]], drag: 'inbox', mode: 'resize' },
  // no input: what the open windows cost per frame at rest (baseline for the drags)
  idle: { open: [['music', 'music']], drag: 'music', mode: 'idle' },
  // my Music minimised from its title bar and restored from its taskbar button, again and again;
  // the pointer rests on the control LEAD ms before the click (the copies mount from the hover:
  // os/PlexWindow residency), or clicks at once (minrestore0: they mount with the animation)
  minrestore: { open: [['music', 'music']], drag: 'music', mode: 'minrestore', lead: 300 },
  minrestore0: { open: [['music', 'music']], drag: 'music', mode: 'minrestore', lead: 0 },
}
function loop(k, x0, y0, rx, ry) {
  const a = k * 2 * Math.PI
  return { x: x0 + rx * (1 - Math.cos(a)), y: y0 + ry * (0.5 - 0.5 * Math.cos(2 * a)) }
}

async function session(dpr) {
  const port = 9600 + Math.floor(Math.random() * 300)
  const profile = mkdtempSync(join(tmpdir(), 'lhdrag-'))
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
    `--window-size=${W},${H}`, `--force-device-scale-factor=${dpr}`, '--enable-gpu', '--ignore-gpu-blocklist',
    '--disable-gpu-vsync', '--disable-frame-rate-limit', 'about:blank',
  ], { stdio: 'ignore' })
  let list
  for (let i = 0; i < 80 && !list; i++) {
    await sleep(100)
    try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() } catch { /* not up */ }
  }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
  let id = 0
  const pending = {}
  const events = []
  let traceChunks = []
  let traceDone = null
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending[m.id]) pending[m.id](m)
    else if (m.method === 'Tracing.dataCollected') traceChunks.push(...m.params.value)
    else if (m.method === 'Tracing.tracingComplete') traceDone && traceDone()
    else if (m.method) events.push(m)
  }
  await new Promise((r) => (ws.onopen = r))
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id
      pending[i] = (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result))
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  // fire and forget (input at a fixed rate must not wait for each event's acknowledgement)
  const post = (method, params = {}) => ws.send(JSON.stringify({ id: ++id, method, params }))
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result?.value
  }
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: dpr, mobile: false })
  // peak memory of the renderer + GPU processes over the session (tools/lib/memory.mjs)
  const mem = memorySampler(chrome.pid)
  const close = async () => {
    ws.close()
    chrome.kill()
    await sleep(300)
    try { rmSync(profile, { recursive: true, force: true }) } catch { /* still in use */ }
  }
  return { send, post, evaluate, events, close, mem, traceStart: () => { traceChunks = []; return send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'blink', 'cc', 'gpu', 'viz', 'v8.execute'] } }) }, traceStop: () => new Promise((r) => { traceDone = () => r(traceChunks); send('Tracing.end') }) }
}

// where the frame time went, per thread, from trace events within [t0, t1] (us)
function traceSummary(evs, t0, t1, frames) {
  const threads = new Map()
  for (const e of evs) if (e.ph === 'M' && e.name === 'thread_name') threads.set(e.pid + ':' + e.tid, e.args.name)
  const top = new Map()
  for (const e of evs) {
    if (e.ph !== 'X' || e.ts < t0 || e.ts > t1 || !e.dur) continue
    const th = threads.get(e.pid + ':' + e.tid) || '?'
    if (!/CrRendererMain|Compositor|CompositorTileWorker|VizCompositor|CrGpuMain|GpuMain/.test(th)) continue
    const k = th.replace(/\d+$/, '') + ' | ' + e.name
    top.set(k, (top.get(k) || 0) + e.dur)
  }
  return [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22).map(([k, us]) => `${(us / 1000 / frames).toFixed(3).padStart(7)} ms/frame  ${k}`)
}

const stats = (ms) => {
  const v = [...ms].sort((a, b) => a - b)
  const p = (q) => v[Math.min(v.length - 1, Math.floor(v.length * q))]
  return { n: v.length, p50: p(0.5), p95: p(0.95), p99: p(0.99), max: v[v.length - 1], over: v.filter((x) => x > 6.94).length, over16: v.filter((x) => x > 16.7).length }
}

const results = []
for (const dpr of dprs) {
  for (const scen of scenarios) {
    for (const prefill of prefills) {
      for (const rate of rates) {
        const S = SCEN[scen]
        const s = await session(dpr)
        try {
          for (let attempt = 0; ; attempt++) {
            await s.send('Page.navigate', { url: base })
            for (let i = 0; i < 300 && !(await s.evaluate('!!(window.__lh && window.__lh.emit && window.__wm)').catch(() => false)); i++) await sleep(100)
            await sleep(500)
            if (await s.evaluate('window.__lh.ready()').catch(() => false)) break
            if (attempt > 2) throw new Error('page did not load')
          }
          // (the session starts with the boot screen's fade to the login screen, which ignores a log in)
          await sleep(1500)
          await s.evaluate("window.__lh.emit('login.submit', {})")
          await sleep(3500)
          for (const [wid, app, props] of S.open) {
            await s.evaluate(`window.__wm.emit('win.open', ${JSON.stringify({ id: wid, app, ...(props ? { props } : {}) })})`)
            await sleep(1500)
          }
          await sleep(1500)
          if (prefill) {
            // a long session: N earlier moves of this window (before its open, so its state is unchanged)
            await s.evaluate(`(() => {
              const log = window.__lh.log()
              const open = log.filter((e) => e.type === 'win.open' && e.id === ${JSON.stringify(S.drag)}).pop()
              const t1 = open.t - 0.001, t0 = log.find((e) => e.type === 'login.submit').t + 0.001
              const add = []
              for (let i = 0; i < ${prefill}; i++) add.push({ t: t0 + (t1 - t0) * i / ${prefill}, type: 'win.move', id: ${JSON.stringify(S.drag)}, x: 100 + (i % 300), y: 60 + (i % 200) })
              window.__lh.setLog([...log, ...add])
            })()`)
            await sleep(1000)
          }
          const logLen0 = await s.evaluate('window.__lh.log().length')
          // stage -> page px
          const fit = await s.evaluate(`(() => { const e = document.getElementById('stage'), r = e.getBoundingClientRect(); return { x: r.left, y: r.top, s: +e.dataset.s || r.width / 960 } })()`)
          const P = (x, y) => ({ x: fit.x + x * fit.s, y: fit.y + y * fit.s })
          // the top window's live layer, in stage px
          const rect = await s.evaluate(`(() => { const d = [...document.querySelectorAll('div')].filter((d) => d.style.mixBlendMode === 'plus-lighter' && d.style.pointerEvents === 'auto'); const z = d.map((e) => [e, +e.parentElement.parentElement.style.zIndex]).sort((a, b) => b[1] - a[1])[0][0]; const b = z.getBoundingClientRect(), se = document.getElementById('stage'), st = se.getBoundingClientRect(), s = +se.dataset.s || st.width / 960; return { x: (b.left - st.left) / s, y: (b.top - st.top) / s, w: parseFloat(z.style.width), h: parseFloat(z.style.height) } })()`)
          // frame recorder; a 1 px change every frame (as ?bench does) so the browser never idles
          // down to the display rate between two mouse events: each interval is a frame's cost
          await s.evaluate(`(() => {
            const d = document.createElement('div')
            d.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;z-index:99999;pointer-events:none'
            document.body.appendChild(d)
            window.__dragT = []; window.__dragOn = true
            let i = 0
            ;(function f(ts) { window.__dragT.push(ts); d.style.background = ++i % 2 ? '#010101' : '#020202'; if (window.__dragOn) requestAnimationFrame(f); else d.remove() })(performance.now())
          })()`)
          if (trace) await s.traceStart()
          if (profile) {
            await s.send('Profiler.enable')
            await s.send('Profiler.setSamplingInterval', { interval: 100 })
            await s.send('Profiler.start')
          }
          const T0 = performance.now()
          const dt = 1000 / rate
          const mouse = (type, p, extra = {}) => s.post('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: type === 'mouseMoved' ? 'left' : 'left', buttons: 1, clickCount: 1, ...extra })
          if (S.mode === 'idle') {
            await sleep(secs * 1000)
          } else if (S.mode === 'minrestore') {
            const tap = async (p) => {
              s.post('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y })
              if (S.lead) await sleep(S.lead)
              s.post('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: 1 })
              s.post('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', buttons: 0, clickCount: 1 })
            }
            const away = P(600, 400)
            while (performance.now() - T0 < secs * 1000) {
              const b = await s.evaluate(`(() => { const e = document.querySelector('[data-hit="win.minimize"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
              if (!b) break
              await tap(b)
              await sleep(700)
              s.post('Input.dispatchMouseEvent', { type: 'mouseMoved', x: away.x, y: away.y })
              await sleep(300)
              await tap(P(460, 710)) // the taskbar's My Music button
              await sleep(900)
              s.post('Input.dispatchMouseEvent', { type: 'mouseMoved', x: away.x, y: away.y })
              await sleep(300)
            }
          } else if (S.mode === 'maximise') {
            const g = P(rect.x + 300, rect.y + 12)
            // double-click the title bar every 0.5 s (maximise / restore)
            let n = 0
            while (performance.now() - T0 < secs * 1000) {
              s.post('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.x, y: g.y })
              for (const c of [1, 2]) {
                s.post('Input.dispatchMouseEvent', { type: 'mousePressed', x: g.x, y: g.y, button: 'left', buttons: 1, clickCount: c })
                s.post('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g.x, y: g.y, button: 'left', buttons: 0, clickCount: c })
              }
              n++
              await sleep(500)
            }
          } else {
            const grab = S.mode === 'resize' ? [rect.w - 8, rect.h - 8] : S.grab
            const start = P(rect.x + grab[0], rect.y + grab[1])
            s.post('Input.dispatchMouseEvent', { type: 'mouseMoved', x: start.x, y: start.y })
            s.post('Input.dispatchMouseEvent', { type: 'mousePressed', x: start.x, y: start.y, button: 'left', buttons: 1, clickCount: 1 })
            let next = performance.now()
            let last = start
            while (performance.now() - T0 < secs * 1000) {
              const k = (performance.now() - T0) / (secs * 1000)
              let p
              if (S.mode === 'resize') {
                const a = k * 2 * Math.PI * 2
                p = P(rect.x + rect.w - 8 - 120 * (0.5 - 0.5 * Math.cos(a)), rect.y + rect.h - 8 - 90 * (0.5 - 0.5 * Math.cos(a)))
              } else {
                const q = S.path(k)
                p = P(q.x + grab[0], q.y + grab[1])
              }
              mouse('mouseMoved', p)
              last = p
              next += dt
              while (performance.now() < next) await new Promise((r) => setImmediate(r))
            }
            s.post('Input.dispatchMouseEvent', { type: 'mouseReleased', x: last.x, y: last.y, button: 'left', buttons: 0, clickCount: 1 })
          }
          await sleep(300)
          let prof = null
          if (profile) prof = (await s.send('Profiler.stop')).profile
          let traceEvs = null
          if (trace) traceEvs = await s.traceStop()
          await s.evaluate('window.__dragOn = false')
          const ts = await s.evaluate('window.__dragT')
          const logLen1 = await s.evaluate('window.__lh.log().length')
          // frames while the drag ran (skip the first 200 ms: the first moves start the drag)
          const tStart = ts[0] + 200
          const tEnd = ts[0] + secs * 1000
          const ms = []
          for (let i = 1; i < ts.length; i++) if (ts[i] > tStart && ts[i] <= tEnd) ms.push(ts[i] - ts[i - 1])
          const st = stats(ms)
          const row = { dpr, scen, prefill, rate, log0: logLen0, events: logLen1 - logLen0, ...st }
          const m = await s.mem.stop()
          row.memPeak = m?.peak
          results.push(row)
          console.log(`dpr ${dpr} ${scen.padEnd(9)} log ${String(logLen0).padStart(6)} +${String(logLen1 - logLen0).padStart(4)} rate ${String(rate).padStart(4)} Hz | frames ${String(st.n).padStart(4)} p50 ${st.p50.toFixed(2)} p95 ${st.p95.toFixed(2)} p99 ${st.p99.toFixed(2)} max ${st.max.toFixed(2)} ms | over 6.94: ${st.over}, over 16.7: ${st.over16} | mem peak ${m ? m.peak + ' MB' : 'n/a'}`)
          if (traceEvs) {
            let t1 = 0
            for (const e of traceEvs) if (e.ph === 'X' && e.ts > t1) t1 = e.ts
            for (const line of traceSummary(traceEvs, t1 - secs * 1e6, t1, st.n)) console.log('    ' + line)
          }
          if (prof) {
            const self = new Map()
            const byId = new Map(prof.nodes.map((n) => [n.id, n]))
            const dts = prof.timeDeltas
            for (let i = 0; i < prof.samples.length; i++) {
              const n = byId.get(prof.samples[i])
              const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`
              self.set(k, (self.get(k) || 0) + (dts[i] || 0))
            }
            for (const [k, us] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`    ${(us / 1000 / st.n).toFixed(3).padStart(7)} ms/frame  ${k}`)
          }
          for (const e of s.events.filter((e) => e.method === 'Runtime.exceptionThrown')) console.error('page error:', e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text)
        } finally {
          await s.close()
        }
      }
    }
  }
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 1))
