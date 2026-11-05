// Stand-in photos: original procedural landscapes (no third-party media, no people; listed in
// docs/SUBSTITUTIONS.md). Each photo is an SVG built once as a data URL, so thumbnails are plain
// cached <img> elements (cheap in every motion-blur copy of a window).
import { memo } from 'react'
import { preload, waitFor } from '../../core/preload.js'

const rnd = (seed) => {
  let s = (seed * 2654435761) >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
function ridge(seed, base, amp, n = 9) {
  const r = rnd(seed)
  const pts = []
  for (let i = 0; i <= n; i++) pts.push([(i / n) * 160, base - amp * (0.35 + 0.65 * r())])
  let d = `M0 120 L0 ${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    d += ` Q${((x0 + x1) / 2).toFixed(1)} ${(Math.min(y0, y1) - amp * 0.15).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`
  }
  return d + ' L160 120 Z'
}

// scene presets; a photo = preset + seed (sun, ridges and small colour shifts vary)
const SCENES = {
  lake: { sky: ['#2b3f7a', '#f2a26b'], sun: [118, 70, 9, '#ffd9a0'], hills: [['#3a3b5e', 74, 18], ['#26283f', 84, 10]], water: '#46507e' },
  meadow: { sky: ['#5fa8ec', '#d9efff'], sun: [30, 22, 7, '#fffbe0'], hills: [['#7fb85a', 80, 16], ['#4f9a3c', 96, 14]], flowers: true },
  mountain: { sky: ['#3d7fd0', '#cfe6fb'], hills: [['#8a9bb5', 64, 40], ['#5c7a52', 88, 18], ['#3e5e3a', 104, 10]], snow: true },
  beach: { sky: ['#7fbff0', '#fbe6c4'], sun: [96, 40, 8, '#fff4d0'], sea: '#3b86c4', sand: '#ecd6a4' },
  snow: { sky: ['#9fb6cf', '#e9eef4'], hills: [['#f4f7fb', 82, 14], ['#dfe7f1', 98, 10]], trees: '#4a5f58' },
  harbor: { sky: ['#8fc0ec', '#e9f3fb'], sun: [42, 30, 8, '#fffaf0'], hills: [['#6f86a0', 70, 10]], water: '#3f6f9e', boats: true },
  autumn: { sky: ['#86b6e6', '#eef4fb'], hills: [['#d98b3a', 78, 22], ['#b5532a', 92, 16], ['#7a6a3a', 108, 6]] },
  night: { sky: ['#0b1236', '#2f3c78'], sun: [128, 22, 5, '#f4f2e0'], city: true },
  garden: { sky: ['#a9d4f5', '#f4fbff'], hills: [['#6aa84f', 86, 10], ['#3f7f35', 100, 8]], flowers: true, trees: '#2f5a2a' },
  field: { sky: ['#f6c79a', '#fde9d4'], sun: [42, 58, 10, '#fff1d6'], hills: [['#c9b25a', 84, 8], ['#a68d3a', 100, 6]] },
}

const shift = (hex, k) => {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + k))))
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')
}

function sceneSvg(scene, seed) {
  const p = SCENES[scene] || SCENES.meadow
  const r = rnd(seed + 11)
  const k = (r() - 0.5) * 0.3
  const o = []
  o.push(`<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shift(p.sky[0], k)}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient><radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity="0.7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`)
  o.push('<rect width="160" height="120" fill="url(#s)"/>')
  if (p.sun) {
    const sx = Math.max(16, Math.min(144, p.sun[0] + (r() - 0.5) * 60))
    const sy = p.sun[1] + (r() - 0.5) * 10
    o.push(`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${p.sun[2] * 3}" fill="url(#g)" opacity="0.6"/><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${p.sun[2]}" fill="${p.sun[3]}"/>`)
  }
  // a few clouds
  const nc = Math.floor(r() * 4)
  for (let i = 0; i < nc; i++) {
    const cx = r() * 160
    const cy = 10 + r() * 35
    const cw = 14 + r() * 26
    o.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${cw.toFixed(1)}" ry="${(cw * 0.28).toFixed(1)}" fill="#fff" opacity="${(0.35 + r() * 0.4).toFixed(2)}"/><ellipse cx="${(cx + cw * 0.4).toFixed(1)}" cy="${(cy - 3).toFixed(1)}" rx="${(cw * 0.5).toFixed(1)}" ry="${(cw * 0.25).toFixed(1)}" fill="#fff" opacity="0.5"/>`)
  }
  const hz = (r() - 0.5) * 18 // horizon shift
  o.push(`<g transform="translate(0 ${hz.toFixed(1)})">`)
  ;(p.hills || []).forEach(([c, base, amp], i) => o.push(`<path d="${ridge(seed * 7 + i * 3 + 1, base + (r() - 0.5) * 8, amp * (0.8 + r() * 0.4))}" fill="${shift(c, k)}"/>`))
  if (p.snow) o.push(`<path d="${ridge(seed * 7 + 1, 64, 40).replace(/L160 120 Z$/, 'L160 70 L0 70 Z')}" fill="#fff" opacity="0.55"/>`)
  if (p.water) {
    o.push(`<rect x="0" y="86" width="160" height="34" fill="${p.water}"/>`)
    for (const y of [92, 99, 107]) o.push(`<path d="M${10 + r() * 20} ${y} H${60 + r() * 20} M${80 + r() * 10} ${y + 2} H${130 + r() * 20}" stroke="#fff" stroke-opacity="0.2" stroke-width="0.8"/>`)
  }
  if (p.sea) o.push(`<rect x="0" y="66" width="160" height="26" fill="${p.sea}"/><path d="M0 92 Q40 ${84 + r() * 6} 80 90 T160 88 V120 H0 Z" fill="${p.sand}"/><path d="M0 92 Q40 84 80 90 T160 88" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="1.5"/>`)
  if (p.flowers) for (let i = 0; i < 26; i++) o.push(`<circle cx="${(r() * 160).toFixed(1)}" cy="${(96 + r() * 22).toFixed(1)}" r="${(0.9 + r()).toFixed(2)}" fill="${['#ffef6b', '#ff8fb0', '#ffffff'][i % 3]}"/>`)
  if (p.trees) for (const x of [18 + r() * 10, 34 + r() * 20, 110 + r() * 10, 136 + r() * 10]) o.push(`<path d="M${x.toFixed(1)} ${(88 + r() * 6).toFixed(1)} l7 20 h-14 Z" fill="${p.trees}"/>`)
  if (p.boats)
    for (const [x, y] of [[30 + r() * 30, 92], [90 + r() * 30, 97]]) o.push(`<path d="M${x.toFixed(1)} ${y} h18 l-3 4 h-12 Z" fill="#46506a"/><path d="M${(x + 9).toFixed(1)} ${y} V${y - 14} L${(x + 17).toFixed(1)} ${y - 2} Z" fill="#fdf6ee"/>`)
  if (p.city)
    for (let i = 0; i < 14; i++) {
      const bw = 8 + r() * 10
      const bh = 20 + r() * 50
      const x = i * 11.5 - 2
      o.push(`<rect x="${x}" y="${(120 - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="#141a3a"/>`)
      for (let j = 0; j < Math.floor(bh / 7); j++) if (r() > 0.4) o.push(`<rect x="${x + 2 + (j % 2) * 3}" y="${(124 - bh + j * 7).toFixed(1)}" width="2" height="2" fill="#ffd77a"/>`)
    }
  o.push(`<rect x="0" y="120" width="160" height="30" fill="${p.sand || p.water || (p.hills && p.hills[p.hills.length - 1][0]) || '#333'}"/></g>`)
  // each photo frames the scene differently (zoom and pan)
  const z = 1 + r() * 0.7
  const vw = 160 / z
  const vh = 120 / z
  const vx = r() * (160 - vw)
  const vy = (0.3 + r() * 0.7) * (120 - vh)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" preserveAspectRatio="xMidYMid slice">${o.join('')}</svg>`
}

// Each photo is drawn once as SVG, then rasterised to a JPEG blob (a bitmap is far cheaper to
// paint than an SVG image in every blur copy of a window). Until that has happened (at load; the
// capture tool waits for it) the SVG itself is used.
const urls = new Map() // key -> svg data url
const bitmaps = new Map() // svg data url -> blob url
export function photoUrl(scene, seed) {
  const k = scene + ':' + seed
  let u = urls.get(k)
  if (!u) {
    u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sceneSvg(scene, seed))
    urls.set(k, u)
    rasterize(u)
  }
  return bitmaps.get(u) || u
}
function rasterize(svg) {
  if (typeof document === 'undefined') return
  const job = (async () => {
    const img = new Image()
    img.src = svg
    await img.decode()
    const c = document.createElement('canvas')
    c.width = 320
    c.height = 240
    c.getContext('2d').drawImage(img, 0, 0, 320, 240)
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92))
    const url = URL.createObjectURL(blob)
    const im2 = new Image()
    im2.src = url
    await im2.decode()
    bitmaps.set(svg, url)
  })()
  waitFor(job)
}

// ---- the library ------------------------------------------------------------------------------
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export { MONTHS }
const GROUP_DEFS = [
  { id: 'harbor', y: 2002, m: 4, d: 2, caption: 'Harbor walk', scene: 'harbor', n: 22, keywords: ['Weekend trips', 'Harbor'], location: 'Elliott Bay' },
  { id: 'garden', y: 2002, m: 4, d: 3, caption: 'Spring garden', scene: 'garden', n: 18, keywords: ['Garden', 'Family'], location: 'Home' },
  { id: 'field', y: 2002, m: 4, d: 6, caption: 'Farm fields', scene: 'field', n: 10, keywords: ['Weekend trips'], location: 'Skagit Valley' },
  { id: 'beach', y: 2002, m: 4, d: 13, caption: 'Beach day', scene: 'beach', n: 12, keywords: ['Vacation', 'Parties'], location: 'Long Beach' },
  { id: 'ridge', y: 2001, m: 5, d: 2, caption: 'Hurricane Ridge', scene: 'mountain', n: 16, keywords: ['Hurricane Ridge', 'Hiking', 'Outdoors'], location: 'Hurricane Ridge' },
  { id: 'lake', y: 2001, m: 5, d: 3, caption: 'Lake Crescent', scene: 'lake', n: 9, keywords: ['Hiking', 'Outdoors'], location: 'Lake Crescent' },
  { id: 'autumn', y: 2001, m: 10, d: 20, caption: 'Autumn park', scene: 'autumn', n: 11, keywords: ['Family', 'Outdoors'], location: 'Volunteer Park' },
  { id: 'snow', y: 2002, m: 1, d: 12, caption: 'Snow day', scene: 'snow', n: 8, keywords: ['Family'], location: 'Home' },
  { id: 'night', y: 2001, m: 12, d: 31, caption: 'New Year lights', scene: 'night', n: 6, keywords: ['Parties'], location: 'Downtown' },
]
const COMMENTS = {
  harbor: 'A clear morning on the waterfront. We walked the whole pier and stopped for chowder.',
  garden: 'The tulips finally came up after the rain. Planted the rest of the bulbs along the fence.',
  field: 'The fields were striped with colour as far as we could see.',
  beach: 'Windy but bright. Flew the kite for an hour before the tide came in.',
  ridge: 'First trip up to the ridge this year. Still plenty of snow on the peaks.',
  lake: 'Calm water at sunset, the lake was like glass.',
  autumn: 'Leaves everywhere. A good afternoon for a long walk.',
  snow: 'A rare snow day in town. Everything was quiet.',
  night: 'Watching the lights from the hill at midnight.',
}

export const GROUPS = GROUP_DEFS.map((g) => {
  const date = new Date(Date.UTC(g.y, g.m - 1, g.d))
  const title = `${MONTHS[g.m - 1]} ${g.d}, ${g.y} ${DOW[date.getUTCDay()]}`
  const photos = Array.from({ length: g.n }, (_, i) => {
    const seed = g.id.charCodeAt(0) * 100 + i * 17 + g.n
    const video = (i === 4 || i === 13) && g.n > 10
    return {
      id: `${g.id}-${i + 1}`,
      group: g.id,
      name: `${g.caption} ${i + 1}`,
      kind: video ? 'video' : 'picture',
      scene: g.scene,
      seed,
      get url() {
        return photoUrl(g.scene, seed)
      },
      keywords: g.keywords,
      comment: COMMENTS[g.id],
      location: g.location,
      size: video ? `${(3 + ((seed * 7) % 40) / 10).toFixed(1)} MB` : `${280 + ((seed * 13) % 420)} KB`,
      created: `${DOW[date.getUTCDay()]}, ${g.m}.${g.d}.${String(g.y).slice(2)}   ${1 + (i % 11)}:${String((i * 7) % 60).padStart(2, '0')} pm`,
      date: { y: g.y, m: g.m, d: g.d },
      length: video ? `0:${String(12 + ((seed * 3) % 40)).padStart(2, '0')}` : null,
    }
  })
  return { ...g, title, photos }
})
export const PHOTOS = GROUPS.flatMap((g) => g.photos)
PHOTOS.forEach((p) => p.url) // rasterise every photo at load
export const photoById = (id) => PHOTOS.find((p) => p.id === id) || null
export const TAGS = ['Family', 'Parties', 'Weekend trips', 'Hiking', 'Garden', 'Vacation', 'Outdoors']

// ---- my Documents' picture files (fs.js) ----------------------------------------------------
export const PICTURES = [
  { id: 'lake', name: 'Lake at dusk', taken: '9/14/2003 7:42 PM', size: 412, scene: 'lake', seed: 3 },
  { id: 'meadow', name: 'Meadow in June', taken: '6/21/2003 10:05 AM', size: 388, scene: 'meadow', seed: 5 },
  { id: 'mountain', name: 'Mountain trail', taken: '8/2/2003 1:18 PM', size: 455, scene: 'mountain', seed: 8 },
  { id: 'beach', name: 'Beach walk', taken: '7/19/2003 5:51 PM', size: 367, scene: 'beach', seed: 2 },
  { id: 'snow', name: 'Snow day', taken: '1/11/2003 9:33 AM', size: 341, scene: 'snow', seed: 4 },
  { id: 'harbor', name: 'Harbor morning', taken: '5/3/2003 7:12 AM', size: 429, scene: 'harbor', seed: 6 },
  { id: 'autumn', name: 'Autumn park', taken: '10/18/2003 3:40 PM', size: 476, scene: 'autumn', seed: 9 },
  { id: 'night', name: 'City lights', taken: '12/31/2002 11:58 PM', size: 398, scene: 'night', seed: 1 },
]
const picById = (id) => PICTURES.find((p) => p.id === id) || photoById(id) || PICTURES[0]
export const pictureUrl = (id) => {
  const p = picById(id)
  return p.url || photoUrl(p.scene, p.seed)
}
PICTURES.forEach((p) => pictureUrl(p.id))

export const PictureArt = memo(function PictureArt({ id, w = 160, h = 120, style }) {
  return <img src={pictureUrl(id)} alt="" draggable={false} width={w} height={h} style={{ display: 'block', width: w, height: h, objectFit: 'cover', ...style }} />
})
export const PhotoImg = memo(function PhotoImg({ photo, w, h, style }) {
  return <img src={photo.url} alt="" draggable={false} width={w} height={h} style={{ display: 'block', width: w, height: h, objectFit: 'cover', ...style }} />
})
