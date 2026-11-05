// Fit an SVG icon generator to the reference video in headless Chrome (docs/music-spec.md, "Toolbar icons").
// usage (from the repo root):
//   node tools/icons/fit.mjs --gen tools/icons/gen/nav.mjs --ref <median.png> --bg <capture without the icon>
//        --crop x,y,w,h --at x,y [--iters n] [--vblur 1.15] [--params p.json] [--only prefix,...] [--out dir]
// gen modules export `spec` [{ n, v, s, lo, hi }] (name, start, step, bounds) and `svg(p)` (markup with
// width/height/viewBox; no imports, the source is injected into the page). The drawing is placed at
// stage --at over the --bg capture, both images are blurred (reference sigma 1, ours --vblur: the
// video's own softness on top), and coordinate descent with halving steps minimises the RMSE over
// --crop. Writes params.json, icon.svg, render.png (1x) and hires.png (8x) to --out.
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1] }
const gen = await import(resolve(opt('--gen')))
const out = opt('--out', 'fitout'); mkdirSync(out, { recursive: true })
const crop = opt('--crop').split(',').map(Number), at = opt('--at').split(',').map(Number)
const iters = +opt('--iters', 3)
const vblur = +opt('--vblur', 1)
const only = opt('--only', null)
let params = Object.fromEntries(gen.spec.map((q) => [q.n, q.v]))
if (opt('--params')) Object.assign(params, JSON.parse(readFileSync(opt('--params'), 'utf8')))
const b64 = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9300 + Math.floor(Math.random() * 400)
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'lhfit-'))}`, '--force-device-scale-factor=1', '--window-size=400,300', '--enable-gpu', '--ignore-gpu-blocklist', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let list
for (let i = 0; i < 80 && !list; i++) { await sleep(100); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
let id = 0; const pend = {}
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) pend[m.id](m) }
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 800)); return r.result.result.value }
const svgSrc = gen.svg.toString()
const helpers = readFileSync(resolve(opt('--gen')), 'utf8').replace(/export /g, '')
await ev(`(async () => {
  ${helpers}
  window.SVG = svg; window.SPEC = spec
  const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src })
  const [ref, bg] = await Promise.all([load(${JSON.stringify(b64(opt('--ref')))}), load(${JSON.stringify(b64(opt('--bg')))})])
  const [cx, cy, w, h] = ${JSON.stringify(crop)}, [ax, ay] = ${JSON.stringify(at)}
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d', { willReadFrequently: true })
  const kern = (sg) => { const k = []; let t = 0; for (let i = -3; i <= 3; i++) { const v = Math.exp(-i * i / (2 * sg * sg)); k.push(v); t += v } return k.map((v) => v / t) }
  const K1 = kern(1), KV = kern(${vblur})
  let K = K1
  const blur = (a, kk = K1) => { K = kk; const t = new Float32Array(a.length), o = new Float32Array(a.length)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) { let s = 0; for (let k = -3; k <= 3; k++) { const xx = Math.min(w - 1, Math.max(0, x + k)); s += K[k + 3] * a[(y * w + xx) * 4 + c] } t[(y * w + x) * 4 + c] = s }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) { let s = 0; for (let k = -3; k <= 3; k++) { const yy = Math.min(h - 1, Math.max(0, y + k)); s += K[k + 3] * t[(yy * w + x) * 4 + c] } o[(y * w + x) * 4 + c] = s }
    return o }
  ctx.drawImage(ref, -cx, -cy); const R = blur(ctx.getImageData(0, 0, w, h).data)
  // pad the drawing by 10 px all round (an <img> clips at its box; the app's nested <svg> does not)
  const pad = (src, S = 1) => src.replace(/<svg([^>]*?) width="([0-9.]+)" height="([0-9.]+)" viewBox="0 0 ([0-9.]+) ([0-9.]+)"/, (m, a, W, H) => '<svg' + a + ' width="' + (+W + 20) * S + '" height="' + (+H + 20) * S + '" viewBox="-10 -10 ' + (+W + 20) + ' ' + (+H + 20) + '"')
  window.render = async (p) => {
    const img = await load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pad(SVG(p))))
    ctx.clearRect(0, 0, w, h); ctx.drawImage(bg, -cx, -cy); ctx.drawImage(img, ax - cx - 10, ay - cy - 10)
  }
  window.score = async (p) => { await render(p); const A = blur(ctx.getImageData(0, 0, w, h).data, KV); let s = 0, n = 0
    for (let i = 0; i < A.length; i += 4) for (let c = 0; c < 3; c++) { const d = A[i + c] - R[i + c]; s += d * d; n++ } return Math.sqrt(s / n) }
  window.png = async (p) => { await render(p); return cv.toDataURL('image/png') }
  window.hires = async (p, S) => { const c2 = document.createElement('canvas'); c2.width = w * S; c2.height = h * S; const x2 = c2.getContext('2d')
    x2.imageSmoothingQuality = 'high'; x2.drawImage(bg, cx, cy, w, h, 0, 0, w * S, h * S)
    const img = await load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pad(SVG(p), S))); x2.drawImage(img, (ax - cx - 10) * S, (ay - cy - 10) * S)
    return c2.toDataURL('image/png') }
})()`)
const score = (p) => ev(`score(${JSON.stringify(p)})`)
let best = await score(params)
console.log('start', best.toFixed(3))
const names = gen.spec.filter((q) => !only || only.split(',').some((o) => q.n.startsWith(o)))
for (let it = 0; it < iters; it++) {
  const f = 1 / 2 ** it
  for (const q of names) {
    for (const dir of [1, -1]) {
      let moved = true
      while (moved) {
        moved = false
        const v = Math.min(q.hi ?? Infinity, Math.max(q.lo ?? -Infinity, params[q.n] + dir * q.s * f))
        if (v === params[q.n]) break
        const tr = { ...params, [q.n]: v }
        const sc = await score(tr)
        if (sc < best - 1e-4) { best = sc; params = tr; moved = true }
      }
    }
  }
  console.log('iter', it, best.toFixed(3))
}
writeFileSync(join(out, 'params.json'), JSON.stringify(params, null, 1))
writeFileSync(join(out, 'icon.svg'), gen.svg(params))
const png = await ev(`png(${JSON.stringify(params)})`)
writeFileSync(join(out, 'render.png'), Buffer.from(png.split(',')[1], 'base64'))
const hi = await ev(`hires(${JSON.stringify(params)}, 8)`)
writeFileSync(join(out, 'hires.png'), Buffer.from(hi.split(',')[1], 'base64'))
console.log('final', best.toFixed(3))
ws.close(); chrome.kill()
