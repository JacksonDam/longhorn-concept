// Is a window's text as sharp at rest as a fresh raster? Chrome keeps a will-change: transform
// layer at the raster scale it was first drawn at, so a window first drawn mid-zoom can stay soft
// once still. This steps the ?bench path (?apps=every, src/apps/lib/benchScript.js) through each
// state below frame by frame, as real time draws it, and screenshots a window at rest; then drops
// every layer hint on the page for a few frames (a fresh raster of everything at the scale it
// shows at), screenshots again and compares: RMSE between the two and the share of the fresh
// raster's edge energy (squared Laplacian) the window keeps (100% = as sharp).
//
// usage: node tools/sharpness.mjs [--url base] [--size 1920x1080] [--dpr 1] [--apps music,ie]
//        [--shots dir] [--realtime]
// --realtime: the real OS in real time (the stage at the screen's shape) instead of the ?bench
// path: logs in, then opens, minimises, restores, maximises and restores down each window with
// input events at the clock's time (a pointer's prepare before each), waiting for each to settle
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from './lib/png.mjs'
import { pressPower } from './lib/power.mjs'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i < 0 ? def : args[i + 1]
}
const base = opt('--url', 'http://127.0.0.1:5325/longhorn-concept/')
const [W, H] = opt('--size', '1920x1080').split('x').map(Number)
const dpr = +opt('--dpr', 1)
const shots = opt('--shots', null)
if (shots) mkdirSync(shots, { recursive: true })
const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '../src/apps/lib/benchScript.js'), 'utf8')
const apps = [...src.slice(src.indexOf('export const EVERY = ')).matchAll(/\['(\w+)', '([^']+)'/g)].map((m) => [m[1], m[2]])
const SLOT = +src.match(/EVERY_SLOT = (\d+)/)[1]
const AT = Object.fromEntries([...src.match(/EVERY_AT = \{([^}]+)\}/)[1].matchAll(/(\w+): (\d+)/g)].map((m) => [m[1], +m[2]]))
const only = opt('--apps', 'music,ie,notepad').split(',')
const realtime = args.includes('--realtime')
// the states, as the frame of the slot to stop at (the window still there)
const STATES = [['opened', AT.minimise - 2], ['restored', AT.maximise - 2], ['maximised', AT.unmaximise - 2], ['restored down', AT.close - 2]]

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9700 + Math.floor(Math.random() * 90)
const profile = mkdtempSync(join(tmpdir(), 'lhsharp-'))
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars',
  `--window-size=${W},${H}`, `--force-device-scale-factor=${dpr}`, '--enable-gpu', '--ignore-gpu-blocklist', 'about:blank',
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
const frames = (n) => evaluate(`new Promise((r) => { let k = ${n}; const f = () => (--k > 0 ? requestAnimationFrame(f) : r(true)); requestAnimationFrame(f) })`)
// the top window's live layer in page px (its body: the plus-lighter layer that takes pointer events)
const rectJs = `(() => {
  const d = [...document.querySelectorAll('#stage div')].filter((d) => d.style.mixBlendMode === 'plus-lighter' && d.style.pointerEvents === 'auto')
  if (!d.length) return null
  const z = d.map((e) => [e, +e.parentElement.parentElement.style.zIndex]).sort((a, b) => b[1] - a[1])[0][0]
  const b = z.getBoundingClientRect()
  return { x: Math.max(0, Math.round(b.left)), y: Math.max(0, Math.round(b.top)), w: Math.round(Math.min(b.width, innerWidth - b.left)), h: Math.round(Math.min(b.height, innerHeight - b.top)) }
})()`
async function shot(r, name) {
  const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } })
  const buf = Buffer.from(s.data, 'base64')
  if (shots) writeFileSync(join(shots, name + '.png'), buf)
  return PNG.decode(buf)
}
const lum = (img) => {
  const { width: w, height: h, data } = img
  const ch = data.length / (w * h)
  const g = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * data[i * ch] + 0.587 * data[i * ch + 1] + 0.114 * data[i * ch + 2]
  return { w, h, g }
}
const edge = ({ w, h, g }) => {
  let e = 0
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w]
    e += l * l
  }
  return e
}
const rmse = (a, b) => {
  let s = 0
  for (let i = 0; i < a.g.length; i++) s += (a.g[i] - b.g[i]) ** 2
  return Math.sqrt(s / a.g.length)
}

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: dpr, mobile: false })
  await send('Page.navigate', { url: realtime ? base : base + '?bench&scaled&apps=every' })
  // (the real OS opens on the power button: pressed)
  if (realtime) await pressPower(send, evaluate)
  for (let i = 0; i < 600 && !events.some((e) => e.method === 'Page.loadEventFired'); i++) await sleep(100)
  for (let i = 0; i < 600 && !(await evaluate('!!(window.__lh && window.__lh.seekFrame)')); i++) await sleep(100)
  await evaluate('window.__lh.ready()')
  console.log('app'.padEnd(10) + STATES.map(([s]) => s.padStart(24)).join('') + '   (RMSE vs a fresh raster, edge energy kept)')
  if (realtime) {
    await sleep(1500)
    await evaluate("(window.__lh.emit('login.submit', {}), true)")
    await sleep(4000)
  }
  const ev = (type, data) => evaluate(`(window.__wm.emit(${JSON.stringify(type)}, ${JSON.stringify(data)}), true)`)
  // real time: the input that leads to each state (with the prepare a pointer gives first)
  const RT = {
    opened: async (id, a, props) => ev('win.open', props ? { id, app: a, props } : { id, app: a }),
    restored: async (id) => {
      await ev('win.prepare', { id })
      await sleep(1100)
      await ev('win.minimize', { id })
      await sleep(600)
      await ev('hover', { id: 'tb.' + id, on: true })
      await sleep(1100)
      await ev('win.restore', { id })
      await ev('hover', { id: 'tb.' + id, on: false })
    },
    maximised: async (id) => ev('win.maximize', { id }),
    'restored down': async (id) => ev('win.unmaximize', { id }),
  }
  for (const [app, wid] of apps.filter(([a]) => only.includes(a))) {
    const f = 1540 + apps.findIndex(([a]) => a === app) * SLOT
    let line = app.padEnd(10)
    let from = f - 4
    for (const [name, at] of STATES) {
      if (realtime) {
        const props = JSON.parse((src.match(new RegExp(`\\['${app}', '[^']+', (\\{[^}]*\\})\\]`)) || [])[1]?.replace(/(\w+):/g, '"$1":').replace(/'/g, '"') || 'null')
        await RT[name](wid, app, props)
        await sleep(2500)
      } else {
        // step every frame up to the state, as real time draws them
        const fr = []
        for (let n = from; n <= f + at; n++) fr.push(n)
        from = f + at + 1
        await evaluate(`window.__lh.bench(${JSON.stringify(fr)}).then(() => true)`)
      }
      await frames(6)
      const r = await evaluate(rectJs)
      if (!r) { line += 'no window'.padStart(24); continue }
      const a = lum(await shot(r, `${app}-${name.replace(' ', '-')}-rest`))
      // a fresh raster: no layer hints for a few frames, then back
      await evaluate(`(() => { const s = document.createElement('style'); s.id = 'lh-nohint'; s.textContent = '#stage * { will-change: auto !important }'; document.head.appendChild(s); return true })()`)
      await frames(4)
      await evaluate(`(document.getElementById('lh-nohint').remove(), true)`)
      await frames(6)
      const b = lum(await shot(r, `${app}-${name.replace(' ', '-')}-fresh`))
      line += `${rmse(a, b).toFixed(2).padStart(10)} ${((100 * edge(a)) / edge(b)).toFixed(1).padStart(8)}%     `
    }
    console.log(line)
    if (realtime) {
      await ev('win.close', { id: wid })
      await sleep(1500)
    }
  }
} finally {
  ws.close()
  chrome.kill()
  await sleep(200)
  rmSync(profile, { recursive: true, force: true })
}
