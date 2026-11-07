// tools/bench.mjs for WebKit (Playwright WebKit, Safari's engine): steps the ?bench path over
// `frames` and records each frame's main-thread cost. WebKit paces requestAnimationFrame with a
// timer (~14 ms here) and rounds performance.now() to 1 ms, so a frame's interval says little;
// its cost is measured instead as the time from the frame's rAF timestamp to a message posted
// after its React render, which runs once WebKit's rendering update (style, layout, paint, layer
// flush) is done. Compositing in WebKit's GPU process is not included.
//
// usage: node tools/wkbench.mjs [frames] [--size 1920x1080] [--dpr 1] [--url base] [--repeat 2]
//        [--json out.json] [--scaled] [--query stage=zoom]
// (the stage is scaled by zoom in WebKit: core/Stage.jsx; --scaled fits the frame to the window)
import { writeFileSync } from 'node:fs'
import { webkit } from 'playwright'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  if (i < 0) return def
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const [W, H] = opt('--size', '1920x1080').split('x').map(Number)
const dpr = +opt('--dpr', 1)
const base = opt('--url', 'http://127.0.0.1:5325/longhorn-concept/')
const repeat = +opt('--repeat', 2)
const jsonOut = opt('--json', null)
const extra = opt('--query', '')
const scaled = args.includes('--scaled')
if (scaled) args.splice(args.indexOf('--scaled'), 1)
const frames = []
for (const part of (args[0] || '1-1529').split(',')) {
  const m = part.match(/^(\d+)(?:-(\d+))?(?::(\d+))?$/)
  const a = +m[1], b = m[2] ? +m[2] : a, step = m[3] ? +m[3] : 1
  for (let n = a; n <= b; n += step) frames.push(n)
}

const browser = await webkit.launch()
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(base + (base.includes('?') ? '&' : '?') + 'bench' + (scaled ? '&scaled' : '') + (extra ? '&' + extra : ''))
  await page.waitForFunction(() => window.__lh && window.__lh.seekFrame, null, { timeout: 60000 })
  await page.evaluate(() => window.__lh.ready())
  const info = await page.evaluate(() => {
    const d = document.getElementById('stage').dataset
    return `stage ${d.mode} s ${d.s}`
  })
  // one pass: [frame, ms] per frame (the rAF observer runs after the clock's, which rendered it)
  const pass = (fr) =>
    page.evaluate(
      (fr) =>
        new Promise((resolve) => {
          const out = new Map()
          const mc = new MessageChannel()
          let pend = []
          mc.port1.onmessage = () => {
            const now = performance.now()
            for (const [n, ts] of pend.splice(0)) if (!out.has(n)) out.set(n, now - ts)
          }
          let on = true
          const f = (ts) => {
            if (!on) return
            pend.push([Math.round((window.__lh.now() * 30000) / 1001 + 1), ts])
            mc.port2.postMessage(0)
            requestAnimationFrame(f)
          }
          requestAnimationFrame(f)
          window.__lh.bench(fr).then(() => {
            on = false
            setTimeout(() => resolve(fr.map((n) => [n, out.get(n) ?? 0])), 50)
          })
        }),
      fr,
    )
  await pass(frames)
  let best = null
  for (let r = 0; r < repeat; r++) {
    const ms = (await pass(frames)).map((p) => p[1])
    best = best ? best.map((v, i) => Math.min(v, ms[i])) : ms
  }
  const rows = frames.map((n, i) => ({ n, ms: best[i] }))
  const v = rows.map((r) => r.ms).sort((p, q) => p - q)
  const pct = (p) => v[Math.min(v.length - 1, Math.floor(v.length * p))]
  console.log(`${info}: p50 ${pct(0.5).toFixed(1)} p95 ${pct(0.95).toFixed(1)} max ${v[v.length - 1].toFixed(1)} ms`)
  console.log('worst:', [...rows].sort((p, q) => q.ms - p.ms).slice(0, 12).map((r) => `${r.n}:${r.ms.toFixed(1)}`).join(' '))
  console.log(`frames over 6.94 ms: ${rows.filter((r) => r.ms > 6.94).length} of ${rows.length}`)
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(rows))
  for (const e of errors) console.error('page error:', e)
} finally {
  await browser.close()
}
