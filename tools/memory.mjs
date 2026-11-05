// Memory harness: peak footprint of the page's processes through a whole session, on three engines.
// The session is a scripted log (?demo&scenario=windows, src/demo/windows.js), so every engine
// plays the same input with no input injection: the boot (a first visit: a fresh profile), log
// in, my Music, an album, minimise / restore, every launcher app opened and left open (fifteen
// windows), then three minutes of use (minimise, restore, close, reopen, album pages, a drag).
// Footprint = phys_footprint (what iOS's memory limit counts) from /usr/bin/footprint, sampled
// every 0.5 s: WebKit's WebContent + GPU processes, or Chrome's renderers + GPU process.
//
// usage: node tools/memory.mjs [--engine chrome|webkit|ios] [--device iphone|land|ipad|desktop]
//          [--url http://127.0.0.1:5311/longhorn-concept/] [--query extra=1] [--seconds n]
//          [--sim "iPhone Duo"] [--json out.json] [--quick]
//   chrome: headless Chrome with the device emulated (iphone = 390x844 at DPR 3, mobile)
//   webkit: Playwright WebKit (devDependency `playwright`; once: npx playwright install webkit)
//   ios:    Mobile Safari on an iOS Simulator (Xcode with an iOS runtime: xcodebuild
//           -downloadPlatform iOS); boots --sim (default iPhone Duo) if needed, the device size is
//           the simulator's own; page errors can't be read there
//   --quick: the boot and the first 50 s only (login, my Music, album, the apps opening)
//   --shots dir: (ios) a simulator screenshot every 10 s; --query rehearse=all forces a first
//   visit's boot where the browser keeps its data (Safari on the simulator)
// Prints the peak (total, and each process kind), the peak per phase and page errors; exits 1
// on page errors or a crashed page.
import { spawn, execFile, execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i < 0 ? d : args[i + 1]
}
const engine = opt('--engine', 'chrome')
const device = opt('--device', 'iphone')
const base = opt('--url', 'http://127.0.0.1:5311/longhorn-concept/')
const extra = opt('--query', '')
const quick = args.includes('--quick')
const seconds = +opt('--seconds', 0)
const simName = opt('--sim', 'iPhone Duo')
const jsonOut = opt('--json', null)
const shotsDir = opt('--shots', null) // ios: a simulator screenshot every 10 s into this folder
const url = base + (base.includes('?') ? '&' : '?') + 'demo&scenario=windows' + (extra ? '&' + extra : '')
const PHASES = [['login', 1], ['my Music', 150], ['album', 260], ['minimise, restore', 340], ['open every app', 480], ['use', 1380], ['end', 6800]]
const END = quick ? 1500 : 6800 // video frames of the scenario to play
const DEVICES = {
  iphone: { width: 390, height: 844, dpr: 3, mobile: true },
  land: { width: 844, height: 390, dpr: 3, mobile: true },
  ipad: { width: 834, height: 1194, dpr: 2, mobile: true },
  desktop: { width: 1440, height: 1080, dpr: 1, mobile: false },
}
const dev = DEVICES[device]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sh = (cmd, a) => new Promise((res) => execFile(cmd, a, { maxBuffer: 1 << 26 }, (e, so) => res(so || '')))
const footprint = async (pid) => {
  const m = /Footprint: (\d+(?:\.\d+)?) (KB|MB|GB)/.exec(await sh('/usr/bin/footprint', ['-p', String(pid)]))
  return m ? +m[1] * (m[2] === 'GB' ? 1024 : m[2] === 'KB' ? 1 / 1024 : 1) : 0
}
const procTable = async () =>
  (await sh('/bin/ps', ['-axo', 'pid=,ppid=,command='])).split('\n').filter(Boolean).map((l) => {
    const m = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(l)
    return { pid: +m[1], ppid: +m[2], cmd: m[3] }
  })

// ------------------------------------------------------------------ engines
// each returns { procs(): [[pid, kind]], appTime(): seconds | null, errors: [], close() }
async function chrome() {
  const profile = mkdtempSync(join(tmpdir(), 'lhmem-'))
  const port = 9600 + Math.floor(Math.random() * 90)
  const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run',
    `--window-size=${dev.width},${dev.height}`, '--enable-gpu', '--ignore-gpu-blocklist', '--ignore-certificate-errors', 'about:blank',
  ], { stdio: 'ignore' })
  let list
  for (let i = 0; i < 100 && !list; i++) {
    await sleep(100)
    try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() } catch { /* not up */ }
  }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
  let id = 0
  const pending = {}
  const errors = []
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending[m.id]) pending[m.id](m)
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
    else if (m.method === 'Inspector.targetCrashed') errors.push('CRASH: renderer crashed')
  }
  await new Promise((r) => (ws.onopen = r))
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending[i] = (m) => res(m.result); ws.send(JSON.stringify({ id: i, method, params })) })
  await send('Runtime.enable')
  await send('Inspector.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: dev.width, height: dev.height, deviceScaleFactor: dev.dpr, mobile: dev.mobile })
  if (dev.mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  await send('Page.navigate', { url })
  const kids = async () => {
    const t = await procTable()
    const mine = new Set([proc.pid])
    for (let changed = true; changed; ) {
      changed = false
      for (const p of t) if (!mine.has(p.pid) && mine.has(p.ppid)) mine.add(p.pid), (changed = true)
    }
    return t.filter((p) => mine.has(p.pid) && /--type=(renderer|gpu-process)/.test(p.cmd) && !/--extension-process/.test(p.cmd)).map((p) => [p.pid, /gpu-process/.test(p.cmd) ? 'gpu' : 'renderer'])
  }
  return {
    procs: kids,
    appTime: async () => (await send('Runtime.evaluate', { expression: 'window.__lh && window.__lh.booted ? window.__lh.now() : null', returnByValue: true }))?.result?.value ?? null,
    errors,
    close: async () => { try { ws.close() } catch { /* closed */ } proc.kill(); await sleep(300); rmSync(profile, { recursive: true, force: true }) },
  }
}

async function webkit() {
  const { webkit: wk } = await import('playwright')
  const before = new Set((await procTable()).map((p) => p.pid))
  const b = await wk.launch({ headless: true })
  const ctx = await b.newContext({ viewport: { width: dev.width, height: dev.height }, deviceScaleFactor: dev.dpr, isMobile: dev.mobile, hasTouch: dev.mobile })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text().slice(0, 300)))
  page.on('crash', () => errors.push('CRASH: page crashed'))
  page.goto(url).catch((e) => errors.push('goto: ' + e.message.split('\n')[0]))
  return {
    procs: async () => (await procTable()).filter((p) => !before.has(p.pid) && /WebKit\.(WebContent|GPU)/.test(p.cmd)).map((p) => [p.pid, /GPU/.test(p.cmd) ? 'gpu' : 'webcontent']),
    appTime: async () => page.evaluate(() => (window.__lh && window.__lh.booted ? window.__lh.now() : null)).catch(() => null),
    errors,
    close: () => b.close(),
  }
}

async function ios() {
  const env = { ...process.env, DEVELOPER_DIR: process.env.DEVELOPER_DIR || '/Applications/Xcode.app/Contents/Developer' }
  const x = (a) => execFileSync('xcrun', ['simctl', ...a], { env, stdio: ['ignore', 'pipe', 'ignore'] }).toString()
  const devs = JSON.parse(x(['list', 'devices', '-j'])).devices
  const sim = Object.values(devs).flat().find((d) => d.name === simName && d.isAvailable)
  if (!sim) throw new Error('no simulator named ' + simName)
  if (sim.state !== 'Booted') {
    x(['boot', sim.udid])
    execFileSync('xcrun', ['simctl', 'bootstatus', sim.udid, '-b'], { env, stdio: 'ignore' })
  }
  try { x(['terminate', sim.udid, 'com.apple.mobilesafari']) } catch { /* not running */ }
  await sleep(1500)
  // the simulator's processes run on the host, from its runtime's root
  const simProcs = async () => (await procTable()).filter((p) => /RuntimeRoot.*WebKit\.(WebContent|GPU)/.test(p.cmd)).map((p) => [p.pid, /GPU/.test(p.cmd) ? 'gpu' : 'webcontent'])
  // a fresh visit: Safari's website data for the page goes with a reset of its data container
  x(['openurl', sim.udid, url])
  return {
    procs: simProcs,
    appTime: async () => null,
    errors: [],
    note: `simulator ${sim.name} (${sim.udid}); page errors are not readable here`,
    // (a multi-display simulator, e.g. iPhone Duo, needs its display named)
    shot: (file) => { for (const a of [['--display=1'], []]) try { return x(['io', sim.udid, 'screenshot', ...a, file]) } catch { /* next */ } },
    close: async () => { try { x(['terminate', sim.udid, 'com.apple.mobilesafari']) } catch { /* gone */ } },
  }
}

// ------------------------------------------------------------------ run
const E = engine === 'webkit' ? await webkit() : engine === 'ios' ? await ios() : await chrome()
const t0 = Date.now()
const samples = []
const limit = seconds || (quick ? 110 : 300)
let appT = null
for (;;) {
  const wall = (Date.now() - t0) / 1000
  const procs = await E.procs()
  const s = { wall, app: null, total: 0 }
  for (const [pid, kind] of procs) {
    const v = await footprint(pid)
    s[kind] = (s[kind] || 0) + v
    s.total += v
  }
  appT = await E.appTime()
  s.app = appT
  samples.push(s)
  if (shotsDir && E.shot && Math.floor(wall / 10) !== Math.floor((samples.at(-2)?.wall ?? -10) / 10)) {
    mkdirSync(shotsDir, { recursive: true })
    E.shot(join(shotsDir, `t${String(Math.round(wall)).padStart(3, '0')}.png`))
  }
  const frame = appT == null ? null : appT * (30000 / 1001) + 1
  if (frame != null && frame > END + 150) break
  if (wall > limit) break
  if (E.errors.some((e) => e.startsWith('CRASH'))) break
  await sleep(500)
}
await E.close()

// phase of a sample: boot until the clock runs, then the scenario's phases by its frame
const phaseOf = (s) => {
  if (s.app == null) return engine === 'ios' ? 'session (wall clock)' : 'boot'
  const f = s.app * (30000 / 1001) + 1
  let n = PHASES[0][0]
  for (const [name, from] of PHASES) if (f >= from) n = name
  return n
}
const peak = samples.reduce((m, s) => (s.total > m.total ? s : m), { total: 0 })
const kinds = [...new Set(samples.flatMap((s) => Object.keys(s).filter((k) => !['wall', 'app', 'total'].includes(k))))]
const fmt = (s) => `${s.total.toFixed(0)} MB (${kinds.map((k) => `${k} ${(s[k] || 0).toFixed(0)}`).join(', ')})`
console.log(`memory: ${engine} ${device === 'iphone' && engine !== 'ios' ? 'iPhone 390x844 DPR 3' : engine === 'ios' ? simName : device} ${url}`)
if (E.note) console.log(E.note)
console.log(`peak ${fmt(peak)} at ${peak.wall.toFixed(1)} s (${phaseOf(peak)})`)
const phases = {}
for (const s of samples) {
  const p = phaseOf(s)
  if (!phases[p] || s.total > phases[p].total) phases[p] = s
}
for (const [p, s] of Object.entries(phases)) console.log(`  ${p.padEnd(20)} ${fmt(s)}`)
if (engine === 'ios') {
  // no page clock there: the peak of every 15 s of wall time
  for (let a = 0; a < limit; a += 15) {
    const w = samples.filter((s) => s.wall >= a && s.wall < a + 15)
    if (w.length) console.log(`  ${String(a).padStart(3)}-${a + 15} s`.padEnd(22) + fmt(w.reduce((m, s) => (s.total > m.total ? s : m))))
  }
}
console.log('page errors:', E.errors.length ? '\n  ' + E.errors.join('\n  ') : 'none')
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ engine, device, url, peak, phases, samples, errors: E.errors }))
process.exit(E.errors.length ? 1 : 0)
