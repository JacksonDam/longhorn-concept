// my Pictures: original procedural landscape "photos" (SVG, no third-party media; listed in
// docs/SUBSTITUTIONS.md). <PictureArt id w h /> draws one at any size.
import { memo } from 'react'

// small deterministic noise for ridge lines
const rnd = (seed) => {
  let s = seed >>> 0
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

export const PICTURES = [
  { id: 'lake', name: 'Lake at dusk', taken: '9/14/2003 7:42 PM', size: 412, sky: ['#2b3f7a', '#f2a26b'], sun: [118, 70, 9, '#ffd9a0'], hills: [['#3a3b5e', 74, 18, 3], ['#26283f', 84, 10, 7]], water: '#46507e' },
  { id: 'meadow', name: 'Meadow in June', taken: '6/21/2003 10:05 AM', size: 388, sky: ['#5fa8ec', '#d9efff'], sun: [30, 22, 7, '#fffbe0'], hills: [['#7fb85a', 80, 16, 11], ['#4f9a3c', 96, 14, 5]], flowers: true },
  { id: 'mountain', name: 'Mountain trail', taken: '8/2/2003 1:18 PM', size: 455, sky: ['#3d7fd0', '#cfe6fb'], hills: [['#8a9bb5', 64, 40, 21], ['#5c7a52', 88, 18, 8], ['#3e5e3a', 104, 10, 2]], snow: true },
  { id: 'beach', name: 'Beach walk', taken: '7/19/2003 5:51 PM', size: 367, sky: ['#7fbff0', '#fbe6c4'], sun: [96, 40, 8, '#fff4d0'], sea: '#3b86c4', sand: '#ecd6a4' },
  { id: 'snow', name: 'Snow day', taken: '1/11/2003 9:33 AM', size: 341, sky: ['#9fb6cf', '#e9eef4'], hills: [['#f4f7fb', 82, 14, 31], ['#dfe7f1', 98, 10, 17]], trees: '#4a5f58' },
  { id: 'harbor', name: 'Harbor morning', taken: '5/3/2003 7:12 AM', size: 429, sky: ['#f6c79a', '#fde9d4'], sun: [42, 58, 10, '#fff1d6'], hills: [['#9a8aa8', 70, 10, 41]], water: '#c99a8a', boats: true },
  { id: 'autumn', name: 'Autumn park', taken: '10/18/2003 3:40 PM', size: 476, sky: ['#86b6e6', '#eef4fb'], hills: [['#d98b3a', 78, 22, 51], ['#b5532a', 92, 16, 13], ['#7a6a3a', 108, 6, 9]] },
  { id: 'night', name: 'City lights', taken: '12/31/2002 11:58 PM', size: 398, sky: ['#0b1236', '#2f3c78'], sun: [128, 22, 5, '#f4f2e0'], city: true },
]
export const pictureById = (id) => PICTURES.find((p) => p.id === id) || PICTURES[0]

export const PictureArt = memo(function PictureArt({ id, w = 160, h = 120, style }) {
  const p = pictureById(id)
  const g = 'pa-' + p.id
  return (
    <svg width={w} height={h} viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', ...style }}>
      <defs>
        <linearGradient id={g + 's'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
        <radialGradient id={g + 'g'}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="160" height="120" fill={`url(#${g}s)`} />
      {p.sun && (
        <>
          <circle cx={p.sun[0]} cy={p.sun[1]} r={p.sun[2] * 3} fill={`url(#${g}g)`} opacity="0.6" />
          <circle cx={p.sun[0]} cy={p.sun[1]} r={p.sun[2]} fill={p.sun[3]} />
        </>
      )}
      {(p.hills || []).map(([c, base, amp, seed], i) => (
        <path key={i} d={ridge(seed, base, amp)} fill={c} />
      ))}
      {p.snow && <path d={ridge(21, 64, 40).replace(/L160 120 Z$/, 'L160 70 L0 70 Z')} fill="#fff" opacity="0.55" />}
      {p.water && (
        <>
          <rect x="0" y="86" width="160" height="34" fill={p.water} />
          {p.sun && <rect x={p.sun[0] - 6} y="88" width="12" height="30" fill={p.sun[3]} opacity="0.35" />}
          {[92, 99, 107].map((y) => (
            <path key={y} d={`M10 ${y} H60 M80 ${y + 2} H140`} stroke="#fff" strokeOpacity="0.18" strokeWidth="0.8" />
          ))}
        </>
      )}
      {p.sea && (
        <>
          <rect x="0" y="66" width="160" height="26" fill={p.sea} />
          <path d="M0 92 Q40 84 80 90 T160 88 V120 H0 Z" fill={p.sand} />
          <path d="M0 92 Q40 84 80 90 T160 88" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5" />
        </>
      )}
      {p.flowers &&
        Array.from({ length: 26 }, (_, i) => {
          const r = rnd(i * 7 + 3)
          return <circle key={i} cx={r() * 160} cy={96 + r() * 22} r={0.9 + r()} fill={['#ffef6b', '#ff8fb0', '#ffffff'][i % 3]} />
        })}
      {p.trees &&
        [18, 34, 120, 138].map((x, i) => <path key={i} d={`M${x} ${92 - (i % 2) * 6} l7 18 h-14 Z`} fill={p.trees} />)}
      {p.boats &&
        [[50, 92], [96, 96]].map(([x, y], i) => (
          <g key={i}>
            <path d={`M${x} ${y} h18 l-3 4 h-12 Z`} fill="#5a4a5a" />
            <path d={`M${x + 9} ${y} V${y - 14} L${x + 17} ${y - 2} Z`} fill="#fdf6ee" />
          </g>
        ))}
      {p.city && (
        <>
          {Array.from({ length: 14 }, (_, i) => {
            const r = rnd(i * 13 + 5)
            const bw = 8 + r() * 10
            const bh = 20 + r() * 50
            const x = i * 11.5 - 2
            return (
              <g key={i}>
                <rect x={x} y={120 - bh} width={bw} height={bh} fill="#141a3a" />
                {Array.from({ length: Math.floor(bh / 7) }, (_, j) => (
                  <rect key={j} x={x + 2 + (j % 2) * 3} y={124 - bh + j * 7} width="2" height="2" fill="#ffd77a" opacity={r() > 0.4 ? 0.9 : 0} />
                ))}
              </g>
            )
          })}
        </>
      )}
    </svg>
  )
})
