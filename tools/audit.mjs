// "Nothing unusable" audit: clicks every visible element of each scenario and reports the ones
// whose click does nothing (no event other than hover/press/focus, and no visible change).
//
// usage: node tools/audit.mjs [--url base] [--scenarios desktop,music,...] [--out out/audit]
//        [--step 8] [--limit 0] [--size 960x720]
// --size: the window's CSS size (default 960x720: the stage is the frame at scale 1); at another
// shape the stage is scaled and wider or taller than the frame (core/Stage.jsx), and the grid of
// targets covers all of it.
// Scenarios are reached by emitting events (window.__lh.emit) from a fresh interactive page; after
// each click the event log is restored to the scenario's snapshot (UI state is derived from the
// log), so every click starts from the same state.
// Output: out/audit/<scenario>.png (dead targets boxed in red, live ones in green) and a list.
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PNG } from './lib/png.mjs'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  if (i < 0) return def
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const base = opt('--url', 'http://127.0.0.1:5398/longhorn-concept/')
const out = opt('--out', 'out/audit')
const step = +opt('--step', 8)
const limit = +opt('--limit', 0)
const [VW, VH] = opt('--size', '960x720').split('x').map(Number)
mkdirSync(out, { recursive: true })

// scenario -> events to emit (in order, with waits) from a fresh page
const SCENARIOS = {
  login: [],
  loginSelected: [['login.select', { id: 'sondra' }], 1800],
  desktop: [['login.submit', {}], 3500],
  start: [['login.submit', {}], 3500, ['shell.popup', { id: 'start', open: true }], 900],
  flyout: [['login.submit', {}], 3500, ['desk.flyout', { open: true }], 1200],
  music: [['login.submit', {}], 3500, ['win.open', { id: 'music', app: 'music' }], 3500],
  album: [['login.submit', {}], 3500, ['win.open', { id: 'music', app: 'music' }], 3500, ['music.album', { id: 10 }], 2500],
}
const pick = opt('--scenarios', null)
// any registered app: "app:<id>" opens win id <id> with that app
const names = pick ? pick.split(',') : Object.keys(SCENARIOS)

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9200 + Math.floor(Math.random() * 90)
const profile = mkdtempSync(join(tmpdir(), 'lhaudit-'))
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
  `--window-size=${VW},${VH}`, '--force-device-scale-factor=1', '--enable-gpu', '--ignore-gpu-blocklist', 'about:blank',
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
const shot = async () => PNG.decode(Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
const mouse = async (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })

// pixels that differ by more than 24 in any channel
function diffMask(a, b) {
  const m = new Uint8Array(a.width * a.height)
  for (let i = 0, p = 0; i < m.length; i++, p += 4) {
    const d = Math.max(Math.abs(a.data[p] - b.data[p]), Math.abs(a.data[p + 1] - b.data[p + 1]), Math.abs(a.data[p + 2] - b.data[p + 2]))
    m[i] = d > 24 ? 1 : 0
  }
  return m
}

async function fresh() {
  await send('Page.navigate', { url: base })
  for (let i = 0; i < 300 && !(await evaluate('!!(window.__lh && window.__lh.emit)').catch(() => false)); i++) await sleep(100)
  await evaluate('window.__lh.ready()')
  // the boot fades the login screen in (os/session.js BOOT_DUR) and blocks input meanwhile
  for (let i = 0; i < 100 && (await evaluate('window.__lh.now()')) < 1.2; i++) await sleep(50)
  await sleep(800)
}

async function runScenario(name) {
  await fresh()
  let steps = SCENARIOS[name]
  if (name.startsWith('app:')) {
    const app = name.slice(4)
    steps = [['login.submit', {}], 3500, ['win.open', { id: app, app }], 3000]
  }
  for (const s of steps) {
    if (typeof s === 'number') await sleep(s)
    else await evaluate(`window.__lh.emit(${JSON.stringify(s[0])}, ${JSON.stringify(s[1])})`)
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: VW - 1, y: 1 })
  await sleep(400)
  const snapshot = await evaluate('window.__lh.log().length')
  let snap = await evaluate('JSON.stringify(window.__lh.log())')
  const restore = async (force = false) => {
    // a click may have reloaded or broken the page: rebuild the scenario then
    const ok = !force && (await evaluate('!!(window.__lh && window.__lh.setLog)').catch(() => false))
    if (!ok) {
      await fresh()
      for (const s of steps) {
        if (typeof s === 'number') await sleep(s)
        else await evaluate(`window.__lh.emit(${JSON.stringify(s[0])}, ${JSON.stringify(s[1])})`)
      }
      snap = await evaluate('JSON.stringify(window.__lh.log())')
    }
    await evaluate(`window.__lh.setLog(JSON.parse(${JSON.stringify(snap)}))`)
  }
  // self-changing pixels: two shots 1.2 s apart, dilated
  const s0 = await shot()
  await sleep(1200)
  const s1 = await shot()
  const self = diffMask(s0, s1)
  // targets: unique topmost elements on a grid
  const targets = await evaluate(`(() => {
    const stage = document.getElementById('stage').getBoundingClientRect()
    const seen = new Map()
    for (let y = stage.top + ${step / 2}; y < stage.bottom; y += ${step}) {
      for (let x = stage.left + ${step / 2}; x < stage.right; x += ${step}) {
        const el = document.elementFromPoint(x, y)
        if (!el || el.id === 'stage') continue
        const r = el.getBoundingClientRect()
        if (r.width * r.height > stage.width * stage.height * 0.2) continue
        if (!seen.has(el)) seen.set(el, { x, y, n: 0, r })
        seen.get(el).n++
      }
    }
    const out = []
    for (const [el, v] of seen) {
      if (v.n < 2 && v.r.width * v.r.height > 64) continue
      const text = (el.textContent || '').trim().slice(0, 40) || el.getAttribute('data-hit') || el.tagName.toLowerCase()
      // click at a sampled point that hits this element (its centre may be covered)
      const cx = v.r.left + v.r.width / 2, cy = v.r.top + v.r.height / 2
      const p = document.elementFromPoint(cx, cy) === el ? { x: cx, y: cy } : { x: v.x, y: v.y }
      out.push({ x: p.x, y: p.y, text, rect: [v.r.left, v.r.top, v.r.width, v.r.height] })
    }
    return out
  })()`)
  const todo = limit ? targets.slice(0, limit) : targets
  const results = []
  for (const tg of todo) {
    await mouse('mouseMoved', tg.x, tg.y)
    await sleep(350)
    const a = await shot()
    const n0 = await evaluate('window.__lh ? window.__lh.log().length : 0')
    await mouse('mousePressed', tg.x, tg.y)
    await sleep(40)
    await mouse('mouseReleased', tg.x, tg.y)
    await sleep(1100)
    const evs = await evaluate(`(window.__lh ? window.__lh.log() : []).slice(${n0}).map(e => e.type).filter(t => !['hover', 'press', 'ui.focus', 'login.hover', 'power.hover'].includes(t))`).catch(() => ['(page navigated)'])
    const b = await shot()
    const m = diffMask(a, b)
    let changed = 0
    for (let i = 0; i < m.length; i++) if (m[i] && !self[i]) changed++
    const live = evs.length > 0 || changed > 40
    const errs = events.filter((e) => e.method === 'Runtime.exceptionThrown').splice(0)
    for (const e of errs) events.splice(events.indexOf(e), 1)
    const error = errs.length ? (errs[0].params.exceptionDetails.exception?.description ?? errs[0].params.exceptionDetails.text) : null
    results.push({ ...tg, live: live && !error, evs, changed, error })
    if (error) {
      console.log(`  ERROR after clicking ${JSON.stringify(tg.text)} at ${Math.round(tg.x)},${Math.round(tg.y)}:\n    ${error.split('\n').slice(0, 6).join('\n    ')}`)
      // the page may be broken: rebuild the scenario from scratch
      await restore(true)
      await mouse('mouseMoved', VW - 1, 1)
      await sleep(500)
      continue
    }
    // restore the scenario
    await restore()
    await mouse('mouseMoved', VW - 1, 1)
    await sleep(500)
  }
  const dead = results.filter((r) => !r.live)
  console.log(`${name}: ${results.length} targets, ${dead.length} dead`)
  for (const d of dead) console.log(`  dead  ${JSON.stringify(d.text)}  at ${Math.round(d.x)},${Math.round(d.y)}  size ${Math.round(d.rect[2])}x${Math.round(d.rect[3])}`)
  // annotated screenshot
  const img = s0
  const box = (r, col) => {
    const [x0, y0, w, h] = r.map(Math.round)
    for (let x = x0; x < x0 + w; x++) for (const y of [y0, y0 + h - 1]) put(x, y, col)
    for (let y = y0; y < y0 + h; y++) for (const x of [x0, x0 + w - 1]) put(x, y, col)
  }
  const put = (x, y, c) => {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) return
    const p = (y * img.width + x) * 4
    img.data[p] = c[0]; img.data[p + 1] = c[1]; img.data[p + 2] = c[2]
  }
  for (const r of results) box(r.rect, r.live ? [0, 220, 0] : [255, 0, 0])
  writeFileSync(join(out, `${name.replace(':', '_')}.png`), PNG.encode(img))
  writeFileSync(join(out, `${name.replace(':', '_')}.json`), JSON.stringify(results, null, 1))
  return dead.length
}

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false })
  let total = 0
  for (const n of names) total += await runScenario(n)
  console.log(`dead targets: ${total}`)
  for (const e of events.filter((e) => e.method === 'Runtime.exceptionThrown'))
    console.error('page error:', e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text)
} finally {
  ws.close()
  chrome.kill()
  await sleep(200)
  rmSync(profile, { recursive: true, force: true })
}
