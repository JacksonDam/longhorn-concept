// node tools/icons/bounds.mjs <gen.mjs> <params.json>: the fitted geometry and every parameter stuck at a bound
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const g = await import(resolve(process.argv[2])); const p = JSON.parse(readFileSync(process.argv[3], 'utf8'))
const out = []
for (const q of g.spec) { const v = p[q.n]; const at = q.lo != null && Math.abs(v - q.lo) < 1e-6 ? '<LO' : q.hi != null && Math.abs(v - q.hi) < 1e-6 ? '>HI' : ''; if (!/[RGB]$/.test(q.n) || at) out.push(q.n + '=' + +v.toFixed(2) + at) }
console.log(out.join(' '))
