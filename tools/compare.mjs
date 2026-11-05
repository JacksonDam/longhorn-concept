// Capture a frame range with several headless Chromes in parallel, then build a side-by-side
// comparison video (reference | app) and print RMSE.
//
// usage: node tools/compare.mjs [from-to] [--workers 10] [--url url] [--out out/full] [--no-video]
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
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
const workers = +opt('--workers', 10)
const url = opt('--url', 'http://127.0.0.1:5299/longhorn-concept/?capture')
const out = opt('--out', join(ROOT, 'out', 'full'))
const noVideo = flag('--no-video')
const [a, b] = (args[0] || '1-1529').split('-').map(Number)
mkdirSync(out, { recursive: true })

const run = (cmd, argv) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: ['ignore', 'inherit', 'inherit'] })
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))))
  })

// interleaved chunks so every worker spends similar time on heavy (animated) frames
const chunks = Array.from({ length: workers }, () => [])
for (let n = a; n <= b; n++) chunks[(n - a) % workers].push(n)
const t0 = Date.now()
await Promise.all(
  chunks
    .filter((c) => c.length)
    .map((c) => run('node', [join(ROOT, 'tools', 'capture.mjs'), `${c[0]}-${c[c.length - 1]}:${workers}`, '--out', out, '--url', url])),
)
console.log(`captured ${b - a + 1} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s`)

await run('python3', [join(ROOT, 'tools', 'rmse.py'), `${a}-${b}:15`, '--cap', out, '--blur', '1'])

if (!noVideo) {
  const video = join(ROOT, 'out', `compare_${a}_${b}.mp4`)
  const refDir = join(ROOT, 'ref', 'frames')
  if (!existsSync(refDir)) throw new Error('missing ref/frames')
  await run('ffmpeg', [
    '-v', 'error', '-y',
    '-framerate', '30000/1001', '-start_number', String(a), '-i', join(refDir, 'f%05d.png'),
    '-framerate', '30000/1001', '-start_number', String(a), '-i', join(out, 'f%05d.png'),
    '-filter_complex', '[0:v][1:v]hstack=inputs=2,format=yuv420p[v]',
    '-map', '[v]', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', video,
  ])
  console.log(video)
}
