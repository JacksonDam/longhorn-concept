// web page thumbnail turned away to the right (perspective quad), glass page; icon-local px (28 x 32 box)
const KIND = 'ofoto', Q0 = [[1, 1.5], [29, 3.5], [29, 28], [1, 30.5]]
const C = (n, r, g, b, s = 6) => [{ n: n + 'R', v: r, s, lo: 0, hi: 255 }, { n: n + 'G', v: g, s, lo: 0, hi: 255 }, { n: n + 'B', v: b, s, lo: 0, hi: 255 }]
const P = (n, v, s, lo, hi) => ({ n, v, s, lo, hi })
export const spec = [
  ...Q0.flatMap(([x, y], i) => [P('q' + i + 'x', x, 0.25, x - 1.5, x + 1.5), P('q' + i + 'y', y, 0.25, y - 1.5, y + 1.5)]),
  ...C('p0', 250, 253, 255), ...C('p1', 222, 236, 252), ...C('p2', 200, 222, 248),
  ...C('e', 255, 255, 255), P('eo', 0.7, 0.05, 0, 0.8), P('ew', 0.7, 0.1, 0.3, 0.9),
  ...C('g', 200, 230, 255), P('go', 0.25, 0.05, 0, 0.35), P('gw', 1.2, 0.2, 0.5, 1.6),
  ...C('k1', 30, 75, 155), ...C('k2', 150, 180, 225), ...C('k3', 185, 205, 235),
]
const rgb = (p, n) => `rgb(${Math.round(p[n + 'R'])},${Math.round(p[n + 'G'])},${Math.round(p[n + 'B'])})`
const f = (v) => +(+v).toFixed(2)
const stops = (s) => s.map(([o, c, op = 1]) => `<stop offset="${f(Math.min(1, Math.max(0, o)))}" stop-color="${c}"${op < 1 ? ` stop-opacity="${f(op)}"` : ''}/>`).join('')
function homog(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3
  const den = dx1 * dy2 - dx2 * dy1, g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3
  return (u, v) => { const w = g * u + h * v + 1; return [(a * u + b * v + x0) / w, (d * u + e * v + y0) / w] }
}
// page content in page units (u, v in 0..1): [shape, ...] with colours k1 (dark), k2 (mid), k3 (light)
const CONTENT = {
  ofoto: [['rect', 0, 0, 1, 0.13, 'k1'], ['rect', 0, 0, 0.07, 0.12, 'k0'], ['rect', 0.09, 0.02, 0.16, 0.09, 'k2'],
    ['arc', 0.2, 0.36, 0.13, 0.055, 'k1'], ['dot', 0.12, 0.43, 0.035, 'k1'],
    ['rect', 0.47, 0.37, 0.6, 0.42, 'k3'], ['rect', 0.72, 0.34, 0.82, 0.43, 'k3'], ['rect', 0.56, 0.5, 0.67, 0.55, 'k2'], ['rect', 0.36, 0.55, 0.5, 0.6, 'k3'],
    ['dot', 0.2, 0.9, 0.045, 'k1'], ['dot', 0.55, 0.86, 0.045, 'k1'], ['dot', 0.84, 0.82, 0.045, 'k1']],
  yahoo: [['rect', 0.07, 0.07, 0.93, 0.15, 'k3'], ['rect', 0.07, 0.22, 0.4, 0.46, 'k3'], ['rect', 0.47, 0.22, 0.93, 0.28, 'k2'], ['rect', 0.47, 0.33, 0.8, 0.37, 'k3'],
    ['rect', 0.6, 0.42, 0.68, 0.55, 'k1'], ['rect', 0.07, 0.6, 0.42, 0.9, 'k3'], ['rect', 0.5, 0.64, 0.88, 0.68, 'k3'], ['rect', 0.5, 0.74, 0.8, 0.78, 'k3'], ['rect', 0.75, 0.82, 0.88, 0.9, 'k2']],
  google: [['rect', 0.3, 0.12, 0.42, 0.24, 'k2'], ['rect', 0.42, 0.14, 0.56, 0.24, 'k1'], ['rect', 0.56, 0.12, 0.7, 0.24, 'k2'],
    ['rect', 0.15, 0.33, 0.85, 0.39, 'k3'], ['rect', 0.38, 0.45, 0.62, 0.5, 'k3'],
    ['rect', 0.1, 0.62, 0.6, 0.65, 'k3'], ['rect', 0.1, 0.7, 0.75, 0.73, 'k3'], ['rect', 0.1, 0.78, 0.5, 0.81, 'k3']],
}
export function svg(p) {
  const q = [0, 1, 2, 3].map((i) => [p['q' + i + 'x'], p['q' + i + 'y']]), H = homog(q)
  const poly = (pts) => 'M' + pts.map(([u, v]) => H(u, v).map(f).join(' ')).join(' L') + ' Z'
  const col = (k) => (k === 'k0' ? `rgb(${Math.round(p.k1R * 0.5)},${Math.round(p.k1G * 0.5)},${Math.round(p.k1B * 0.6)})` : rgb(p, k))
  const items = CONTENT[KIND].map(([t, ...a]) => {
    if (t === 'rect') { const [u0, v0, u1, v1, k] = a; return `<path d="${poly([[u0, v0], [u1, v0], [u1, v1], [u0, v1]])}" fill="${col(k)}"/>` }
    if (t === 'dot') { const [u, v, r, k] = a; const pts = Array.from({ length: 12 }, (_, i) => [u + r * Math.cos((i * Math.PI) / 6), v + r * 0.9 * Math.sin((i * Math.PI) / 6)]); return `<path d="${poly(pts)}" fill="${col(k)}"/>` }
    if (t === 'arc') { const [u, v, r, w, k] = a; const out = [], inn = []; for (let i = 0; i <= 10; i++) { const an = Math.PI * (0.95 + i * 0.12); out.push([u + r * Math.cos(an), v + r * 1.2 * Math.sin(an)]); inn.unshift([u + (r - w) * Math.cos(an), v + (r - w) * 1.2 * Math.sin(an)]) } return `<path d="${poly(out.concat(inn))}" fill="${col(k)}"/>` }
    return ''
  }).join('')
  const page = poly([[0, 0], [1, 0], [1, 1], [0, 1]])
  const [l0, l1] = [H(0, 0), H(0, 1)]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="32" viewBox="0 0 28 32" overflow="visible"><defs>
<linearGradient id="p" gradientUnits="userSpaceOnUse" x1="${f(q[0][0])}" y1="${f(q[0][1])}" x2="${f(q[2][0])}" y2="${f(q[2][1])}">${stops([[0, rgb(p, 'p0')], [0.6, rgb(p, 'p1')], [1, rgb(p, 'p2')]])}</linearGradient>
</defs>
<path d="${page}" fill="none" stroke="${rgb(p, 'g')}" stroke-opacity="${f(p.go * 0.5)}" stroke-width="${f(p.gw * 2)}" stroke-linejoin="round"/><path d="${page}" fill="none" stroke="${rgb(p, 'g')}" stroke-opacity="${f(p.go)}" stroke-width="${f(p.gw)}" stroke-linejoin="round"/>
<path d="${page}" fill="url(#p)"/>${items}
<path d="M${f(l0[0] + p.ew / 2)} ${f(l0[1])} L${f(l1[0] + p.ew / 2)} ${f(l1[1])}" stroke="${rgb(p, 'e')}" stroke-opacity="${f(p.eo)}" stroke-width="${f(p.ew)}"/>
</svg>`
}
