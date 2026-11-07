// Cold-start benchmark: "the first run on a new machine". Launches headless Chrome with a fresh
// --user-data-dir (cold HTTP cache, cold GPU program cache, no V8 code cache), plays the real
// interactive flow at real speed (login hover, select, password, submit, desktop entrance,
// flyout, my Music, album, minimise, restore, close), then opens and closes every app once from
// the Start menu (first opens) and once more (second opens, in the same session). Every
// animation frame's interval is recorded from the first frame of the document, per phase.
// Further runs relaunch Chrome on the same profile (warm HTTP / GPU / code caches).
//
// usage: node tools/coldstart.mjs [--url https://127.0.0.1:5311/longhorn-concept/] [--runs cold,warm,warm]
//          [--cpu 4] [--net 20,40] [--flow all|login|apps|boot] [--rounds 2] [--hz 144] [--trace] [--trace-secs n] [--keep-trace]
//          [--shots] [--out out/coldstart/<label>] [--label name]
//        node tools/coldstart.mjs --compare a.json b.json [c.json...]   (side-by-side phase table)
//        node tools/coldstart.mjs --analyse <run-trace.json> <run-page.json> [--map bundle.js.map --bundle-url url]
//        node tools/coldstart.mjs --page <run-page.json>                  (phase table of a run's raw frames)
//
// --cpu n:       Emulation.setCPUThrottlingRate (4 = a weaker laptop)
// --net mbit,ms: Network.emulateNetworkConditions (download Mbit/s, round trip ms)
// --hz n:        the display: Chrome runs with vsync and the frame-rate limit off, and the page's
//                requestAnimationFrame is paced to an n Hz grid (default 144, the user's display),
//                so a frame that misses its vsync shows as a 2x interval. Unpaced (--hz 0), the
//                login aurora renders ~1000 fps and saturates the GPU process's main thread, so any
//                other GPU work queues behind a backlog of WebGL frames: stalls that a real display
//                never shows. --hz 60 --vsync: Chrome's own (headless, 60 Hz) vsync instead.
// --trace:       record a CDP trace of the first run and attribute every frame over 25 ms
//                (main-thread self time by event, JS by function from the CPU profiler samples
//                and the bundle's source map if served, GPU pipelines compiled); written to
//                <out>/<run>-frames.txt. TRACE_CATS=a,b,... replaces the categories.
// Serve the build with tools/pages.mjs (HTTP/2, gzip and the live site's cache headers) for runs
// that include the network; `vite preview` sends no-cache and no compression.
import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, createWriteStream, createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { get as httpsGet } from 'node:https'
import { get as httpGet } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pressPower } from './lib/power.mjs'

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

let BUDGET = 1000 / 144 // one display frame (set from --hz)
const HITCH = 25

// ------------------------------------------------------------------ stats
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))]
function stats(dts) {
  const a = [...dts].sort((p, q) => p - q)
  if (!a.length) return null
  return {
    n: a.length, p50: pct(a, 0.5), p95: pct(a, 0.95), max: a[a.length - 1],
    // missed: the frame took longer than its vsync (1.5 display frames: the pacing grid jitters by
    // up to a native frame); stall: the display time lost to missed frames
    missed: a.filter((x) => x > BUDGET * 1.5).length, over25: a.filter((x) => x > HITCH).length, over50: a.filter((x) => x > 50).length,
    stall: a.reduce((s, x) => s + (x > BUDGET * 1.5 ? x - BUDGET : 0), 0),
  }
}
// phases: load (navigation -> first visible frame), intro, then one per input step; a frame
// belongs to the phase it ends in
function phasesOf(page) {
  const marks = [['load', 0], ['intro', page.visibleAt ?? 0], ...page.marks]
  const phases = []
  for (let i = 0; i < marks.length - 1; i++) {
    const [name, a] = marks[i]
    const b = marks[i + 1][1]
    const fr = page.frames.filter(([n]) => n > a && n <= b)
    phases.push({ name, start: a, dur: b - a, stats: name === 'load' ? null : stats(fr.map(([, d]) => d)), worst: fr.sort((p, q) => q[1] - p[1]).slice(0, 3).map(([n, d]) => [Math.round(n), +d.toFixed(1)]) })
  }
  return phases
}
const f1 = (x) => (x == null ? '-' : x.toFixed(1))
function table(phases) {
  const rows = [['phase', 'ms', 'frames', 'p50', 'p95', 'max', 'missed', '>25', '>50', 'stall ms']]
  for (const p of phases) {
    const s = p.stats
    rows.push([p.name, f1(p.dur), s ? s.n : 0, f1(s?.p50), f1(s?.p95), f1(s?.max), s?.missed ?? '-', s?.over25 ?? '-', s?.over50 ?? '-', f1(s?.stall)])
  }
  const w = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)))
  return rows.map((r) => r.map((c, i) => (i ? String(c).padStart(w[i]) : String(c).padEnd(w[i]))).join('  ')).join('\n')
}

// ------------------------------------------------------------------ compare mode
if (flag('--compare')) {
  const runs = args.map((f) => ({ f, d: JSON.parse(readFileSync(f, 'utf8')) }))
  const names = []
  for (const r of runs) for (const p of r.d.phases) if (!names.includes(p.name)) names.push(p.name)
  const head = ['phase', ...runs.map((r) => r.d.label || r.f)]
  const rows = [head]
  for (const n of names)
    rows.push([n, ...runs.map((r) => {
      const p = r.d.phases.find((q) => q.name === n)
      if (!p) return '-'
      if (!p.stats) return `${f1(p.dur)} ms`
      return `max ${f1(p.stats.max)}, ${p.stats.missed} missed, stall ${f1(p.stats.stall)}`
    })])
  rows.push(['total stall ms', ...runs.map((r) => f1(r.d.phases.reduce((s, p) => s + (p.stats?.stall || 0), 0)))])
  rows.push(['missed frames', ...runs.map((r) => String(r.d.phases.reduce((s, p) => s + (p.stats?.missed || 0), 0)))])
  rows.push(['frames >25 ms', ...runs.map((r) => String(r.d.phases.reduce((s, p) => s + (p.stats?.over25 || 0), 0)))])
  rows.push(['time to visible', ...runs.map((r) => f1(r.d.visibleAt) + ' ms')])
  const w = head.map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)))
  console.log(rows.map((r) => r.map((c, i) => String(c).padEnd(w[i])).join('  ')).join('\n'))
  process.exit(0)
}

// --page <run-page.json>: the phase table of an earlier run's raw page data
if (flag('--page')) {
  const page = JSON.parse(readFileSync(args[0], 'utf8'))
  if (page.hz) BUDGET = 1000 / page.hz
  console.log(table(phasesOf(page)))
  process.exit(0)
}
// --analyse <trace.json> <run-page.json>: re-run the trace attribution of an earlier run
if (flag('--analyse')) {
  const smap = opt('--map', null)
  const bundleUrl = opt('--bundle-url', '')
  const page = JSON.parse(readFileSync(args[1], 'utf8'))
  if (smap) {
    const { SourceMapConsumer } = await import('source-map-js')
    smc = { url: bundleUrl, c: new SourceMapConsumer(JSON.parse(readFileSync(smap, 'utf8'))) }
  }
  console.log(await analyseTrace(args[0], page, 'trace'))
  process.exit(0)
}

const base = opt('--url', 'https://127.0.0.1:5311/longhorn-concept/')
const runsSpec = opt('--runs', 'cold,warm,warm').split(',')
const cpu = +opt('--cpu', 1)
const net = opt('--net', null)
const flow = opt('--flow', 'all')
const rounds = +opt('--rounds', 2)
const vsync = flag('--vsync')
const hz = +opt('--hz', vsync ? 60 : 144)
if (hz) BUDGET = 1000 / hz
const trace = flag('--trace')
const shots = flag('--shots')
const keepTrace = flag('--keep-trace')
const traceSecs = +opt('--trace-secs', 0)
const label = opt('--label', null)
const out = opt('--out', join('out', 'coldstart', label || 'run'))
const keepProfile = opt('--profile', null)
mkdirSync(out, { recursive: true })
const W = 1440, H = 1080

// --chrome <binary>: another Chrome build. --new-machine (needs a Chrome other than the
// installed one, e.g. Chrome for Testing) also empties that build's macOS Metal shader cache
// (per GPU-helper bundle id, in the user cache dir) before every cold run: on a new machine
// every GPU pipeline compiles from source, which a fresh --user-data-dir alone doesn't show.
const MAIN_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const CHROME = opt('--chrome', MAIN_CHROME)
const newMachine = flag('--new-machine')
let metalCache = null
if (newMachine) {
  if (CHROME === MAIN_CHROME) throw new Error('--new-machine clears the Metal cache of the Chrome build it runs: use --chrome <Chrome for Testing>')
  const app = CHROME.slice(0, CHROME.indexOf('.app/') + 4)
  const name = app.split('/').pop().replace(/\.app$/, '')
  const plist = `${app}/Contents/Frameworks/${name} Framework.framework/Helpers/${name} Helper (GPU).app/Contents/Info.plist`
  const id = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print CFBundleIdentifier', plist]).toString().trim()
  if (/^com\.google\.Chrome(\.|$)/.test(id)) throw new Error('refusing to clear the installed Chrome\'s Metal cache: ' + id)
  metalCache = join(execFileSync('getconf', ['DARWIN_USER_CACHE_DIR']).toString().trim(), id)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let profile = keepProfile || mkdtempSync(join(tmpdir(), 'lhcold-'))

// recorder installed before any page script runs: every animation frame's interval from the
// first frame of the document, phase marks, long animation frames with script attribution
const RECORDER = `(() => {
  const F = (window.__cs = { frames: [], marks: [], loaf: [], visibleAt: null, visibleT: null, hz: ${hz} })
  F.mark = (n) => { F.marks.push([n, performance.now()]); performance.mark('cs:' + n) }
  // a ${hz || 'native'} Hz display: the page's animation-frame callbacks run on the first native
  // frame after each grid tick (Chrome itself runs unpaced, so the grid sets the pace)
  if (${hz} > 0 && !${vsync}) {
    const native = window.requestAnimationFrame.bind(window)
    const P = 1000 / ${hz}
    let cbs = new Map(), nextId = 1, lastTick = -1, armed = false, dmg = null, k = 0
    const pump = (ts) => {
      armed = false
      // a 1 px change every native frame, or Chrome idles down to ~55 Hz between grid ticks
      // (tools/bench.mjs does the same)
      if (!dmg && document.body) {
        dmg = document.createElement('div')
        dmg.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;z-index:2147483647;pointer-events:none'
        document.body.appendChild(dmg)
      }
      if (dmg) dmg.style.background = ++k % 2 ? '#010101' : '#020202'
      const n = performance.now()
      const tick = Math.floor(n / P)
      if (tick === lastTick) return arm()
      lastTick = tick
      const run = cbs
      cbs = new Map()
      for (const cb of run.values()) try { cb(n) } catch (e) { setTimeout(() => { throw e }) }
      if (cbs.size) arm()
    }
    const arm = () => { if (!armed) { armed = true; native(pump) } }
    window.requestAnimationFrame = (cb) => { const id = nextId++; cbs.set(id, cb); arm(); return id }
    window.cancelAnimationFrame = (id) => { cbs.delete(id) }
  }
  let l = performance.now()
  const f = () => {
    const n = performance.now()
    const lh = window.__lh
    F.frames.push([n, n - l])
    l = n
    if (F.visibleAt == null && lh && document.querySelector('#stage canvas') && (lh.booted === undefined || lh.booted)) {
      F.visibleAt = n
      F.visibleT = lh.now()
      performance.mark('cs:visible')
    }
    requestAnimationFrame(f)
  }
  requestAnimationFrame(f)
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        F.loaf.push({ start: e.startTime, dur: e.duration, block: e.blockingDuration, render: e.renderStart, style: e.styleAndLayoutStart,
          scripts: e.scripts.map((s) => ({ start: s.startTime, dur: s.duration, inv: s.invoker, type: s.invokerType, fn: s.sourceFunctionName, url: s.sourceURL, pos: s.sourceCharPosition, forced: s.forcedStyleAndLayoutDuration })) })
    }).observe({ type: 'long-animation-frame', buffered: true })
  } catch {}
})()`

async function launch() {
  const port = 9100 + Math.floor(Math.random() * 180)
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
    `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--enable-gpu', '--ignore-gpu-blocklist',
    '--ignore-certificate-errors', '--no-first-run', '--no-default-browser-check', '--disable-component-update',
    '--disable-background-networking', '--disable-sync', '--disable-search-engine-choice-screen',
    '--disable-features=SearchEngineChoiceTrigger',
    ...(vsync ? [] : ['--disable-gpu-vsync', '--disable-frame-rate-limit']), 'about:blank',
  ], { stdio: 'ignore' })
  let list
  for (let i = 0; i < 100 && !list; i++) {
    await sleep(100)
    try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() } catch { /* not up */ }
  }
  // (a relaunched Chrome for Testing can open a first-run settings page next to about:blank)
  const target = list.find((t) => t.type === 'page' && t.url === 'about:blank') || list.find((t) => t.type === 'page')
  for (const t of list) if (t.type === 'page' && t !== target) await fetch(`http://127.0.0.1:${port}/json/close/${t.id}`).catch(() => {})
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  let id = 0
  const pending = {}
  const events = []
  const listeners = []
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending[m.id]) pending[m.id](m)
    else if (m.method) {
      if (m.method !== 'Tracing.dataCollected') events.push(m)
      for (const l of listeners) l(m)
    }
  }
  await new Promise((r) => (ws.onopen = r))
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id
      pending[i] = (m) => (delete pending[i], m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result))
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result?.value
  }
  const close = async () => {
    try { ws.close() } catch { /* closed */ }
    chrome.kill()
    await new Promise((r) => (chrome.exitCode != null ? r() : chrome.once('exit', r)))
  }
  return { send, evaluate, events, listeners, close }
}

// ------------------------------------------------------------------ the flow
// Start menu entries (stage px; scenes/desktop/StartMenu.jsx: START at y 281, rows below)
const START_BTN = [30, 710]
const APPS = [
  ['Outlook', [76, 387]], ['Word', [76, 431]], ['Internet Explorer', [76, 475]], ['Winamp', [60, 519]],
  ['Notepad', [60, 569]], ['Paint', [60, 594]], ['Solitaire', [60, 619]],
  ['my Documents', [224, 381]], ['my Pictures', [224, 407]], ['my Computer', [224, 459]], ['Search', [224, 521]],
  ['Control Panel', [224, 547]], ['Help and Support', [224, 573]], ['Run', [224, 599]], ['All Programs', [76, 681]],
  // Messenger opens from the sidebar's buddy list: the same 'win.open' the buddy's click emits
  ['Messenger', { id: 'im:Hank', app: 'im', props: { buddy: 'Hank' } }],
]

async function play(cdp, runName) {
  const { send, evaluate } = cdp
  let rect, from = { x: W - 10, y: H * 0.6 }
  const toClient = (x, y) => ({ x: rect.x + x * rect.s, y: rect.y + y * rect.s })
  const mark = (n) => evaluate(`window.__cs.mark(${JSON.stringify(n)})`)
  async function movePage(to, steps = 12) {
    for (let i = 1; i <= steps; i++) {
      const k = i / steps
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k })
      await sleep(16)
    }
    from = to
  }
  const move = (x, y) => movePage(toClient(x, y))
  async function clickPage(p) {
    await movePage(p)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 })
    await sleep(60)
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 })
  }
  const click = (x, y) => clickPage(toClient(x, y))
  async function key(k, code = k, text) {
    const vk = k === 'Enter' ? 13 : k.toUpperCase().charCodeAt(0)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, text, windowsVirtualKeyCode: vk })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk })
  }
  let shotN = 0
  async function shot(name) {
    if (!shots) return
    const s = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(out, `${runName}-${String(++shotN).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-')}.png`), Buffer.from(s.data, 'base64'))
  }
  const step = async (name, fn, wait) => {
    await mark(name)
    await fn()
    await sleep(wait)
    await shot(name)
  }

  // the power button (src/scenes/session/powerButton.js): the real OS opens on it and warms up
  // under it; pressed as soon as it shows, the worst case (phase 'power': the press until the
  // welcome screen, which shows after at least one pass of the boot screen)
  if (await pressPower(send, evaluate)) await mark('power')
  // wait for the first visible frame of the login screen
  for (let i = 0; i < 1200; i++) {
    if (await evaluate('!!(window.__cs && window.__cs.visibleAt != null)').catch(() => false)) break
    await sleep(50)
  }
  if (!(await evaluate('!!(window.__cs && window.__cs.visibleAt != null)').catch(() => false))) throw new Error('the login screen never showed')
  rect = await evaluate(`(() => { const e = document.getElementById('stage'), b = e.getBoundingClientRect(); return { x: b.x, y: b.y, s: +e.dataset.s || b.width / 960 } })()`)
  await sleep(flow === 'boot' ? 1000 : 3000) // the login screen as it first shows (phase 'intro')
  await shot('intro')
  if (flow === 'all' || flow === 'login') {
    await step('hover', () => move(563, 634), 700)
    await step('select', () => click(462, 634), 1800)
    await step('password', async () => {
      for (const c of 'secret') await key(c, 'Key' + c.toUpperCase(), c), await sleep(90)
    }, 300)
    await step('submit + desktop', () => key('Enter', 'Enter', '\r'), 3500)
    await step('flyout', () => click(873, 268), 1200)
    await step('my Music open', () => click(786, 484), 3500)
    await step('album', () => click(405, 480), 2500)
    await step('minimise', () => click(771, 33), 1800)
    await step('restore', () => click(460, 710), 1800)
    await step('close', () => click(805, 33), 1800)
  }
  if (flow === 'all' || flow === 'apps') {
    if (flow === 'apps') {
      // straight to the desktop
      await evaluate(`window.__lh.emit('login.submit', { id: 'sondra' })`)
      await sleep(3000)
    }
    for (let r = 1; r <= rounds; r++) {
      const tag = r === 1 ? '' : ` #${r}`
      for (const [name, at] of APPS) {
        if (Array.isArray(at)) {
          await step('start menu' + tag, () => click(...START_BTN), 700)
          await step(name + tag, () => click(...at), 2200)
        } else {
          await step(name + tag, () => evaluate(`window.__wm.emit('win.open', ${JSON.stringify(at)})`), 2200)
        }
        await step('close ' + name + tag, async () => {
          const p = await evaluate(`(() => { for (const el of document.querySelectorAll('[data-hit="win.close"]')) {
            const b = el.getBoundingClientRect(); if (!b.width) continue
            const x = b.x + b.width / 2, y = b.y + b.height / 2
            if (document.elementFromPoint(x, y) === el) return { x, y } } return null })()`)
          if (p) await clickPage(p)
          else await evaluate(`(() => { const w = window.__wm.focusedWindow(window.__lh.now()); if (w) window.__wm.emit('win.close', { id: w.id }) })()`)
        }, 1000)
      }
    }
  }
  await mark('end')
}

// ------------------------------------------------------------------ trace analysis
// (no 'gpu' / 'cc' / 'viz' by default: at the paced display's native frame rate they write
// ~200 MB/s; TRACE_CATS=... overrides. 'gpu.dawn' shows the GPU pipeline compiles.)
const CATS = process.env.TRACE_CATS ? process.env.TRACE_CATS.split(',') : [
  'devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'v8.execute', 'v8', 'blink.user_timing', 'loading',
  'gpu.dawn', 'disabled-by-default-v8.compile', 'disabled-by-default-v8.cpu_profiler', 'disabled-by-default-v8.gc',
]

var smc = null // source map consumer of the bundle (for --trace JS attribution)
async function loadSourceMap(events) {
  const urls = new Set()
  for (const e of events) if (e.method === 'Network.responseReceived' && /\/assets\/index-[^/]+\.js$/.test(e.params.response.url)) urls.add(e.params.response.url)
  // (node's fetch refuses tools/pages.mjs's self-signed certificate)
  const get = (u) =>
    new Promise((resolve, reject) =>
      (u.startsWith('https:') ? httpsGet : httpGet)(u, { rejectUnauthorized: false }, (res) => {
        if (res.statusCode !== 200) return reject(new Error(res.statusCode)), res.resume()
        let d = ''
        res.setEncoding('utf8').on('data', (c) => (d += c)).on('end', () => resolve(d))
      }).on('error', reject),
    )
  for (const u of urls) {
    try {
      const map = JSON.parse(await get(u + '.map'))
      const { SourceMapConsumer } = await import('source-map-js')
      smc = { url: u, c: new SourceMapConsumer(map) }
    } catch { /* no map */ }
  }
}
function srcName(fn, url, line, col) {
  if (smc && url === smc.url && line != null) {
    const o = smc.c.originalPositionFor({ line: line + 1, column: col ?? 0 })
    if (o.source) return `${o.name || fn || '(anon)'} ${o.source.replace(/^.*?\/src\//, 'src/')}:${o.line}`
  }
  return `${fn || '(anon)'} ${url ? url.split('/').pop() : ''}${line != null ? ':' + (line + 1) : ''}`
}

// Chrome writes one event per line; a cold run's trace is ~1 GB, mostly short scheduler RunTask
// events (vsync off), so it is read line by line and RunTasks under 1 ms are dropped
async function readTrace(file) {
  const evs = []
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity })
  for await (let line of rl) {
    if (!line.startsWith('{"args"') && !line.startsWith('{"cat"') && !line.startsWith('{"pid"')) continue
    if (line.includes('"name":"RunTask"') && !/"dur":\d{4,}/.test(line)) continue
    if (line.endsWith(',')) line = line.slice(0, -1)
    try {
      evs.push(JSON.parse(line))
    } catch { /* not an event */ }
  }
  return evs
}

async function analyseTrace(file, page, runName) {
  const evs = await readTrace(file)
  const threads = new Map() // pid:tid -> name
  for (const e of evs) if (e.ph === 'M' && e.name === 'thread_name') threads.set(e.pid + ':' + e.tid, e.args.name)
  // the page's renderer: the main thread that recorded the cs: marks
  const markEv = evs.filter((e) => e.cat?.includes('blink.user_timing') && e.name?.startsWith('cs:'))
  if (!markEv.length) return 'no marks in trace'
  const rpid = markEv[0].pid
  const mainKey = [...threads].find(([k, n]) => k.startsWith(rpid + ':') && n === 'CrRendererMain')?.[0]
  // perf.now (ms) -> trace µs
  const offs = []
  for (const [n, t] of page.marks) {
    const m = markEv.find((e) => e.name === 'cs:' + n)
    if (m) offs.push(m.ts / 1000 - t)
  }
  offs.sort((a, b) => a - b)
  const off = offs[Math.floor(offs.length / 2)]
  const toUs = (ms) => (ms + off) * 1000

  // complete events per thread (B/E paired into X)
  const byThread = new Map()
  const stacks = new Map()
  for (const e of evs) {
    if (e.ph !== 'X' && e.ph !== 'B' && e.ph !== 'E') continue
    const k = e.pid + ':' + e.tid
    if (e.ph === 'B') {
      ;(stacks.get(k) || stacks.set(k, []).get(k)).push(e)
      continue
    }
    let x = e
    if (e.ph === 'E') {
      const b = stacks.get(k)?.pop()
      if (!b) continue
      x = { ...b, ph: 'X', dur: e.ts - b.ts, args: { ...b.args, ...e.args } }
    }
    if (!(x.dur > 0)) continue
    ;(byThread.get(k) || byThread.set(k, []).get(k)).push(x)
  }
  // self time of each event (stack walk per thread)
  for (const list of byThread.values()) {
    list.sort((a, b) => a.ts - b.ts || b.dur - a.dur)
    const st = []
    for (const e of list) {
      e.self = e.dur
      while (st.length && st[st.length - 1].ts + st[st.length - 1].dur <= e.ts) st.pop()
      if (st.length) st[st.length - 1].self -= Math.min(e.dur, st[st.length - 1].ts + st[st.length - 1].dur - e.ts)
      st.push(e)
    }
  }
  const labelOf = (e) => {
    const d = e.args?.data || {}
    if (e.name === 'FunctionCall') return 'FunctionCall ' + srcName(d.functionName, d.url, d.lineNumber, d.columnNumber)
    if (e.name === 'EventDispatch') return 'EventDispatch ' + d.type
    if (e.name === 'EvaluateScript' || e.name === 'v8.compile' || e.name === 'v8.compileModule' || e.name === 'v8.evaluateModule') return e.name + ' ' + String(d.url || d.fileName || e.args?.fileName || '').split('/').pop()
    if (/Decode/.test(e.name)) return e.name + (d.url ? ' ' + String(d.url).split('/').pop() : '')
    if (e.name === 'ResourceReceivedData' || e.name === 'ResourceFinish') return e.name
    return e.name
  }
  // CPU profile samples (JS self time by function)
  const samples = [] // [ts µs, label, dt]
  {
    const nodes = new Map()
    const prof = new Map() // id -> { t }
    for (const e of evs) {
      if (e.pid !== rpid) continue
      if (e.name === 'Profile') prof.set(e.id, { t: e.args.data.startTime, nodes: new Map() })
      if (e.name === 'ProfileChunk') {
        const p = prof.get(e.id)
        if (!p) continue
        const cp = e.args.data.cpuProfile || {}
        for (const n of cp.nodes || []) {
          const cf = n.callFrame
          p.nodes.set(n.id, cf.url || /^\(/.test(cf.functionName) ? srcName(cf.functionName, cf.url, cf.lineNumber, cf.columnNumber) : cf.functionName || '(native)')
        }
        const deltas = e.args.data.timeDeltas || []
        ;(cp.samples || []).forEach((s, i) => {
          p.t += deltas[i] || 0
          samples.push([p.t, p.nodes.get(s) || '?'])
        })
      }
    }
    samples.sort((a, b) => a[0] - b[0])
    for (let i = 0; i < samples.length; i++) samples[i][2] = Math.min(2000, (samples[i + 1]?.[0] ?? samples[i][0]) - samples[i][0])
    void nodes
  }
  const sumIn = (list, a, b, label = labelOf) => {
    const m = new Map()
    for (const e of list) {
      if (e.ts >= b || e.ts + e.dur <= a || e.self <= 0) continue
      const ov = Math.min(b, e.ts + e.dur) - Math.max(a, e.ts)
      const v = (e.self * ov) / e.dur
      const k = label(e)
      m.set(k, (m.get(k) || 0) + v)
    }
    return [...m].sort((p, q) => q[1] - p[1])
  }
  const busyIn = (list, a, b) => {
    let s = 0
    for (const e of list) if (e.self > 0 && e.ts < b && e.ts + e.dur > a) s += (e.self * (Math.min(b, e.ts + e.dur) - Math.max(a, e.ts))) / e.dur
    return s
  }
  const main = byThread.get(mainKey) || []
  // GPU pipeline compiles (Graphite on Dawn / Metal: one per new kind of draw, on worker threads;
  // the GPU process waits for them before it can draw the frame that needs them)
  const pipes = []
  for (const list of byThread.values()) for (const e of list) if (e.name === 'CreatePipelineAsyncEvent::InitializeImpl') pipes.push(e)
  const pipesIn = (a, b) => {
    const sel = pipes.filter((e) => e.ts + e.dur > a && e.ts + e.dur <= b)
    return `${sel.length} (${(sel.reduce((s, e) => s + e.dur, 0) / 1000).toFixed(0)} ms)`
  }
  const others = [...byThread].filter(([k]) => k !== mainKey).map(([k, list]) => ({ k, name: threads.get(k) || k, list }))
  const gpuMain = others.filter((o) => o.name === 'CrGpuMain' || o.name === 'VizCompositorThread' || /CompositorTileWorker|Compositor$|ThreadPoolForeg/.test(o.name))
  const lines = []
  const ms = (us) => (us / 1000).toFixed(1)
  const phaseOf = (t) => {
    let n = 'load'
    if (page.visibleAt != null && t >= page.visibleAt) n = 'intro'
    for (const [m, mt] of page.marks) if (t >= mt) n = m
    return n
  }
  const long = page.frames.filter(([, dt]) => dt > Math.max(HITCH, BUDGET * 1.5))
  lines.push(`${runName}: ${long.length} frames over ${Math.max(HITCH, BUDGET * 1.5).toFixed(1)} ms (trace offset ${off.toFixed(1)} ms)`)
  for (const [end, dt] of long) {
    const a = toUs(end - dt), b = toUs(end)
    lines.push(`\n[${phaseOf(end - dt)}] frame ending ${(end / 1000).toFixed(3)} s: ${dt.toFixed(1)} ms`)
    const top = sumIn(main, a, b).filter(([k]) => k !== 'RunTask' && k !== 'ThreadControllerImpl::RunTask').slice(0, 8)
    lines.push('  main: ' + top.map(([k, v]) => `${k} ${ms(v)}`).join(' | '))
    if (pipes.length) lines.push('  GPU pipelines compiled: ' + pipesIn(a - 300000, b))
    const js = new Map()
    for (const [ts, l, d] of samples) if (ts >= a && ts < b) js.set(l, (js.get(l) || 0) + d)
    const jt = [...js].sort((p, q) => q[1] - p[1]).filter(([k]) => k !== '(idle)').slice(0, 6)
    if (jt.length) lines.push('  js:   ' + jt.map(([k, v]) => `${k} ${ms(v)}`).join(' | '))
    for (const o of gpuMain) {
      const busy = busyIn(o.list, a, b)
      if (busy < 2000) continue
      const t = sumIn(o.list, a, b).filter(([k]) => !/^(ThreadControllerImpl::RunTask|RunTask|ThreadPool_RunTask|TaskGraphRunner::RunTask)$/.test(k)).slice(0, 4)
      lines.push(`  ${o.name}: busy ${ms(busy)}: ` + t.map(([k, v]) => `${k} ${ms(v)}`).join(' | '))
    }
  }
  // per phase main-thread totals by category
  const cat = (n) =>
    /GC|Scavenge|MarkCompact|Sweep/i.test(n) ? 'gc' :
    /compile|Compile|parse|Parse(?!HTML)|v8\.produce|v8\.deserialize/.test(n) ? 'compile' :
    /Decode|decode/.test(n) ? 'decode' :
    /UpdateLayoutTree|RecalculateStyle|ParseAuthorStyleSheet|Style/.test(n) ? 'style' :
    /^Layout|IntersectionObserver/.test(n) ? 'layout' :
    /Paint|Layerize|Commit|CompositeLayers|UpdateLayer|Raster/.test(n) ? 'paint' :
    /FunctionCall|EvaluateScript|v8\.|V8\.|EventDispatch|TimerFire|FireAnimationFrame|RunMicrotasks|evaluateModule|callFunction/.test(n) ? 'script' : 'other'
  lines.push('\nmain thread by phase (ms): script / compile / gc / style / layout / paint / decode / other; GPU main busy; GPU pipelines compiled')
  const marks = [['load', 0], ...(page.visibleAt != null ? [['intro', page.visibleAt]] : []), ...page.marks]
  const gpu = others.find((o) => o.name === 'CrGpuMain')
  for (let i = 0; i < marks.length - 1; i++) {
    const a = toUs(marks[i][1]), b = toUs(marks[i + 1][1])
    const c = { script: 0, compile: 0, gc: 0, style: 0, layout: 0, paint: 0, decode: 0, other: 0 }
    for (const [k, v] of sumIn(main, a, b, (e) => e.name)) if (!/RunTask/.test(k)) c[cat(k)] += v
    lines.push(`  ${marks[i][0].padEnd(24)} ${Object.values(c).map((v) => ms(v).padStart(7)).join(' ')}   gpu ${gpu ? ms(busyIn(gpu.list, a, b)) : '-'}   pipelines ${pipesIn(a, b)}`)
  }
  return lines.join('\n')
}

// ------------------------------------------------------------------ run
const results = []
try {
  for (let ri = 0; ri < runsSpec.length; ri++) {
    const runName = `${ri + 1}-${runsSpec[ri]}`
    if (runsSpec[ri] === 'cold' && ri > 0 && !keepProfile) {
      rmSync(profile, { recursive: true, force: true })
      profile = mkdtempSync(join(tmpdir(), 'lhcold-'))
    }
    if (metalCache && runsSpec[ri] === 'cold') rmSync(metalCache, { recursive: true, force: true })
    const cdp = await launch()
    const { send, evaluate, events, listeners } = cdp
    await send('Page.enable')
    await send('Runtime.enable')
    await send('Network.enable')
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
    if (cpu > 1) await send('Emulation.setCPUThrottlingRate', { rate: cpu })
    if (net) {
      const [mbit, rtt] = net.split(',').map(Number)
      await send('Network.emulateNetworkConditions', { offline: false, latency: rtt, downloadThroughput: (mbit * 1e6) / 8, uploadThroughput: (mbit * 1e6) / 32 })
    }
    await send('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER })
    const doTrace = trace && ri === 0
    let traceDone = null
    if (doTrace) {
      traceDone = new Promise((r) => listeners.push((m) => m.method === 'Tracing.tracingComplete' && r(m.params.stream)))
      await send('Tracing.start', { transferMode: 'ReturnAsStream', traceConfig: { recordMode: 'recordUntilFull', traceBufferSizeInKb: 800000, includedCategories: CATS } })
    }
    const t0 = Date.now()
    // a trace grows ~30 MB per second: --trace-secs ends it early (frames after it aren't attributed)
    let traceEnded = null
    if (doTrace && traceSecs) traceEnded = sleep(traceSecs * 1000).then(() => send('Tracing.end'))
    await send('Page.navigate', { url: base })
    await play(cdp, runName)
    const page = await evaluate(`({ frames: __cs.frames, marks: __cs.marks, loaf: __cs.loaf, visibleAt: __cs.visibleAt, visibleT: __cs.visibleT,
      nav: performance.getEntriesByType('navigation').map((e) => ({ dom: e.domContentLoadedEventEnd, load: e.loadEventEnd }))[0],
      boot: window.__lh && window.__lh.bootStats ? window.__lh.bootStats : null,
      res: performance.getEntriesByType('resource').map((e) => ({ url: e.name.split('/').slice(-2).join('/'), start: e.startTime, end: e.responseEnd, size: e.transferSize, body: e.decodedBodySize })) })`)
    writeFileSync(join(out, `${runName}-page.json`), JSON.stringify(page))
    let frameReport = null
    if (doTrace) {
      if (traceEnded) await traceEnded
      else await send('Tracing.end')
      const stream = await traceDone
      const tf = join(out, `${runName}-trace.json`)
      const ws = createWriteStream(tf)
      for (;;) {
        const r = await send('IO.read', { handle: stream, size: 1 << 20 })
        ws.write(r.base64Encoded ? Buffer.from(r.data, 'base64') : r.data)
        if (r.eof) break
      }
      await new Promise((r) => ws.end(r))
      await send('IO.close', { handle: stream })
      await loadSourceMap(events)
      frameReport = await analyseTrace(tf, page, runName)
      writeFileSync(join(out, `${runName}-frames.txt`), frameReport)
      if (!keepTrace) rmSync(tf)
    }
    const errors = events.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text)
    await cdp.close()

    const phases = phasesOf(page)
    const totalStall = phases.reduce((s, p) => s + (p.stats?.stall || 0), 0)
    const r = { label: `${label || 'run'} ${runName}`, url: base, cpu, net, vsync, hz, run: runsSpec[ri], wall: Date.now() - t0, visibleAt: page.visibleAt, visibleT: page.visibleT, nav: page.nav, boot: page.boot, phases, loaf: page.loaf, res: page.res, errors }
    results.push(r)
    writeFileSync(join(out, `${runName}.json`), JSON.stringify(r))
    console.log(`\n== ${r.label}  (cpu x${cpu}${net ? ', net ' + net : ''}, ${vsync ? 'vsync' : hz ? hz + ' Hz' : 'unpaced'}${newMachine ? ', new machine' : ''})  visible at ${f1(page.visibleAt)} ms (app t ${f1(page.visibleT)} s)  total stall ${totalStall.toFixed(0)} ms`)
    if (page.boot) console.log('boot:', JSON.stringify(page.boot))
    console.log(table(phases))
    // worst long animation frames with their scripts
    const lo = [...page.loaf].sort((p, q) => q.dur - p.dur).slice(0, 8)
    for (const l of lo) {
      const sc = [...l.scripts].sort((p, q) => q.dur - p.dur).slice(0, 3).map((s) => `${s.type}:${s.inv} ${s.fn || ''} ${s.dur.toFixed(0)}ms`).join(', ')
      console.log(`  LoAF @${(l.start / 1000).toFixed(2)}s ${l.dur.toFixed(0)} ms (script ${(l.render ? l.render - l.start : l.dur).toFixed(0)}, style/layout from ${l.style ? (l.style - l.start).toFixed(0) : '-'}): ${sc}`)
    }
    for (const e of errors) console.error('page error:', e)
    if (frameReport) console.log(`trace: ${join(out, runName + '-frames.txt')}`)
  }
} finally {
  if (!keepProfile) rmSync(profile, { recursive: true, force: true })
}
