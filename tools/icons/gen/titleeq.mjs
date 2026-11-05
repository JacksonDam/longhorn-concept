// the title's equaliser glyph: 4 columns of glowing cells (heights 3, 4, 2, 3); local px (13 x 10 box at stage 393, 27)
const C = (n, r, g, b, s = 6) => [{ n: n + 'R', v: r, s, lo: 0, hi: 255 }, { n: n + 'G', v: g, s, lo: 0, hi: 255 }, { n: n + 'B', v: b, s, lo: 0, hi: 255 }]
const P = (n, v, s, lo, hi) => ({ n, v, s, lo, hi })
export const spec = [
  P('x0', -1.4, 0.15, -3, 0), P('yb', 11, 0.15, 9.5, 12.5), P('px', 4.05, 0.08, 3.5, 4.6), P('py', 3.3, 0.08, 2.8, 3.8),
  P('cw', 3.3, 0.1, 2.4, 4), P('ch', 2.3, 0.1, 1.5, 3), P('rr', 0.5, 0.1, 0, 1.2),
  { n: 'c0R', v: 225, s: 5, lo: 190, hi: 255 }, { n: 'c0G', v: 250, s: 5, lo: 235, hi: 255 }, { n: 'c0B', v: 255, s: 5, lo: 252, hi: 255 }, { n: 'c1R', v: 175, s: 5, lo: 130, hi: 215 }, { n: 'c1G', v: 225, s: 5, lo: 200, hi: 245 }, { n: 'c1B', v: 255, s: 5, lo: 245, hi: 255 }, P('co', 1, 0.05, 0.4, 1),
  P('gw', 1.2, 0.1, 0.2, 2.5), P('go', 0.35, 0.05, 0, 1), { n: 'gR', v: 170, s: 5, lo: 120, hi: 210 }, { n: 'gG', v: 220, s: 5, lo: 190, hi: 240 }, { n: 'gB', v: 255, s: 5, lo: 245, hi: 255 },
]
const rgb = (p, n) => `rgb(${Math.round(p[n + 'R'])},${Math.round(p[n + 'G'])},${Math.round(p[n + 'B'])})`
const f = (v) => +(+v).toFixed(2)
const stops = (s) => s.map(([o, c, op = 1]) => `<stop offset="${f(Math.min(1, Math.max(0, o)))}" stop-color="${c}"${op < 1 ? ` stop-opacity="${f(op)}"` : ''}/>`).join('')
export function svg(p) {
  const H = [3, 4, 2, 3], cells = []
  H.forEach((n, i) => { for (let j = 0; j < n; j++) cells.push([p.x0 + i * p.px, p.yb - (j + 1) * p.py + (p.py - p.ch)]) })
  const glow = cells.map(([x, y]) => `<rect x="${f(x - p.gw / 2)}" y="${f(y - p.gw / 2)}" width="${f(p.cw + p.gw)}" height="${f(p.ch + p.gw)}" rx="${f(p.rr + p.gw / 2)}"/>`).join('')
  const body = cells.map(([x, y]) => `<rect x="${f(x)}" y="${f(y)}" width="${f(p.cw)}" height="${f(p.ch)}" rx="${f(p.rr)}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="10" viewBox="0 0 13 10" overflow="visible"><defs>
<radialGradient id="c" cx="0.5" cy="0.45" r="0.6">${stops([[0, rgb(p, 'c0'), p.co], [1, rgb(p, 'c1'), p.co]])}</radialGradient>
</defs>
<g fill="${rgb(p, 'g')}" fill-opacity="${f(p.go)}">${glow}</g>
<g fill="url(#c)">${body}</g>
</svg>`
}
