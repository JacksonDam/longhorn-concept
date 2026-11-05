// Search: a blue glass magnifier, short handle down-left; icon-local px (50 x 26 box at stage 194, 52)
const C = (n, r, g, b, s = 6) => [{ n: n + 'R', v: r, s, lo: 0, hi: 255 }, { n: n + 'G', v: g, s, lo: 0, hi: 255 }, { n: n + 'B', v: b, s, lo: 0, hi: 255 }]
const P = (n, v, s, lo, hi) => ({ n, v, s, lo, hi })
export const spec = [
  P('lx', 41.2, 0.25, 39.5, 43), P('ly', 9, 0.25, 7.5, 10.5), P('lr', 7.2, 0.2, 6, 8.5), P('lw', 1.8, 0.15, 1.4, 3),
  { n: 'r0R', v: 200, s: 5, lo: 150, hi: 235 }, { n: 'r0G', v: 240, s: 5, lo: 200, hi: 255 }, { n: 'r0B', v: 255, s: 5, lo: 240, hi: 255 }, { n: 'r1R', v: 130, s: 5, lo: 90, hi: 200 }, { n: 'r1G', v: 190, s: 5, lo: 150, hi: 235 }, { n: 'r1B', v: 245, s: 5, lo: 220, hi: 255 }, { n: 'r2R', v: 170, s: 5, lo: 120, hi: 230 }, { n: 'r2G', v: 225, s: 5, lo: 180, hi: 250 }, { n: 'r2B', v: 255, s: 5, lo: 235, hi: 255 }, P('eo', 0.4, 0.05, 0, 0.9), P('ew', 1, 0.1, 0.4, 1.8), ...C('e', 30, 80, 170),
  ...C('i0', 75, 130, 215), ...C('i1', 95, 155, 230), P('io', 0.8, 0.05, 0, 1),
  P('cy', 0.55, 0.04, 0.3, 0.8), P('crx', 0.85, 0.04, 0.5, 1), P('cry', 0.35, 0.03, 0.15, 0.6), P('co', 0.9, 0.05, 0, 1), ...C('cc', 225, 248, 255),
  P('hx0', 35.5, 0.25, 33.5, 37.5), P('hy0', 14.5, 0.25, 13, 16.5), P('hx1', 23.5, 0.3, 20, 26), P('hy1', 23, 0.3, 21, 25), P('hw', 2.6, 0.15, 1.5, 3.6),
  ...C('h0', 15, 60, 150), ...C('h1', 95, 160, 235), P('ho', 0.8, 0.05, 0, 1), P('hlw', 0.9, 0.1, 0.3, 1.6), P('hlo', -0.6, 0.1, -1.4, -0.4),
]
const rgb = (p, n) => `rgb(${Math.round(p[n + 'R'])},${Math.round(p[n + 'G'])},${Math.round(p[n + 'B'])})`
const f = (v) => +(+v).toFixed(3)
const stops = (s) => s.map(([o, c, op = 1]) => `<stop offset="${f(Math.min(1, Math.max(0, o)))}" stop-color="${c}"${op < 1 ? ` stop-opacity="${f(op)}"` : ''}/>`).join('')
export function svg(p) {
  const L = Math.hypot(p.hx1 - p.hx0, p.hy1 - p.hy0), nx = (p.hy1 - p.hy0) / L, ny = -(p.hx1 - p.hx0) / L // normal pointing up-left
  const o = p.hlo
  const ri = p.lr - p.lw
  return `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="26" viewBox="0 0 50 26" overflow="visible"><defs>
<linearGradient id="r" x1="0.2" y1="0" x2="0.8" y2="1">${stops([[0, rgb(p, 'r0')], [0.55, rgb(p, 'r1')], [1, rgb(p, 'r2')]])}</linearGradient>
<linearGradient id="i" x1="0" y1="0" x2="0" y2="1">${stops([[0, rgb(p, 'i0'), p.io], [1, rgb(p, 'i1'), p.io]])}</linearGradient>
<radialGradient id="c">${stops([[0, rgb(p, 'cc'), p.co], [0.6, rgb(p, 'cc'), p.co * 0.7], [1, rgb(p, 'cc'), 0]])}</radialGradient>
<linearGradient id="h" gradientUnits="userSpaceOnUse" x1="${f(p.hx0 + nx * p.hw)}" y1="${f(p.hy0 + ny * p.hw)}" x2="${f(p.hx0 - nx * p.hw)}" y2="${f(p.hy0 - ny * p.hw)}">${stops([[0, rgb(p, 'h1')], [0.5, rgb(p, 'h0')], [1, rgb(p, 'h0')]])}</linearGradient>
<clipPath id="lc"><circle cx="${f(p.lx)}" cy="${f(p.ly)}" r="${f(ri)}"/></clipPath>
</defs>
<path d="M${f(p.hx0)} ${f(p.hy0)} L${f(p.hx1)} ${f(p.hy1)}" stroke="url(#h)" stroke-width="${f(p.hw)}" stroke-linecap="round"/>
<path d="M${f(p.hx0 + nx * o)} ${f(p.hy0 + ny * o)} L${f(p.hx1 + nx * o)} ${f(p.hy1 + ny * o)}" stroke="${rgb(p, 'h1')}" stroke-opacity="${f(p.ho)}" stroke-width="${f(p.hlw)}" stroke-linecap="round"/>
<circle cx="${f(p.lx)}" cy="${f(p.ly)}" r="${f(p.lr + p.ew / 2)}" fill="none" stroke="${rgb(p, 'e')}" stroke-opacity="${f(p.eo)}" stroke-width="${f(p.ew)}"/>
<circle cx="${f(p.lx)}" cy="${f(p.ly)}" r="${f(p.lr)}" fill="url(#r)"/>
<circle cx="${f(p.lx)}" cy="${f(p.ly)}" r="${f(ri)}" fill="url(#i)"/>
<ellipse clip-path="url(#lc)" cx="${f(p.lx)}" cy="${f(p.ly + ri * p.cy)}" rx="${f(ri * p.crx)}" ry="${f(ri * p.cry)}" fill="url(#c)"/>
</svg>`
}
