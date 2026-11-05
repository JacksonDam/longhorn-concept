// "my music": two glass eighth notes (tubes: dark outline, light core); icon-local px (26 x 30 box at stage 401, 49)
const C = (n, r, g, b, s = 6) => [{ n: n + 'R', v: r, s, lo: 0, hi: 255 }, { n: n + 'G', v: g, s, lo: 0, hi: 255 }, { n: n + 'B', v: b, s, lo: 0, hi: 255 }]
const P = (n, v, s, lo, hi) => ({ n, v, s, lo, hi })
const note = (k, hx, hy, sx, sy) => [
  P(k + 'hx', hx, 0.25, hx - 2.5, hx + 2.5), P(k + 'hy', hy, 0.25, hy - 2.5, hy + 2.5), P(k + 'rx', 4.4, 0.2, 3.5, 6.2), P(k + 'ry', 3.8, 0.2, 2.8, 5.4), P(k + 'rot', -20, 3, -40, 0),
  P(k + 'sx', sx, 0.25, sx - 1.5, sx + 1.5), P(k + 'sy', sy, 0.3, sy - 2, sy + 2),
  P(k + 'fw', 5, 0.3, 3, 8.5), P(k + 'fh', 8, 0.4, 5, 13), P(k + 'px', -1.3, 0.25, -3, 1), P(k + 'py', -1, 0.25, -3, 1), P(k + 'ft', 2.6, 0.2, 1.5, 4), P(k + 'fb', 0, 0.3, -1, 3),
]
export const spec = [
  ...note('a', 4.5, 20.8, 7.8, 3),
  ...note('b', 14, 22, 17.8, 5),
  P('sw', 2.6, 0.15, 1.8, 3.4), P('cw', 1, 0.15, 0.3, 1.8), P('ow', 1, 0.1, 0.5, 1.3), P('pr', 1.6, 0.15, 0.6, 3), P('po', 0.9, 0.05, 0, 1),
  { n: 'olR', v: 22, s: 5, lo: 12, hi: 45 }, { n: 'olG', v: 70, s: 5, lo: 50, hi: 95 }, { n: 'olB', v: 160, s: 5, lo: 135, hi: 185 }, { n: 'coreR', v: 90, s: 5, lo: 50, hi: 130 }, { n: 'coreG', v: 150, s: 5, lo: 110, hi: 180 }, { n: 'coreB', v: 225, s: 5, lo: 190, hi: 240 }, { n: 'flR', v: 80, s: 5, lo: 50, hi: 130 }, { n: 'flG', v: 140, s: 5, lo: 110, hi: 185 }, { n: 'flB', v: 220, s: 5, lo: 190, hi: 245 }, { n: 'fl2R', v: 40, s: 5, lo: 25, hi: 90 }, { n: 'fl2G', v: 100, s: 5, lo: 75, hi: 150 }, { n: 'fl2B', v: 195, s: 5, lo: 160, hi: 225 },
  ...C('h0', 235, 252, 255), P('h1o', 0.3, 0.04, 0.1, 0.6), ...C('h1', 120, 185, 245), P('h2o', 0.75, 0.04, 0.4, 0.95), ...C('h2', 40, 100, 195), ...C('h3', 70, 135, 215),
  P('gx', 0.33, 0.04, 0.15, 0.6), P('gy', 0.3, 0.04, 0.1, 0.6), P('ko', 0.6, 0.05, 0, 1), ...C('kc', 140, 195, 250),
]
const rgb = (p, n) => `rgb(${Math.round(p[n + 'R'])},${Math.round(p[n + 'G'])},${Math.round(p[n + 'B'])})`
const f = (v) => +(+v).toFixed(3)
const stops = (s) => s.map(([o, c, op = 1]) => `<stop offset="${f(Math.min(1, Math.max(0, o)))}" stop-color="${c}"${op < 1 ? ` stop-opacity="${f(op)}"` : ''}/>`).join('')
function noteSvg(p, k) {
  const hx = p[k + 'hx'], hy = p[k + 'hy'], sx = p[k + 'sx'], sy = p[k + 'sy'], fw = p[k + 'fw'], fh = p[k + 'fh'], ft = p[k + 'ft']
  // flag: leaves the stem top, swells right and droops to its tip; its underside curves back to the stem
  const flag = `M${f(sx)} ${f(sy)} C${f(sx + fw * 0.55)} ${f(sy + 0.4)} ${f(sx + fw)} ${f(sy + fh * 0.35)} ${f(sx + fw * 0.85)} ${f(sy + fh)} C${f(sx + fw * 0.75 - p[k + 'fb'])} ${f(sy + fh * 0.6 + p[k + 'fb'])} ${f(sx + fw * 0.35)} ${f(sy + ft + 1 + p[k + 'fb'])} ${f(sx)} ${f(sy + ft + 1.6 + p[k + 'fb'])} Z`
  const stem = `M${f(sx)} ${f(sy + 0.3)} L${f(sx)} ${f(hy - 1)}`
  const ol = `stroke="${rgb(p, 'ol')}" stroke-width="${f(p.ow)}" stroke-linejoin="round"`
  return `<path d="${flag}" fill="url(#fl)" ${ol}/>` +
    `<path d="${stem}" stroke="${rgb(p, 'ol')}" stroke-width="${f(p.sw)}" stroke-linecap="round"/>` +
    `<path d="${stem}" stroke="${rgb(p, 'core')}" stroke-width="${f(p.cw)}" stroke-linecap="round"/>` +
    `<g transform="rotate(${f(p[k + 'rot'])} ${f(hx)} ${f(hy)})"><ellipse cx="${f(hx)}" cy="${f(hy)}" rx="${f(p[k + 'rx'])}" ry="${f(p[k + 'ry'])}" fill="url(#h)" ${ol}/>` +
    `<ellipse cx="${f(hx)}" cy="${f(hy)}" rx="${f(p[k + 'rx'] - p.ow * 0.5)}" ry="${f(p[k + 'ry'] - p.ow * 0.5)}" fill="url(#k)"/>` +
    `<ellipse cx="${f(hx + p[k + 'px'])}" cy="${f(hy + p[k + 'py'])}" rx="${f(p.pr * 1.3)}" ry="${f(p.pr)}" fill="url(#p)"/></g>`
}
export function svg(p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="30" viewBox="0 0 26 30" overflow="visible"><defs>
<linearGradient id="fl" x1="0" y1="0" x2="1" y2="1">${stops([[0, rgb(p, 'fl')], [1, rgb(p, 'fl2')]])}</linearGradient>
<radialGradient id="h" cx="${f(p.gx)}" cy="${f(p.gy)}" r="0.8">${stops([[0, rgb(p, 'h0')], [p.h1o, rgb(p, 'h1')], [p.h2o, rgb(p, 'h2')], [1, rgb(p, 'h3')]])}</radialGradient>
<radialGradient id="p">${stops([[0, '#fff', p.po], [0.45, '#f0fbff', p.po * 0.8], [1, '#e0f4ff', 0]])}</radialGradient>
<radialGradient id="k" cx="0.5" cy="0.5" r="0.5">${stops([[0, rgb(p, 'kc'), 0], [0.72, rgb(p, 'kc'), 0], [0.92, rgb(p, 'kc'), p.ko], [1, rgb(p, 'kc'), 0]])}</radialGradient>
</defs>
${noteSvg(p, 'a')}${noteSvg(p, 'b')}
</svg>`
}
