// First-use animations in a fresh browser profile: does the very first Start menu open, desktop
// right-click, sidebar menu, taskbar button menu and window menu animate like the later ones?
// Loads the real OS (cold HTTP cache, no profile), waits for the boot, logs in, then opens and
// closes each popup twice with real mouse input at real speed. For every animation frame after an
// open it records the frame's interval and how far into the popup's animation it drew (video
// frames since the event): a popup animated if at least one frame drew a pose between its start
// and its end. Prints, per popup and try: the first frame's interval, the poses drawn, and
// whether an in-between pose showed.
//
// usage: node tools/firstopen.mjs [--url http://127.0.0.1:5325/longhorn-concept/] [--engine chrome|webkit]
//        [--size 1920x1080] [--dpr 1] [--query rehearse=none] [--trace out.json] [--hz 144]
//        [--only start,desk,user,buddies,taskbar,file] (which popups, in this order) [--stall ms]
// --stall: the first frame of each first open blocks the main thread this long (a cold first use)
//        [--windows music,computer] (instead of the popups: each window opened, minimised with the
//        pointer on its minimise button, restored from its taskbar button, maximised, restored down
//        and closed with real clicks, twice; per step the frames drawn in the 0.8 s after its event,
//        the frames that missed a display frame (an interval over 1.5 display frames: 144 Hz in
//        Chrome, WebKit's own ~60 Hz timer) and the longest interval) [--loaf] (with --windows: the
//        long-animation-frame entries around each interval over 20 ms; none = not main-thread work)
//        [--tilt] (with --windows: after each open the pointer circles the header slab for 2 s)
// --trace (Chrome): writes a Chrome trace of the first Start menu open (for chrome://tracing)
// Chrome runs unpaced (vsync off) with requestAnimationFrame paced to a --hz grid, as
// tools/coldstart.mjs does; WebKit's own timer paces it.
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pressPower, pressPowerPage } from './lib/power.mjs'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i < 0 ? def : args[i + 1]
}
const base = opt('--url', 'http://127.0.0.1:5325/longhorn-concept/')
const engine = opt('--engine', 'chrome')
const [W, H] = opt('--size', '1920x1080').split('x').map(Number)
const dpr = +opt('--dpr', 1)
const query = opt('--query', '')
const traceOut = opt('--trace', null)
const hz = +opt('--hz', 144)
const stall = +opt('--stall', 0)
const loafOut = args.includes('--loaf')
const tilt = args.includes('--tilt')
const url = base + (query ? (base.includes('?') ? '&' : '?') + query : '')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// popups: [name, event type, id, animation length in video frames]
const DUR = { start: 4, menu: 3 }

// the page side: a frame recorder (rAF paced to an hz grid in Chrome, so idle frames don't hide
// a long one), installed before the app runs
const RECORDER = `(() => {
  const F = (window.__fo = { frames: [] })
  // (tools/coldstart.mjs's display: callbacks run on the first native frame after each grid tick;
  // a 1 px change every native frame, or Chrome idles between ticks)
  const HZ = ${engine === 'chrome' ? hz : 0}
  if (HZ) {
    const native = window.requestAnimationFrame.bind(window)
    const P = 1000 / HZ
    let cbs = new Map(), nextId = 1, lastTick = -1, armed = false, dmg = null, k = 0
    const pump = () => {
      armed = false
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
  // F.stall: block the main thread this long in the first frame after the next event (a stand-in
  // for a first use's cost, to see what the frame after it shows)
  let n0 = -1
  F.loaf = []
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        F.loaf.push({ start: e.startTime, dur: e.duration, render: e.renderStart, style: e.styleAndLayoutStart,
          scripts: e.scripts.map((s) => ({ dur: s.duration, inv: s.invoker, fn: s.sourceFunctionName, pos: s.sourceCharPosition, forced: s.forcedStyleAndLayoutDuration })) })
    }).observe({ type: 'long-animation-frame' })
  } catch {}
  const rec = () => {
    F.frames.push([performance.now(), window.__lh ? window.__lh.now() : -1])
    const log = window.__lh ? window.__lh.log() : []
    if (F.stall && n0 >= 0 && log.slice(n0).some((e) => (e.type === 'shell.popup' || e.type === 'ui.menu') && e.open)) {
      const until = performance.now() + F.stall
      F.stall = 0
      while (performance.now() < until) {}
    }
    n0 = log.length
    window.requestAnimationFrame(rec)
  }
  window.requestAnimationFrame(rec)
})()`

async function chromeSession() {
  const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const port = 9600 + Math.floor(Math.random() * 90)
  const profile = mkdtempSync(join(tmpdir(), 'lhfirst-'))
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
  let chunks = [], traceDone = null
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending[m.id]) pending[m.id](m)
    else if (m.method === 'Tracing.dataCollected') chunks.push(...m.params.value)
    else if (m.method === 'Tracing.tracingComplete') traceDone?.()
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
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: dpr, mobile: false })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER })
  await send('Page.navigate', { url })
  // (the real OS opens on the power button: pressed)
  await pressPower(send, evaluate)
  const mouse = (type, x, y, button = 'none') => send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: type === 'mouseMoved' ? 0 : 1 })
  const escape = async () => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  }
  return {
    evaluate,
    mouse,
    escape,
    errors: () => events.filter((e) => e.method === 'Runtime.exceptionThrown').map((e) => e.params.exceptionDetails.exception?.description ?? e.params.exceptionDetails.text),
    traceStart: () => {
      chunks = []
      return send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing', 'gpu', 'viz', 'cc', 'v8.execute', 'blink', 'loading'] } })
    },
    traceStop: () => new Promise((r) => { traceDone = () => r(chunks); send('Tracing.end') }),
    close: async () => {
      ws.close()
      chrome.kill()
      await sleep(300)
      rmSync(profile, { recursive: true, force: true })
    },
  }
}

async function webkitSession() {
  const { webkit } = await import('playwright')
  const browser = await webkit.launch()
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.addInitScript(RECORDER)
  await page.goto(url)
  await pressPowerPage(page)
  const btn = { left: 'left', right: 'right', none: undefined }
  return {
    evaluate: (expr) => page.evaluate(expr),
    mouse: async (type, x, y, button = 'none') => {
      if (type === 'mouseMoved') return page.mouse.move(x, y)
      if (type === 'mousePressed') return page.mouse.down({ button: btn[button] })
      return page.mouse.up({ button: btn[button] })
    },
    errors: () => errors,
    escape: () => page.keyboard.press('Escape'),
    traceStart: async () => {},
    traceStop: async () => [],
    close: () => browser.close(),
  }
}

const S = engine === 'webkit' ? await webkitSession() : await chromeSession()
try {
  for (let i = 0; i < 600 && !(await S.evaluate('!!(window.__lh && window.__lh.booted)').catch(() => false)); i++) await sleep(100)
  const boot = await S.evaluate('JSON.stringify(window.__lh.bootStats)')
  console.log(`${engine} ${W}x${H} DPR ${dpr}: boot ${boot}`)
  await sleep(1500)
  await S.evaluate("(window.__lh.emit('login.submit', { id: 'sondra' }), true)")
  await sleep(4500)
  const st = await S.evaluate(`(() => { const e = document.getElementById('stage'), b = e.getBoundingClientRect(), d = e.dataset; return { x: b.x, y: b.y, s: +d.s, dw: d.w - 960, dh: d.h - 720, mode: d.mode } })()`)
  console.log(`stage ${st.mode} s ${st.s} (+${st.dw}, +${st.dh})`)
  const P = (x, y) => ({ x: st.x + x * st.s, y: st.y + y * st.s })
  let at = P(600, 400)
  async function moveTo(p, steps = 10) {
    for (let i = 1; i <= steps; i++) {
      await S.mouse('mouseMoved', at.x + (p.x - at.x) * (i / steps), at.y + (p.y - at.y) * (i / steps))
      await sleep(16)
    }
    at = p
  }
  async function click(x, y, button = 'left') {
    const p = P(x, y)
    await moveTo(p)
    await sleep(120)
    await S.mouse('mousePressed', p.x, p.y, button)
    await sleep(70)
    await S.mouse('mouseReleased', p.x, p.y, button)
  }
  // the stage position of an element (by a selector run in the page), its centre
  const find = async (js) => {
    const r = await S.evaluate(`(() => { const el = (${js})(); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } })()`)
    return r && { x: (r.x - st.x) / st.s, y: (r.y - st.y) / st.s }
  }
  // one popup open: the frames drawn from its event on (until it has settled), with the event's
  // time from the log
  async function measure(name, type, matchJs, dur, open) {
    const n0 = await S.evaluate('window.__fo.frames.length')
    const t0 = await S.evaluate('window.__lh.now()')
    await open()
    await sleep(700)
    const r = await S.evaluate(`(() => {
      const ev = window.__lh.log().filter((e) => e.type === ${JSON.stringify(type)} && e.t >= ${t0} && (${matchJs})(e))[0]
      return { ev: ev ? ev.t : null, frames: window.__fo.frames.slice(${n0}) }
    })()`)
    if (r.ev == null) return console.log(`${name.padEnd(26)} (no ${type} event)`)
    const FPS = 30000 / 1001
    const fr = r.frames.filter(([, t]) => t >= r.ev)
    const before = r.frames.filter(([, t]) => t < r.ev).pop()
    // a frame's interval: from the previous frame's start to its own (its cost shows on the next)
    const rows = fr.slice(0, 12).map(([p, t], i) => {
      const prev = i ? fr[i - 1][0] : before ? before[0] : p
      return { df: (t - r.ev) * FPS, dt: p - prev }
    })
    const shown = rows.filter((x) => x.df > 0.25 && x.df < dur - 0.25).length
    const nextDt = fr[1] ? fr[1][0] - fr[0][0] : 0
    console.log(`${name.padEnd(26)} first frame ${nextDt.toFixed(0).padStart(4)} ms; poses ${rows.map((x) => x.df.toFixed(1)).join(' ')}  -> ${shown ? 'animated (' + shown + ' in-between frames)' : 'NOT animated'}`)
  }
  const closePopup = async () => {
    await S.escape()
    await sleep(600)
  }
  const tries = [1, 2]
  const STEPS = {
    start: async (k) => measure(`Start menu #${k}`, 'shell.popup', "(e) => e.id === 'start' && e.open", DUR.start, () => click(30, 710 + st.dh)),
    desk: async (k) => measure(`desktop menu #${k}`, 'ui.menu', "(e) => e.id === 'desk.ctx' && e.open != null", DUR.menu, () => click(500, 300, 'right')),
    user: async (k) => measure(`sidebar user menu #${k}`, 'ui.menu', "(e) => e.id === 'sb.user' && e.open != null", DUR.menu, () => click(858 + st.dw + 50, 10)),
    buddies: async (k) => measure(`sidebar buddies menu #${k}`, 'ui.menu', "(e) => e.id === 'sb.status' && e.open != null", DUR.menu, () => click(858 + st.dw + 50, 327)),
    taskbar: async (k) => {
      const b = await find(`() => [...document.querySelectorAll('#stage *')].find((e) => !e.children.length && e.textContent.trim() === 'My Documents' && e.getBoundingClientRect().top > innerHeight - 50)`)
      if (!b) return console.log('taskbar menu: no button found')
      await measure(`taskbar button menu #${k}`, 'ui.menu', "(e) => e.id === 'tb.ctx' && e.open != null", DUR.menu, () => click(b.x, b.y, 'right'))
    },
    file: async (k) => {
      const b = await find(`() => [...document.querySelectorAll('[data-hit="menu:File"]')].find((e) => e.getBoundingClientRect().width > 0)`)
      if (!b) return console.log('window menu: no File found')
      await measure(`window File menu #${k}`, 'ui.menu', "(e) => String(e.id).includes('documents') && e.open != null", DUR.menu, () => click(b.x, b.y))
    },
  }
  const winList = opt('--windows', null)
  if (winList) {
    const PROPS = { ie: { url: 'www.msn.com' }, im: { buddy: 'Hank' }, outlook: { message: 'Hello' }, applet: { applet: 'network' }, burncd: { what: 'music' } }
    const IDS = { outlook: 'inbox', word: 'doc1', im: 'im:Hank' }
    const frameMs = engine === 'chrome' ? 1000 / hz : 1000 / 60
    // the frames drawn from a step's event on: [count, missed, longest]
    async function step(type, id, act) {
      const n0 = await S.evaluate('window.__fo.frames.length')
      const t0 = await S.evaluate('window.__lh.now()')
      await act()
      await sleep(900)
      const r = await S.evaluate(`(() => {
        // (my Music's taskbar and title-bar events are the video's legacy ones: 'music.restore', no id)
        const ev = window.__lh.log().filter((e) => (e.type === ${JSON.stringify(type)} && e.id === ${JSON.stringify(id)} || ${JSON.stringify(id)} === 'music' && e.type === ${JSON.stringify(type)}.replace('win.', 'music.')) && e.t >= ${t0})[0]
        return { ev: ev ? ev.t : null, frames: window.__fo.frames.slice(${n0}) }
      })()`)
      if (r.ev == null) return 'no event'
      const fr = r.frames.filter(([, t]) => t >= r.ev)
      const before = r.frames.filter(([, t]) => t < r.ev).pop()
      const dts = []
      let prev = before ? before[0] : fr[0][0]
      for (const [p, t] of fr) {
        if ((t - r.ev) > 0.8) break
        dts.push(p - prev)
        prev = p
      }
      const missed = dts.filter((d) => d > frameMs * 1.5).length
      const mx = Math.max(...dts)
      if (loafOut && mx > 20) {
        const t1 = fr.find(([p], i) => i && p - fr[i - 1][0] === mx)?.[0] ?? 0
        const lo = await S.evaluate(`JSON.stringify(window.__fo.loaf.filter((e) => e.start > ${t1} - 200 && e.start < ${t1} + 20).map((e) => ({ ...e, start: Math.round(e.start - ${t1}), render: Math.round(e.render - e.start), style: Math.round(e.style - e.start), scripts: e.scripts.filter((s) => s.dur > 2) })))`)
        const at = fr.find(([p], i) => i && p - fr[i - 1][0] === mx)
        console.log(`  long frame in ${type}: ${mx.toFixed(0)} ms, ending at clock +${((at[1] - r.ev) * 30000 / 1001).toFixed(1)} video frames; loaf ${lo}`)
      }
      return `${String(missed).padStart(3)} missed, max ${mx.toFixed(0).padStart(3)} ms`
    }
    // (one window is open at a time: the first of these that shows)
    const hit = async (sel) => find(`() => [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.getBoundingClientRect().width > 0)`)
    const hover = async (p, ms = 500) => {
      await moveTo(P(p.x, p.y))
      await sleep(ms)
    }
    console.log('window'.padEnd(12) + ['open', 'minimise', 'restore', 'maximise', 'restore down', 'close'].map((x) => x.padStart(22)).join(''))
    for (const app of winList.split(',')) {
      for (const k of tries) {
        const id = IDS[app] || app
        const row = []
        await S.evaluate(`(window.__foBar = new Set([...document.querySelectorAll('#stage *')].filter((e) => !e.children.length && e.getBoundingClientRect().top > innerHeight - 50).map((e) => e.textContent.trim())), true)`)
        row.push(await step('win.open', id, () => S.evaluate(`(window.__wm.emit('win.open', ${JSON.stringify({ id, app, ...(PROPS[app] ? { props: PROPS[app] } : {}) })}), true)`)))
        await sleep(1200)
        if (tilt) {
          // the pointer circles the header slab (window px 276, 211: my Music's device) for 2 s
          const w = await S.evaluate(`(() => { const d = [...document.querySelectorAll('#stage div')].filter((d) => d.style.mixBlendMode === 'plus-lighter' && d.style.pointerEvents === 'auto')[0]; const b = d.getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect(), s = +document.getElementById('stage').dataset.s; return { x: (b.left - st.left) / s, y: (b.top - st.top) / s } })()`)
          const n0 = await S.evaluate('window.__fo.frames.length')
          for (let i = 0; i <= 120; i++) {
            const a = (i / 60) * 2 * Math.PI
            const p = P(w.x + 276 + 70 * Math.cos(a), w.y + 211 + 70 * Math.sin(a))
            await S.mouse('mouseMoved', p.x, p.y)
            await sleep(16)
          }
          at = P(w.x + 276 + 70, w.y + 211)
          const fr = await S.evaluate(`window.__fo.frames.slice(${n0}).map((f) => f[0])`)
          const dts = fr.slice(1).map((p, i) => p - fr[i])
          console.log(`  ${app} tilt: ${dts.length} frames, ${dts.filter((d) => d > frameMs * 1.5).length} missed, max ${Math.max(...dts).toFixed(0)} ms`)
        }
        let b = await hit('[data-hit="win.minimize"]')
        await hover(b)
        row.push(await step('win.minimize', id, () => click(b.x, b.y)))
        // its taskbar button: the label that wasn't on the taskbar before the window opened
        const tb = await find(`() => [...document.querySelectorAll('#stage *')].find((e) => !e.children.length && e.textContent.trim() && !/\\d:\\d/.test(e.textContent) && !window.__foBar.has(e.textContent.trim()) && e.getBoundingClientRect().top > innerHeight - 50 && e.getBoundingClientRect().width > 0)`)
        await hover(tb)
        row.push(await step('win.restore', id, () => click(tb.x, tb.y)))
        await sleep(600)
        b = await hit('[data-hit="win.maximize"]')
        await hover(b, 200)
        row.push(await step('win.maximize', id, () => click(b.x, b.y)))
        await sleep(600)
        b = await hit('[data-hit="win.unmaximize"]')
        await hover(b, 200)
        row.push(await step('win.unmaximize', id, () => click(b.x, b.y)))
        await sleep(600)
        b = await hit('[data-hit="win.close"]')
        await hover(b)
        row.push(await step('win.close', id, () => click(b.x, b.y)))
        await moveTo(P(600, 400))
        await sleep(1200)
        console.log(`${app} #${k}`.padEnd(12) + row.map((x) => x.padStart(22)).join(''))
      }
    }
    for (const e of S.errors()) console.error('page error:', e)
    process.exitCode = 0
  }
  const order = winList ? [] : opt('--only', 'start,desk,user,buddies,taskbar,file').split(',')
  let docs = false
  for (const name of order) {
    if ((name === 'taskbar' || name === 'file') && !docs) {
      // a window: its taskbar button's menu and its menu bar
      await S.evaluate("(window.__wm.emit('win.open', { id: 'documents', app: 'documents' }), true)")
      await sleep(2500)
      docs = true
    }
    for (const k of tries) {
      if (k === 1 && stall) await S.evaluate(`(window.__fo.stall = ${stall}, true)`)
      if (k === 1 && name === 'start' && traceOut) await S.traceStart()
      await STEPS[name](k)
      if (k === 1 && name === 'start' && traceOut) {
        writeFileSync(traceOut, JSON.stringify(await S.traceStop()))
        console.log('  trace:', traceOut)
      }
      await closePopup()
    }
  }
  for (const e of S.errors()) console.error('page error:', e)
} finally {
  await S.close()
}
