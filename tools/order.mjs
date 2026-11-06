// Capture-order check: every frame must be pixel-identical however it is reached. Each frame is
// captured alone (a fresh page seeked straight to it), at the end of a run of the RUN frames before
// it, and (--back) at the end of a run backwards from RUN frames after it; any difference fails.
// History-dependent rendering (a layer rasterised at an earlier frame's sub-pixel offset and only
// moved since, an image decode reused at another frame's scale, state kept between renders) shows
// up here as small differences at anti-aliased or partly transparent edges.
//
// usage: node tools/order.mjs [--url http://127.0.0.1:5311/longhorn-concept/] [--frames 209,515,...]
//          [--run 20] [--back] [--workers 10] [--out out/order] [--tol 0]
//   default frames: the login (hover sweep, select, the tile flight and slide, the panel sweep,
//   the slab at rest, typing, the exit), the desktop entrance, my Music (open, album flip,
//   minimise, restore, close)
//   --tol n: allowed per-channel difference (default 0: identical)
// Exits 1 when a frame differs; prints, per frame, the largest difference and where it is.
import { spawn } from 'node:child_process'
import { readFileSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { PNG } from './lib/png.mjs'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i < 0 ? d : args[i + 1]
}
const base = opt('--url', 'http://127.0.0.1:5311/longhorn-concept/')
const url = base + (base.includes('?') ? '&' : '?') + 'capture'
const DEFAULT = [60, 100, 170, 188, 192, 196, 198, 209, 260, 300, 400, 430, 512, 515, 519, 540, 580, 700, 960, 975, 985, 995, 1356, 1362, 1405, 1412, 1529]
const frames = opt('--frames', DEFAULT.join(',')).split(',').map(Number)
const RUN = +opt('--run', 20)
const back = args.includes('--back')
const workers = Math.min(10, +opt('--workers', 10))
const out = opt('--out', 'out/order')
const tol = +opt('--tol', 0)
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

const capture = (list, dir) =>
  new Promise((res) => {
    const p = spawn('node', [join(import.meta.dirname, 'capture.mjs'), list, '--out', dir, '--url', url], { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => (err += d))
    p.on('close', (code) => res(code === 0 ? null : err.trim() || 'capture failed'))
  })

// jobs: per frame, the ways of reaching it
const jobs = []
for (const n of frames) {
  jobs.push({ n, way: 'alone', list: String(n) })
  jobs.push({ n, way: 'run', list: `${Math.max(1, n - RUN)}-${n}` })
  // (capture.mjs takes frames in the order listed: a descending list seeks backwards)
  if (back) jobs.push({ n, way: 'back', list: Array.from({ length: RUN + 1 }, (_, i) => n + RUN - i).join(',') })
}
let next = 0
const errors = []
await Promise.all(
  Array.from({ length: workers }, async () => {
    while (next < jobs.length) {
      const j = jobs[next++]
      const e = await capture(j.list, join(out, `${j.way}-${j.n}`))
      if (e) errors.push(`${j.way} ${j.n}: ${e}`)
    }
  }),
)
// a capture that failed (a busy machine: Chrome slow to start) is tried again, one at a time
const failed = errors.splice(0)
for (const f of failed) {
  const [way, n] = f.split(' ')
  const j = jobs.find((x) => x.way === way && String(x.n) === n.replace(':', ''))
  const e = j && (await capture(j.list, join(out, `${j.way}-${j.n}`)))
  if (!j || e) errors.push(f)
}
if (errors.length) console.log('capture errors:\n  ' + errors.join('\n  '))

const load = (way, n) => {
  try {
    return PNG.decode(readFileSync(join(out, `${way}-${n}`, `f${String(n).padStart(5, '0')}.png`)))
  } catch {
    return null
  }
}
let bad = 0
for (const n of frames) {
  const a = load('alone', n)
  const ways = ['run', ...(back ? ['back'] : [])]
  const notes = []
  if (!a) notes.push('alone: no capture')
  for (const w of a ? ways : []) {
    const b = load(w, n)
    if (!b) {
      notes.push(w + ': no capture')
      continue
    }
    let max = 0, count = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1
    for (let i = 0; i < a.data.length; i += 4) {
      const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]))
      if (d > tol) {
        count++
        if (d > max) max = d
        const p = i / 4, x = p % a.width, y = (p / a.width) | 0
        if (x < x0) x0 = x
        if (y < y0) y0 = y
        if (x > x1) x1 = x
        if (y > y1) y1 = y
      }
    }
    if (count) notes.push(`${w}: max ${max}, ${count} px in x ${x0}-${x1}, y ${y0}-${y1}`)
  }
  if (notes.length) bad++
  console.log(`${String(n).padStart(5)}  ${notes.length ? 'DIFFERS  ' + notes.join('; ') : 'same'}`)
}
console.log(bad ? `${bad} of ${frames.length} frames depend on how they were reached` : `all ${frames.length} frames identical however reached`)
process.exit(bad || errors.length ? 1 : 0)
