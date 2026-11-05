// Per-app window animation costs: runs tools/bench.mjs over ?apps=every (each app opened,
// minimised, restored and closed in turn, src/apps/lib/benchScript.js) and prints, per app and
// phase, the p95 and max frame cost and the frames over 6.94 ms.
//
// usage: node tools/appbench.mjs [--url http://127.0.0.1:5312/longhorn-concept/] [--dpr 1.5]
//        [--size 1440x1080] [--repeat 2] [--json out.json]
import { spawnSync } from 'node:child_process'
import { readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i < 0 ? def : args[i + 1]
}
const base = opt('--url', 'http://127.0.0.1:5312/longhorn-concept/')
const dpr = opt('--dpr', '1.5')
const size = opt('--size', '1440x1080')
const repeat = opt('--repeat', '2')
const out = opt('--json', join(mkdtempSync(join(tmpdir(), 'lhapp-')), 'every.json'))
const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '../src/apps/lib/benchScript.js'), 'utf8')
const apps = [...src.slice(src.indexOf('export const EVERY')).matchAll(/\['(\w+)', '([^']+)'/g)].map((m) => m[1])
const last = 1540 + apps.length * 110
const r = spawnSync('node', [join(here, 'bench.mjs'), `1530-${last}`, '--url', base + '?apps=every&', '--dpr', dpr, '--size', size, '--repeat', repeat, '--json', out], { encoding: 'utf8' })
if (r.status !== 0 && !r.stdout.includes('frames over')) {
  console.error(r.stderr || r.stdout)
  process.exit(1)
}
const rows = new Map(JSON.parse(readFileSync(out, 'utf8')).map((x) => [x.n, x.ms]))
const PH = [['open', 0, 36], ['minimise', 40, 54], ['restore', 60, 76], ['close', 90, 108]]
let worst = []
console.log('app'.padEnd(12) + PH.map(([p]) => p.padStart(22)).join(''))
apps.forEach((app, i) => {
  const f = 1540 + i * 110
  let line = app.padEnd(12)
  for (const [, a, b] of PH) {
    const v = []
    for (let n = f + a; n <= f + b; n++) if (rows.has(n)) v.push(rows.get(n))
    v.sort((x, y) => x - y)
    const over = v.filter((x) => x > 6.94).length
    line += `${v[Math.floor(v.length * 0.95)].toFixed(1).padStart(6)} ${v[v.length - 1].toFixed(1).padStart(6)} ${String(over ? over + ' over' : '').padEnd(8)}`
    for (let n = f + a; n <= f + b; n++) if (rows.get(n) > 6.94) worst.push(`${app}@${n - f}:${rows.get(n).toFixed(1)}`)
  }
  console.log(line)
})
console.log('(per phase: p95, max ms; frames over 6.94 ms)  over: ' + (worst.join(' ') || 'none'))
console.log('json:', out)
