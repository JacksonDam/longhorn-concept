// Render the aurora alone (no UI) at given video frame numbers (may exceed the video, to test the
// loop) with headless Chrome. usage: node aurora_frames.mjs <frames> --out dir [--url base]
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v }
const out = opt('--out', 'out/aurora/frames')
const base = opt('--url', 'http://localhost:5201/longhorn-concept/?capture')
const frames = []
for (const part of args[0].split(',')) {
  const m = part.match(/^(\d+)(?:-(\d+))?(?::(\d+))?$/)
  const a = +m[1], b = m[2] ? +m[2] : a, st = m[3] ? +m[3] : 1
  for (let n = a; n <= b; n += st) frames.push(n)
}
mkdirSync(out, { recursive: true })
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9700 + Math.floor(Math.random() * 90)
const profile = mkdtempSync(join(tmpdir(), 'lhaur-'))
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=960,720', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let list
for (let i = 0; i < 80 && !list; i++) { await sleep(100); try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() } catch {} }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
let id = 0; const pending = {}
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending[m.id]) pending[m.id](m) }
await new Promise((r) => (ws.onopen = r))
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending[i] = (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description); return r.result.value }
try {
  await send('Page.enable')
  await send('Page.navigate', { url: base })
  await sleep(2500)
  await ev(`(async()=>{window.__aur=await import('/longhorn-concept/src/scenes/login/aurora.js');await window.__aur.keysReady;window.__c=document.createElement('canvas');window.__r=new window.__aur.AuroraRenderer(window.__c);return 1})()`)
  for (const n of frames) {
    const url = await ev(`(()=>{window.__r.render(${(n - 1) * 1001 / 30000},960,720);return window.__c.toDataURL('image/png')})()`)
    writeFileSync(join(out, `f${String(n).padStart(5, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'))
  }
  console.log('rendered', frames.length)
} finally { ws.close(); chrome.kill(); await sleep(200); rmSync(profile, { recursive: true, force: true }) }
