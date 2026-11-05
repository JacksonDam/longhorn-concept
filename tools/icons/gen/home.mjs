// Home: the MSN butterfly in white/blue glass over a glass bowl; icon-local px (34 x 36 box at stage 135, 45)
const C = (n, r, g, b, s = 6) => [{ n: n + 'R', v: r, s, lo: 0, hi: 255 }, { n: n + 'G', v: g, s, lo: 0, hi: 255 }, { n: n + 'B', v: b, s, lo: 0, hi: 255 }]
const P = (n, v, s, lo, hi) => ({ n, v, s, lo, hi })
export const spec = [
  // bowl
  P('bx', 18.5, 0.3, 16.5, 20.5), P('by', 22, 0.3, 20, 24), P('br', 11.5, 0.25, 9.5, 13),
  ...C('b0', 70, 125, 205), ...C('b1', 95, 150, 225), P('bo', 0.6, 0.05, 0, 1),
  ...C('rc', 170, 210, 255), P('ro', 0.85, 0.05, 0, 1), P('rw', 0.18, 0.02, 0.06, 0.4), P('rdy', 1.2, 0.2, 0, 3),
  P('sdx', 0, 0.4, -4, 7), P('sdy', -3, 0.4, -7, 5), P('sdr', 7, 0.4, 3, 11), P('sdo', 0.5, 0.05, 0, 1), ...C('sd', 35, 85, 175),
  // dark outer wing
  P('dx0', 1, 0.3, -1, 4), P('dy0', 8, 0.3, 5, 11), P('dx1', 11, 0.3, 8, 13), P('dy1', 19, 0.3, 16, 21), P('dw', 3, 0.2, 1.5, 7), P('dbow', 1, 0.3, -2, 4),
  ...C('d0', 40, 95, 190), ...C('d1', 10, 45, 130),
  // white sail wing
  P('sx0', 16, 0.3, 14, 18), P('sy0', 4, 0.3, 2, 6), P('sxl', 8.8, 0.3, 7, 11), P('syl', 12, 0.3, 9, 15), P('sx1', 14, 0.3, 12, 18.5), P('sy1', 21, 0.3, 18.5, 23), P('sxr', 19.2, 0.3, 17.5, 21), P('syr', 10, 0.3, 7, 13),
  ...C('s0', 255, 255, 255), ...C('s1', 200, 235, 255), ...C('s2', 150, 195, 245),
  // ball
  P('cx', 23, 0.3, 21, 25), P('cy', 16, 0.3, 14, 18), P('cr', 3.2, 0.2, 2, 5), P('ch', 1.8, 0.2, 1, 3),
  ...C('c0', 255, 255, 250), ...C('c1', 175, 225, 255), P('co', 0.9, 0.05, 0.3, 1),
]
const rgb = (p, n) => `rgb(${Math.round(p[n + 'R'])},${Math.round(p[n + 'G'])},${Math.round(p[n + 'B'])})`
const f = (v) => +(+v).toFixed(3)
const stops = (s) => s.map(([o, c, op = 1]) => `<stop offset="${f(Math.min(1, Math.max(0, o)))}" stop-color="${c}"${op < 1 ? ` stop-opacity="${f(op)}"` : ''}/>`).join('')
export function svg(p) {
  // dark wing: a leaf between (dx0,dy0) and (dx1,dy1), bowed by dbow
  const mx = (p.dx0 + p.dx1) / 2, my = (p.dy0 + p.dy1) / 2, L = Math.hypot(p.dx1 - p.dx0, p.dy1 - p.dy0), nx = -(p.dy1 - p.dy0) / L, ny = (p.dx1 - p.dx0) / L
  const c1 = [mx + nx * (p.dw / 2 + p.dbow), my + ny * (p.dw / 2 + p.dbow)], c2 = [mx - nx * (p.dw / 2 - p.dbow), my - ny * (p.dw / 2 - p.dbow)]
  const dark = `M${f(p.dx0)} ${f(p.dy0)} Q${f(c1[0])} ${f(c1[1])} ${f(p.dx1)} ${f(p.dy1)} Q${f(c2[0])} ${f(c2[1])} ${f(p.dx0)} ${f(p.dy0)} Z`
  const sail = `M${f(p.sx0)} ${f(p.sy0)} C${f(p.sxl + 0.5)} ${f(p.sy0 + 1)} ${f(p.sxl - 0.5)} ${f(p.syl - 2)} ${f(p.sxl)} ${f(p.syl)} C${f(p.sxl + 0.5)} ${f(p.syl + 4)} ${f(p.sx1 - 1.5)} ${f(p.sy1 - 1)} ${f(p.sx1)} ${f(p.sy1)} C${f(p.sx1 + 1.5)} ${f(p.sy1 - 4)} ${f(p.sxr + 0.3)} ${f(p.syr + 3)} ${f(p.sxr)} ${f(p.syr)} C${f(p.sxr - 0.3)} ${f(p.syr - 3)} ${f(p.sx0 + 2)} ${f(p.sy0)} ${f(p.sx0)} ${f(p.sy0)} Z`
  const R = p.br
  return `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="36" viewBox="0 0 34 36" overflow="visible"><defs>
<radialGradient id="b" cx="0.5" cy="0.45" r="0.5">${stops([[0, rgb(p, 'b0'), p.bo], [1, rgb(p, 'b1'), p.bo]])}</radialGradient>
<radialGradient id="r" cx="0.5" cy="${f(0.5 + p.rdy / (2 * R))}" r="0.5">${stops([[0, rgb(p, 'rc'), 0], [1 - p.rw, rgb(p, 'rc'), 0], [1 - p.rw * 0.35, rgb(p, 'rc'), p.ro], [1, rgb(p, 'rc'), p.ro * 0.3]])}</radialGradient>
<linearGradient id="rv" x1="0" y1="0" x2="0" y2="1">${stops([[0.25, '#fff', 0], [0.75, '#fff']])}</linearGradient>
<mask id="rm" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#rv)"/></mask>
<radialGradient id="sd" gradientUnits="userSpaceOnUse" cx="${f(p.bx + p.sdx)}" cy="${f(p.by + p.sdy)}" r="${f(p.sdr)}">${stops([[0, rgb(p, 'sd'), p.sdo], [1, rgb(p, 'sd'), 0]])}</radialGradient>
<linearGradient id="d" x1="0" y1="0" x2="1" y2="1">${stops([[0, rgb(p, 'd0')], [1, rgb(p, 'd1')]])}</linearGradient>
<linearGradient id="s" x1="0.2" y1="0" x2="0.6" y2="1">${stops([[0, rgb(p, 's0')], [0.55, rgb(p, 's1')], [1, rgb(p, 's2')]])}</linearGradient>
<radialGradient id="c" gradientUnits="userSpaceOnUse" cx="${f(p.cx)}" cy="${f(p.cy)}" r="${f(p.cr + p.ch)}">${stops([[0, rgb(p, 'c0'), p.co], [p.cr / (p.cr + p.ch) * 0.6, rgb(p, 'c0'), p.co], [p.cr / (p.cr + p.ch), rgb(p, 'c1'), p.co * 0.8], [1, rgb(p, 'c1'), 0]])}</radialGradient>
<clipPath id="bc"><circle cx="${f(p.bx)}" cy="${f(p.by)}" r="${f(R)}"/></clipPath>
</defs>
<circle cx="${f(p.bx)}" cy="${f(p.by)}" r="${f(R)}" fill="url(#b)"/>
<circle clip-path="url(#bc)" cx="${f(p.bx + p.sdx)}" cy="${f(p.by + p.sdy)}" r="${f(p.sdr)}" fill="url(#sd)"/>
<circle cx="${f(p.bx)}" cy="${f(p.by)}" r="${f(R)}" fill="url(#r)" mask="url(#rm)"/>
<path d="${dark}" fill="url(#d)"/>
<path d="${sail}" fill="url(#s)"/>
<circle cx="${f(p.cx)}" cy="${f(p.cy)}" r="${f(p.cr + p.ch)}" fill="url(#c)"/>
</svg>`
}
