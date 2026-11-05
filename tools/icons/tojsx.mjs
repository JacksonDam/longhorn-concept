// node tools/icons/tojsx.mjs <gen.mjs> <params.json> <id prefix>: prints the fitted SVG's inner markup as JSX
// (ids prefixed, attributes camelCased, unreferenced defs dropped, hex colours) for os/icons.jsx
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const g = await import(resolve(process.argv[2])); const p = JSON.parse(readFileSync(process.argv[3], 'utf8')); const pre = process.argv[4]
let s = g.svg(p).replace(/\n/g, '')
s = s.replace(/rgb\((\d+),(\d+),(\d+)\)/g, (_, r, gg, b) => '#' + [r, gg, b].map((v) => (+v).toString(16).padStart(2, '0')).join(''))
s = s.replace(/(-?\d+\.\d{3,})/g, (m) => String(+(+m).toFixed(2)))
s = s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
// drop defs whose id is never referenced
for (;;) {
  const ids = [...s.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
  const dead = ids.filter((id) => !s.includes(`url(#${id})`))
  if (!dead.length) break
  for (const id of dead) {
    const re = new RegExp(`<(\\w+) id="${id}"[^>]*?(/>|>.*?</\\1>)`)
    s = s.replace(re, '')
  }
}
s = s.replace(/ id="([^"]+)"/g, ` id="${pre}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${pre}$1)`)
s = s.replace(/ style="mix-blend-mode:normal"/g, '')
s = s.replace(/ ([a-z]+(?:-[a-z]+)+)=/g, (_, a) => ' ' + a.replace(/-([a-z])/g, (__, c) => c.toUpperCase()) + '=')
s = s.replace(/></g, '>\n<')
console.log(s)
