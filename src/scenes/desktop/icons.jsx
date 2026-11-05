// Hand-drawn SVG versions of the small Plex sidebar / taskbar / flyout icons, sized in
// video pixels. Gradient ids are namespaced 'dk-' so multiple copies can share them.
import { memo } from 'react'

const svg = (w, h, extra) => ({
  width: w,
  height: h,
  viewBox: `0 0 ${w} ${h}`,
  style: { position: 'absolute', overflow: 'visible', ...extra },
})

// Shared <defs>, rendered once inside the scene.
export const IconDefs = memo(function IconDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <linearGradient id="dk-env" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f2ee" />
          <stop offset="0.55" stopColor="#c9c5c0" />
          <stop offset="1" stopColor="#8f8c8c" />
        </linearGradient>
        <linearGradient id="dk-env-hot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset="0.5" stopColor="#f2deaa" />
          <stop offset="1" stopColor="#bba062" />
        </linearGradient>
        <linearGradient id="dk-open" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9eefb" />
          <stop offset="1" stopColor="#b9c4e2" />
        </linearGradient>
        <radialGradient id="dk-play" cx="0.45" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#8fd0ff" />
          <stop offset="0.45" stopColor="#2f86ec" />
          <stop offset="0.85" stopColor="#1556c2" />
          <stop offset="1" stopColor="#5a8fe0" />
        </radialGradient>
        <radialGradient id="dk-small" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#d6dcec" />
          <stop offset="0.7" stopColor="#9aa6c6" />
          <stop offset="1" stopColor="#7d89ae" />
        </radialGradient>
        <radialGradient id="dk-orb" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#bfe4ff" />
          <stop offset="0.35" stopColor="#3a8cf2" />
          <stop offset="0.8" stopColor="#0f42b8" />
          <stop offset="1" stopColor="#2a5fd0" />
        </radialGradient>
        <linearGradient id="dk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d9bc8" stopOpacity="0" />
          <stop offset="1" stopColor="#c9c2c8" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="dk-bldg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe2c4" />
          <stop offset="1" stopColor="#8e7f78" />
        </linearGradient>
        <linearGradient id="dk-bldg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#59607e" />
          <stop offset="1" stopColor="#3b3f58" />
        </linearGradient>
        <radialGradient id="dk-chev" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#eef0f4" />
          <stop offset="1" stopColor="#c9ced8" />
        </radialGradient>
      </defs>
    </svg>
  )
})

// Unread mail: a closed envelope standing up, its flap seam a soft V (16 x 16)
export function EnvelopeClosed({ x, y, hot }) {
  const fill = hot ? 'url(#dk-env-hot)' : 'url(#dk-env)'
  return (
    <svg {...svg(16, 16, { left: x, top: y })}>
      <path d="M1 3.4 Q1 1.6 2.8 1.4 L9.2 0.6 Q11 0.5 12.6 1.6 L14.8 3.4 L15 14.2 Q15 15.6 13.6 15.6 L2.4 15.6 Q1 15.6 1 14.2 Z" fill={fill} stroke="#6f7590" strokeOpacity="0.55" strokeWidth="0.8" />
      <path d="M1.6 3.6 L8 9.4 L14.6 3.6" fill="none" stroke="#8e8c98" strokeOpacity="0.45" strokeWidth="1" />
      <path d="M2 2.4 L9 1.4" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1" />
    </svg>
  )
}

// Read mail: an opened envelope seen from above, a pale translucent diamond (18 x 12)
export function EnvelopeOpen({ x, y }) {
  return (
    <svg {...svg(18, 12, { left: x, top: y })}>
      <path d="M0.6 6 L9 0.6 L17.4 6 L9 11.4 Z" fill="#dfe6fb" fillOpacity="0.42" stroke="#eef2ff" strokeOpacity="0.6" strokeWidth="0.9" />
      <path d="M3.6 5.6 L14.4 5.6 L9 8.8 Z" fill="#f4f7ff" fillOpacity="0.45" />
    </svg>
  )
}

// Messenger "away" buddy: a small person behind an alarm clock, muted (17 x 18)
export function BuddyAway({ x, y }) {
  return (
    <svg {...svg(17, 18, { left: x, top: y })}>
      <g opacity="0.85">
        <circle cx="10.6" cy="3.2" r="2.3" fill="#7fc8b0" />
        <path d="M7 15.5 C7 10 8.5 6.5 10.8 6.5 C13.6 6.5 15.4 10 15.4 15.5 Z" fill="#4a7fd0" />
        <circle cx="5.6" cy="11.2" r="4.3" fill="#e9e4de" stroke="#c0503c" strokeWidth="1.3" />
        <path d="M5.6 8.6 L5.6 11.4 L7.4 12.3" fill="none" stroke="#3a3a3a" strokeWidth="0.9" />
        <circle cx="2.4" cy="7" r="1.1" fill="#c0503c" />
        <circle cx="8.8" cy="7" r="1.1" fill="#c0503c" />
      </g>
    </svg>
  )
}

// "Swimmer Dude" display picture stand-in: a khaki figure with arms up on a pale tile (16 x 17)
export function SwimmerPic({ x, y }) {
  const limbs = 'M8 6.6 L8 11 M8 7.8 L3.6 5 M8 7.8 L12.4 5 M8 11 L4.4 15.6 M8 11 L11.6 15.6'
  return (
    <svg {...svg(16, 17, { left: x, top: y })}>
      <rect x="0.5" y="0.5" width="15" height="16" rx="1" fill="#dfe6ee" fillOpacity="0.35" />
      <path d={limbs} stroke="#4c4226" strokeWidth="3.4" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d={limbs} stroke="#d8b450" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="8" cy="3.8" r="2.4" fill="#d8b450" stroke="#4c4226" strokeWidth="0.8" />
    </svg>
  )
}

// Orange display picture (stand-in for a sports-brand logo tile): plain orange square
// with a soft white stroke (17 x 18)
export function OrangePic({ x, y }) {
  return (
    <svg {...svg(17, 18, { left: x, top: y })}>
      <rect x="0.5" y="0.5" width="16" height="17" fill="#ee6a22" stroke="#7a3814" strokeWidth="1" />
      <path d="M4 11 Q8.5 11.4 13.4 8" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// Seattle weather tile art: a dusk skyline with the Space Needle, drawn (82 x 30).
// Buildings are generated from a fixed list so the art is deterministic.
const TOWERS = (() => {
  const out = []
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  let x = 4
  while (x < 82) {
    const w = 2 + Math.floor(rnd() * 3)
    const nearNeedle = Math.abs(x - 42) < 6
    const tall = x > 62 && x < 72 ? 7 + rnd() * 4 : x < 14 ? 20 + rnd() * 4 : 14 + rnd() * 8
    out.push({ x, w, top: nearNeedle ? 17 + rnd() * 4 : tall, lit: rnd() > 0.4, dark: x > 62 && x < 72 })
    x += w + (rnd() > 0.7 ? 1 : 0)
  }
  return out
})()
export const Skyline = memo(function Skyline({ x, y }) {
  return (
    <svg {...svg(82, 30, { left: x, top: y })}>
      <rect x="0" y="12" width="82" height="18" fill="url(#dk-sky)" />
      <rect x="0" y="10" width="82" height="4" fill="#c9c4dc" opacity="0.35" />
      {TOWERS.map((b, i) => (
        <rect key={i} x={b.x} y={b.top} width={b.w} height={28 - b.top} fill={b.dark ? 'url(#dk-bldg2)' : 'url(#dk-bldg)'} opacity={b.lit ? 0.95 : 0.6} />
      ))}
      {TOWERS.filter((b) => b.lit && !b.dark).map((b, i) => (
        <rect key={'w' + i} x={b.x + 0.5} y={b.top + 2} width={Math.max(1, b.w - 1)} height={28 - b.top - 4} fill="#fff6dc" opacity="0.35" />
      ))}
      {/* Space Needle */}
      <path d="M41.4 7 L42.2 28 M44.6 7 L43.8 28" stroke="#e4ebf3" strokeWidth="1.2" />
      <path d="M43 7 L43 28" stroke="#6f7f9a" strokeWidth="0.6" />
      <ellipse cx="43" cy="7.6" rx="6.6" ry="2.1" fill="#efe6d2" stroke="#9a8f80" strokeWidth="0.4" />
      <path d="M39.8 6.2 Q43 0.8 46.2 6.2 Z" fill="#f7f4ec" />
      <path d="M43 1.8 L43 0" stroke="#d8dde6" strokeWidth="0.6" />
      <rect x="0" y="27" width="82" height="3" fill="#b8b0c4" opacity="0.5" />
    </svg>
  )
})

// Media strip buttons: a glossy blue play button with a pale halo, and three small grey
// buttons on a translucent capsule
export function PlayButton({ x, y }) {
  return (
    <svg {...svg(25, 25, { left: x, top: y })}>
      <circle cx="12.5" cy="12.5" r="12" fill="#a9c8f2" fillOpacity="0.55" />
      <circle cx="12.5" cy="12.5" r="10" fill="url(#dk-play)" stroke="#2a62c4" strokeWidth="0.6" />
      <ellipse cx="11.5" cy="7.6" rx="6.2" ry="3.4" fill="#ffffff" opacity="0.22" />
      <path d="M10.2 7.4 L16.8 12.5 L10.2 17.6 Z" fill="#e8f2ff" />
    </svg>
  )
}
export function MediaCapsule({ x, y }) {
  return (
    <svg {...svg(64, 20, { left: x, top: y })}>
      <rect x="0.5" y="1" width="63" height="18" rx="9" fill="#3c5a9a" fillOpacity="0.32" />
      <rect x="4" y="15.5" width="56" height="3" rx="1.5" fill="#5fc7c8" fillOpacity="0.28" />
    </svg>
  )
}
export function SmallButton({ x, y, kind }) {
  return (
    <svg {...svg(14, 14, { left: x, top: y })}>
      <circle cx="7" cy="7" r="6.4" fill="url(#dk-small)" stroke="#5f6c94" strokeWidth="0.9" strokeOpacity="0.8" />
      <circle cx="7" cy="7" r="4.6" fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="0.7" />
      {kind === 'stop' && <rect x="5" y="5" width="4" height="4" fill="#f2f5ff" />}
      {kind === 'prev' && (
        <g fill="#f2f5ff">
          <rect x="4.4" y="4.6" width="1.2" height="4.8" />
          <path d="M9.6 4.6 L5.9 7 L9.6 9.4 Z" />
        </g>
      )}
      {kind === 'next' && (
        <g fill="#f2f5ff">
          <path d="M4.4 4.6 L8.1 7 L4.4 9.4 Z" />
          <rect x="8.4" y="4.6" width="1.2" height="4.8" />
        </g>
      )}
    </svg>
  )
}

// "Go Online": a glossy blue blob with a bright highlight on its upper right (16 x 16)
export function GoOnlineOrb({ x, y }) {
  return (
    <svg {...svg(16, 16, { left: x, top: y })}>
      <circle cx="8" cy="8.4" r="7.3" fill="url(#dk-orb)" />
      <path d="M6.2 4.2 Q10.6 0.6 14 5.8 Q12.2 7.4 9 6.6 Q7.2 6.2 6.2 4.2 Z" fill="#ffffff" opacity="0.8" />
      <path d="M2.6 11 Q6 15.4 11.6 13.6" stroke="#8fc4ff" strokeWidth="0.9" fill="none" opacity="0.7" />
    </svg>
  )
}

// The four small desktop thumbnails at the bottom of the sidebar (33 x 29 each)
export function Thumb({ x, y, kind }) {
  const w = 33,
    h = 29
  return (
    <svg {...svg(w, h, { left: x, top: y })}>
      <defs>
        <linearGradient id={'dk-th' + kind} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={['#8fd0d6', '#c7a6ae', '#3a9cf0', '#b08ce8'][kind]} />
          <stop offset="1" stopColor={['#6eaab8', '#b6939f', '#1f74d0', '#9474d6'][kind]} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={w} height={h} fill={`url(#dk-th${kind})`} />
      {kind === 0 && (
        <>
          <rect x="9" y="8" width="15" height="12" fill="#f6f8f9" />
          <rect x="11" y="10.5" width="5" height="7" fill="#d7b8b8" />
          <rect x="17.5" y="10.5" width="4.5" height="7" fill="#e6dcdc" />
        </>
      )}
      {kind === 1 && (
        <>
          <path d="M6 0 L24 29 L30 29 L12 0 Z" fill="#dcc0c2" opacity="0.65" />
          <path d="M18 0 L33 16 L33 9 L25 0 Z" fill="#a98592" opacity="0.5" />
        </>
      )}
      {kind === 2 && (
        <>
          <rect x="2.5" y="2.5" width="28" height="24" fill="#f2f6fb" />
          <rect x="6" y="5" width="7" height="7.5" fill="#2a2f38" />
          {[0, 1, 2, 3].map((i) =>
            [0, 1].map((j) => (
              <rect key={i + '-' + j} x={11 + i * 4.4} y={15 + j * 4.6} width="3" height="3" fill={['#1e2228', '#a0703a', '#6a7a8a', '#2a2a2a'][(i + j) % 4]} />
            )),
          )}
        </>
      )}
      {kind === 3 && (
        <>
          <rect x="5" y="7" width="23" height="16" fill="#f7f3fb" />
          <rect x="8" y="11" width="8" height="8" fill="none" stroke="#c4b8d8" strokeWidth="1.2" />
          <rect x="18" y="11" width="7" height="2" fill="#cdc3de" />
          <rect x="18" y="15" width="5" height="2" fill="#cdc3de" />
        </>
      )}
      <rect x="0.5" y="0.5" width={w - 1} height={h - 1} fill="none" stroke="#e8f0ff" strokeOpacity="0.35" strokeWidth="1" />
    </svg>
  )
}

// Taskbar clock chevron (white disc, dark chevron) (15 x 15)
export function Chevron({ x, y }) {
  return (
    <svg {...svg(15, 15, { left: x, top: y })}>
      <circle cx="7.5" cy="7.5" r="7" fill="url(#dk-chev)" />
      <path d="M3.9 6 L7.5 9.6 L11.1 6" fill="none" stroke="#33415c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Taskbar: Outlook (pre-release blue): a blue tile with white corner brackets and a clock (16 x 16)
export function OutlookIcon({ x, y }) {
  return (
    <svg {...svg(16, 16, { left: x, top: y })}>
      <rect x="0.5" y="0.5" width="15" height="15" rx="1.5" fill="#2c62cf" stroke="#173f94" strokeWidth="0.8" />
      <path d="M1.8 5 V1.8 H5 M11 1.8 H14.2 V5 M14.2 11 V14.2 H11 M5 14.2 H1.8 V11" fill="none" stroke="#eaf3ff" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="4.1" fill="none" stroke="#f4f8ff" strokeWidth="1.9" />
      <path d="M8 5.6 V8.2 H10.2" fill="none" stroke="#f4f8ff" strokeWidth="1.3" />
    </svg>
  )
}

// Taskbar: Winamp3 in the demo's blue: a silver diamond with a lightning bolt (16 x 16)
export function WinampIcon({ x, y }) {
  return (
    <svg {...svg(16, 16, { left: x, top: y })}>
      <path d="M8 0.8 L15.2 8 L8 15.2 L0.8 8 Z" fill="#dce8f8" stroke="#1d3f86" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 3 L13 8 L8 13 L3 8 Z" fill="none" stroke="#7fa3dc" strokeWidth="0.8" />
      <path d="M9.6 3.6 L5.6 8.6 L8.2 8.6 L6.4 12.4 L10.6 7.2 L8 7.2 Z" fill="#2f63c9" stroke="#123a8a" strokeWidth="0.5" />
    </svg>
  )
}
