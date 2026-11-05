// Favorites: a pale blue glass star; icon-local px (30 x 30 box at stage 704, 48)
const C = (n, r, g, b, s = 6) => [{ n: n + 'R', v: r, s, lo: 0, hi: 255 }, { n: n + 'G', v: g, s, lo: 0, hi: 255 }, { n: n + 'B', v: b, s, lo: 0, hi: 255 }]
const P = (n, v, s, lo, hi) => ({ n, v, s, lo, hi })
export const spec = [
  P('x', 14.5, 0.25, 13, 16), P('y', 15.6, 0.25, 14, 17), P('R', 14, 0.25, 12, 16), P('k', 0.48, 0.02, 0.36, 0.62), P('rot', 0, 1.5, -8, 8), P('rr', 0.8, 0.15, 0, 2.5),
  ...C('c0', 235, 245, 255), P('c1o', 0.45, 0.04, 0.2, 0.8), ...C('c1', 190, 220, 252), ...C('c2', 120, 175, 240), P('gy', 0.45, 0.04, 0.2, 0.7),
  P('ow', 1, 0.1, 0.3, 2), ...C('o0', 210, 235, 255), ...C('o1', 40, 100, 195), P('oo', 0.85, 0.05, 0, 1),
  P('hk', 0.6, 0.04, 0.3, 0.85), P('hdy', -1.5, 0.25, -4, 1), P('ho', 0.4, 0.05, 0, 1), ...C('hc', 255, 255, 255),
]
const rgb = (p, n) => `rgb(${Math.round(p[n + 'R'])},${Math.round(p[n + 'G'])},${Math.round(p[n + 'B'])})`
const f = (v) => +(+v).toFixed(3)
const stops = (s) => s.map(([o, c, op = 1]) => `<stop offset="${f(Math.min(1, Math.max(0, o)))}" stop-color="${c}"${op < 1 ? ` stop-opacity="${f(op)}"` : ''}/>`).join('')
// star path with rounded tips (quadratic through each outer point)
function star(cx, cy, R, k, rot, rr) {
  const pts = []
  for (let i = 0; i < 10; i++) { const a = ((rot - 90 + i * 36) * Math.PI) / 180, r = i % 2 ? R * k : R; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]) }
  let d = ''
  for (let i = 0; i < 10; i += 2) {
    const o = pts[i], a = pts[(i + 9) % 10], b = pts[i + 1]
    const t = Math.min(0.45, rr / Math.hypot(o[0] - a[0], o[1] - a[1]))
    const p1 = [o[0] + (a[0] - o[0]) * t, o[1] + (a[1] - o[1]) * t], p2 = [o[0] + (b[0] - o[0]) * t, o[1] + (b[1] - o[1]) * t]
    d += `${i ? 'L' : 'M'}${f(p1[0])} ${f(p1[1])} Q${f(o[0])} ${f(o[1])} ${f(p2[0])} ${f(p2[1])} L${f(b[0])} ${f(b[1])} `
  }
  return d + 'Z'
}
export function svg(p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30" overflow="visible"><defs>
<radialGradient id="b" gradientUnits="userSpaceOnUse" cx="${f(p.x)}" cy="${f(p.y - p.R * (0.5 - p.gy))}" r="${f(p.R)}">${stops([[0, rgb(p, 'c0')], [p.c1o, rgb(p, 'c1')], [1, rgb(p, 'c2')]])}</radialGradient>
<linearGradient id="o" gradientUnits="userSpaceOnUse" x1="0" y1="${f(p.y - p.R)}" x2="0" y2="${f(p.y + p.R * 0.8)}">${stops([[0, rgb(p, 'o0'), p.oo], [1, rgb(p, 'o1'), p.oo]])}</linearGradient>
<radialGradient id="h">${stops([[0, rgb(p, 'hc'), p.ho], [1, rgb(p, 'hc'), 0]])}</radialGradient>
</defs>
<path d="${star(p.x, p.y, p.R, p.k, p.rot, p.rr)}" fill="url(#b)" stroke="url(#o)" stroke-width="${f(p.ow)}" stroke-linejoin="round"/>
<clipPath id="sc"><path d="${star(p.x, p.y, p.R, p.k, p.rot, p.rr)}"/></clipPath>
<ellipse clip-path="url(#sc)" cx="${f(p.x - 1)}" cy="${f(p.y + p.hdy)}" rx="${f(p.R * p.hk)}" ry="${f(p.R * p.hk * 0.75)}" fill="url(#h)"/>
</svg>`
}
