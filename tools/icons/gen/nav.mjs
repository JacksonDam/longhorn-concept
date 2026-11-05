// back/forward pair in its sunken well (soft radial layers); icon-local px (60 x 40 box at stage 55, 42)
const C = (n, r, g, b, s = 6) => [{ n: n + 'R', v: r, s, lo: 0, hi: 255 }, { n: n + 'G', v: g, s, lo: 0, hi: 255 }, { n: n + 'B', v: b, s, lo: 0, hi: 255 }]
const P = (n, v, s, lo, hi) => ({ n, v, s, lo, hi })
const orb = (k, x, y, r, dark, body0, body1, body2, rim, cap) => [
  P(k + 'x', x, 0.25, x - 2, x + 2), P(k + 'y', y, 0.25, y - 1.5, y + 1.5), P(k + 'r', r, 0.2, r - 0.8, r + 0.8),
  P(k + 'ow', 1.6, 0.15, 0.8, 2.6), P(k + 'oo', 0.85, 0.05, 0.2, 1), ...C(k + 'o0', ...dark[0]), ...C(k + 'o1', ...dark[1]),
  P(k + 'fx', 0.7, 0.04, 0.3, 0.97), P(k + 'fy', 0.25, 0.04, 0.05, 0.6), ...C(k + 'b0', ...body0), P(k + 'b1o', 0.5, 0.05, 0.15, 0.85), ...C(k + 'b1', ...body1), ...C(k + 'b2', ...body2),
  P(k + 'ro', 0.35, 0.05, 0, 1), P(k + 'rw', 0.22, 0.03, 0.08, 0.6), ...C(k + 'rc', ...rim),
  P(k + 'hy', 0.45, 0.04, 0.2, 0.7), P(k + 'ho', 0.6, 0.05, 0, 1), ...C(k + 'hc', ...cap),
]
export const spec = [
  P('ax', 19.5, 0.3, 18.5, 20.5), P('ay', 22.5, 0.3, 21.5, 23.5), P('ar', 15.2, 0.25, 14.3, 16),
  P('bx', 47.5, 0.3, 45, 52), P('by', 23, 0.3, 22, 24), P('br', 9.8, 0.25, 9, 11),
  P('se', 1.5, 0.15, 0.3, 3), P('so', 0.3, 0.05, 0, 0.8), ...C('w0', 52, 111, 197), P('w1o', 0.45, 0.04, 0.2, 0.7), ...C('w1', 76, 128, 206), P('w2o', 0.85, 0.02, 0.7, 0.97), ...C('w2', 130, 176, 240), ...C('w3', 118, 167, 229),
  ...orb('o', 19.5, 20.5, 14.4, [[40, 92, 182], [90, 135, 205]], [232, 245, 255], [175, 207, 247], [100, 148, 216], [200, 228, 255], [235, 246, 255]),
  P('kx', 14, 0.5, 9, 20), P('ky', 30, 0.5, 26, 34), P('kr', 6, 0.4, 3, 10), P('ko', 0.7, 0.05, 0, 1), ...C('kc', 190, 222, 255),
  P('atx', 15, 0.25, 14, 16.5), P('abx', 21.5, 0.25, 20.5, 22.5), P('aty', 22, 0.25, 21, 23), P('ah', 6, 0.25, 5, 7),
  ...C('ac0', 220, 240, 255), ...C('ac1', 165, 202, 245), P('adw', 1.8, 0.15, 0.8, 3), P('ado', 0.6, 0.06, 0, 1), ...C('ad', 85, 120, 185),
  ...orb('f', 48.3, 21.5, 8.8, [[55, 105, 192], [88, 138, 205]], [190, 220, 252], [140, 182, 238], [105, 152, 218], [190, 220, 252], [215, 236, 255]),
  P('ftx', 51.5, 0.25, 50, 54), P('fbx', 46.8, 0.25, 45.5, 49), P('fty', 22, 0.25, 21, 23), P('fh', 3.5, 0.2, 2.8, 4.5), ...C('fa', 215, 238, 255),
]
const rgb = (p, n) => `rgb(${Math.round(p[n + 'R'])},${Math.round(p[n + 'G'])},${Math.round(p[n + 'B'])})`
const f = (v) => +(+v).toFixed(3)
function hull(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), th = Math.atan2(dy, dx), al = Math.acos((r1 - r2) / L)
  const pt = (x, y, r, a) => [f(x + r * Math.cos(a)), f(y + r * Math.sin(a))]
  const u1 = pt(x1, y1, r1, th - al), u2 = pt(x2, y2, r2, th - al), d2 = pt(x2, y2, r2, th + al), d1 = pt(x1, y1, r1, th + al)
  return `M${u1} L${u2} A${f(r2)} ${f(r2)} 0 0 1 ${d2} L${d1} A${f(r1)} ${f(r1)} 0 1 1 ${u1} Z`
}
const stops = (s) => s.map(([o, c, op = 1]) => `<stop offset="${f(Math.min(1, Math.max(0, o)))}" stop-color="${c}"${op < 1 ? ` stop-opacity="${f(op)}"` : ''}/>`).join('')
const lin = (id, s, a = 'x1="0" y1="0" x2="0" y2="1"') => `<linearGradient id="${id}" ${a}>${stops(s)}</linearGradient>`
const rad = (id, s, a = '') => `<radialGradient id="${id}" ${a}>${stops(s)}</radialGradient>`
// one glass orb: soft dark outline ring, body lit from the upper right, fresnel rim, top cap
function orbSvg(p, k, extra = '') {
  const x = p[k + 'x'], y = p[k + 'y'], r = p[k + 'r'], ow = p[k + 'ow'], R = r + ow * 0.6, ri = r - ow * 0.5
  const defs = lin(k + 'O', [[0, rgb(p, k + 'o0')], [1, rgb(p, k + 'o1')]]) +
    rad(k + 'M', [[0, '#fff'], [(r - ow) / R, '#fff'], [(r - ow * 0.35) / R, '#000'], [r / R, '#000'], [1, '#fff']]) +
    `<mask id="${k}m" maskContentUnits="userSpaceOnUse"><circle cx="${f(x)}" cy="${f(y)}" r="${f(R)}" fill="#fff"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(R)}" fill="url(#${k}M)" style="mix-blend-mode:normal"/></mask>` +
    rad(k + 'B', [[0, rgb(p, k + 'b0')], [p[k + 'b1o'], rgb(p, k + 'b1')], [1, rgb(p, k + 'b2')]], `cx="0.5" cy="0.5" r="0.5" fx="${f(p[k + 'fx'])}" fy="${f(p[k + 'fy'])}"`) +
    rad(k + 'R', [[0, rgb(p, k + 'rc'), 0], [1 - p[k + 'rw'], rgb(p, k + 'rc'), 0], [0.93, rgb(p, k + 'rc'), p[k + 'ro']], [1, rgb(p, k + 'rc'), p[k + 'ro'] * 0.4]]) +
    lin(k + 'H', [[0, rgb(p, k + 'hc'), p[k + 'ho']], [1, rgb(p, k + 'hc'), 0]])
  const body = `<circle cx="${f(x)}" cy="${f(y)}" r="${f(ri)}" fill="url(#${k}B)"/>` + extra +
    `<circle cx="${f(x)}" cy="${f(y)}" r="${f(ri)}" fill="url(#${k}R)"/>` +
    `<ellipse cx="${f(x)}" cy="${f(y - ri * (1 - p[k + 'hy']))}" rx="${f(ri * 0.86)}" ry="${f(ri * p[k + 'hy'])}" fill="url(#${k}H)"/>`
  // the dark outline: a ring from r - ow to r + 0.6 ow, opaque at r - 0.35 ow .. r, soft both sides
  const ring = rad(k + 'D', [[(r - ow) / R, rgb(p, k + 'o0'), 0], [(r - ow * 0.4) / R, rgb(p, k + 'o0'), p[k + 'oo']], [r / R, rgb(p, k + 'o0'), p[k + 'oo']], [1, rgb(p, k + 'o0'), 0]])
  const ring2 = rad(k + 'D2', [[(r - ow) / R, rgb(p, k + 'o1'), 0], [(r - ow * 0.4) / R, rgb(p, k + 'o1'), p[k + 'oo']], [r / R, rgb(p, k + 'o1'), p[k + 'oo']], [1, rgb(p, k + 'o1'), 0]])
  return {
    defs: defs + ring + ring2 + lin(k + 'V', [[0, '#fff'], [1, '#fff', 0]]) + `<mask id="${k}v" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#${k}V)"/></mask>`,
    body: body + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R)}" fill="url(#${k}D2)"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(R)}" fill="url(#${k}D)" mask="url(#${k}v)"/>`,
  }
}
export function svg(p) {
  const top = Math.min(p.ay - p.ar, p.by - p.br), bot = Math.max(p.ay + p.ar, p.by + p.br)
  const o = orbSvg(p, 'o', `<circle cx="${f(p.kx)}" cy="${f(p.ky)}" r="${f(p.kr)}" fill="url(#k)"/>`), fo = orbSvg(p, 'f')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40" viewBox="0 0 60 40" overflow="visible"><defs>
${lin('w', [[0, rgb(p, 'w0')], [p.w1o, rgb(p, 'w1')], [p.w2o, rgb(p, 'w2')], [1, rgb(p, 'w3')]], `gradientUnits="userSpaceOnUse" x1="0" y1="${f(top)}" x2="0" y2="${f(bot)}"`)}
${lin('se', [[0, rgb(p, 'w0'), p.so / 3], [0.5, rgb(p, 'w0'), 0]], `gradientUnits="userSpaceOnUse" x1="0" y1="${f(top - p.se)}" x2="0" y2="${f(bot)}"`)}
${lin('ad', [[0, rgb(p, 'ad'), p.ado], [1, rgb(p, 'ad'), 0]], `gradientUnits="userSpaceOnUse" x1="${f(p.abx)}" y1="0" x2="${f(p.abx + p.adw)}" y2="0"`)}
${rad('k', [[0, rgb(p, 'kc'), p.ko], [1, rgb(p, 'kc'), 0]], `gradientUnits="userSpaceOnUse" cx="${f(p.kx)}" cy="${f(p.ky)}" r="${f(p.kr)}"`)}
${lin('a', [[0, rgb(p, 'ac0')], [1, rgb(p, 'ac1')]], `gradientUnits="userSpaceOnUse" x1="${f(p.atx)}" y1="0" x2="${f(p.abx)}" y2="0"`)}
${o.defs}${fo.defs}
<clipPath id="oc"><circle cx="${f(p.ox)}" cy="${f(p.oy)}" r="${f(p.or - p.oow * 0.5)}"/></clipPath>
</defs>
${[1, 2, 3].map((i) => `<path d="${hull(p.ax, p.ay - p.se * i / 3, p.ar + p.se * i / 6, p.bx, p.by - p.se * i / 3, p.br + p.se * i / 6)}" fill="url(#se)"/>`).reverse().join('')}
<path d="${hull(p.ax, p.ay, p.ar, p.bx, p.by, p.br)}" fill="url(#w)"/>
${o.body.replace(`<circle cx="${f(p.kx)}"`, `<circle clip-path="url(#oc)" cx="${f(p.kx)}"`)}
<path d="M${f(p.atx)} ${f(p.aty)} L${f(p.abx)} ${f(p.aty - p.ah)} L${f(p.abx)} ${f(p.aty + p.ah)} Z" fill="url(#a)"/>
<rect x="${f(p.abx)}" y="${f(p.aty - p.ah)}" width="${f(p.adw)}" height="${f(2 * p.ah)}" fill="url(#ad)"/>
${fo.body}
<path d="M${f(p.ftx)} ${f(p.fty)} L${f(p.fbx)} ${f(p.fty - p.fh)} L${f(p.fbx)} ${f(p.fty + p.fh)} Z" fill="${rgb(p, 'fa')}"/>
</svg>`
}
