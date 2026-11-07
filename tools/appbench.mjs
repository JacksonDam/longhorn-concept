// Per-app window animation costs: runs tools/bench.mjs over ?apps=every (each app opened,
// minimised, restored, maximised, restored down and closed in turn, src/apps/lib/benchScript.js)
// and prints, per app and phase, the p95 and max frame cost and the frames over 6.94 ms, and the
// run's peak memory.
//
// usage: node tools/appbench.mjs [--url http://127.0.0.1:5312/longhorn-concept/] [--dpr 1.5]
//        [--size 1440x1080] [--repeat 2] [--json out.json] [--scaled] [--query stage=zoom]
//        [--apps music,ie] [--engine chrome|webkit] [--music]
// --scaled: the frame fitted to the window (s = 1.5 at 1920x1080, the user's full screen) instead
// of pinned at scale 1 (tools/bench.mjs); --apps: only these apps' slots are stepped;
// --engine webkit: Playwright WebKit through tools/wkbench.mjs (each frame's main-thread cost:
// WebKit's rAF is timer-paced, so its intervals aren't the frames' costs)
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
const query = opt('--query', null)
const only = opt('--apps', null)?.split(',')
const engine = opt('--engine', 'chrome')
const out = opt('--json', join(mkdtempSync(join(tmpdir(), 'lhapp-')), 'every.json'))
const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '../src/apps/lib/benchScript.js'), 'utf8')
const apps = [...src.slice(src.indexOf('export const EVERY = ')).matchAll(/\['(\w+)', '([^']+)'/g)].map((m) => m[1])
const SLOT = +src.match(/EVERY_SLOT = (\d+)/)[1]
const AT = Object.fromEntries([...src.match(/EVERY_AT = \{([^}]+)\}/)[1].matchAll(/(\w+): (\d+)/g)].map((m) => [m[1], +m[2]]))
// per phase: [name, first frame, last frame] of the slot
const PH = [['open', AT.open, AT.open + 36], ['minimise', AT.minimise, AT.minimise + 14], ['restore', AT.restore, AT.restore + 16],
  ['maximise', AT.maximise, AT.maximise + 14], ['unmaximise', AT.unmaximise, AT.unmaximise + 14], ['close', AT.close, AT.close + 18]]
let slots = apps.map((app, i) => [app, 1540 + i * SLOT]).filter(([app]) => !only || only.includes(app))
let spec = only ? slots.map(([, f]) => `${f - 10}-${f + SLOT - 1}`).join(',') : `1530-${1540 + apps.length * SLOT}`
let scenario = 'every'
// --music: ?apps=music (my Music alone: open, an album page and back, the pointer tilt, minimise,
// restore, close; MUSIC_AT in the bench script)
if (args.includes('--music')) {
  const M = Object.fromEntries([...src.match(/MUSIC_AT = \{([^}]+)\}/)[1].matchAll(/(\w+): (\d+)/g)].map((m) => [m[1], +m[2]]))
  PH.splice(0, PH.length, ['open', M.open, M.open + 36], ['album', M.album, M.album + 50], ['back', M.back, M.back + 26], ['tilt', M.tilt, M.tilt + 72],
    ['minimise', M.minimise, M.minimise + 14], ['restore', M.restore, M.restore + 16], ['close', M.close, M.close + 18])
  slots = [['music', 1540]]
  spec = `1530-${1540 + M.close + 30}`
  scenario = 'music'
}
const r = spawnSync('node', [join(here, engine === 'webkit' ? 'wkbench.mjs' : 'bench.mjs'), spec, '--url', base + `?apps=${scenario}&`, '--dpr', dpr, '--size', size, '--repeat', repeat, '--json', out,
  ...(args.includes('--scaled') ? ['--scaled'] : []), ...(query ? ['--query', query] : [])], { encoding: 'utf8' })
if (r.status !== 0 && !r.stdout.includes('frames over')) {
  console.error(r.stderr || r.stdout)
  process.exit(1)
}
const rows = new Map(JSON.parse(readFileSync(out, 'utf8')).map((x) => [x.n, x.ms]))
let worst = []
console.log('app'.padEnd(12) + PH.map(([p]) => p.padStart(21)).join(''))
for (const [app, f] of slots) {
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
}
console.log('(per phase: p95, max ms; frames over 6.94 ms)  over: ' + (worst.join(' ') || 'none'))
const mem = (r.stdout.match(/^mem peak.*$/m) || [])[0]
if (mem) console.log(mem)
console.log('json:', out)
