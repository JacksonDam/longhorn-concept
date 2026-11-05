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
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d8dde8" />
        </radialGradient>
      </defs>
    </svg>
  )
})

// Unread mail: a closed envelope, slightly turned (16 x 17)
export function EnvelopeClosed({ x, y, hot }) {
  const fill = hot ? 'url(#dk-env-hot)' : 'url(#dk-env)'
  return (
    <svg {...svg(16, 17, { left: x, top: y })}>
      <path d="M1.5 4.5 L13.5 1.5 L15 15 L2.5 16.5 Z" fill={fill} stroke="#7c7f93" strokeWidth="0.8" strokeOpacity="0.7" />
      <path d="M1.5 4.5 L8.6 10 L13.5 1.5" fill="none" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1" />
      <path d="M2.5 16.5 L7.6 9.4 M15 15 L9.4 9.6" fill="none" stroke="#8b8a92" strokeOpacity="0.6" strokeWidth="0.8" />
    </svg>
  )
}

// Read mail: an opened envelope seen from above, a pale diamond (16 x 14)
export function EnvelopeOpen({ x, y }) {
  return (
    <svg {...svg(16, 14, { left: x, top: y })}>
      <path d="M0.5 7.2 L8 1 L15.5 7.2 L8 13.4 Z" fill="url(#dk-open)" fillOpacity="0.8" stroke="#eef2ff" strokeOpacity="0.55" strokeWidth="0.7" />
      <path d="M3.2 6.6 L12.8 6.6 L8 10.4 Z" fill="#ffffff" fillOpacity="0.55" />
    </svg>
  )
}

// Messenger "away" buddy: a small person behind an alarm clock (17 x 18)
export function BuddyAway({ x, y }) {
  return (
    <svg {...svg(17, 18, { left: x, top: y })}>
      <circle cx="10.5" cy="3.4" r="2.6" fill="#6fd0a8" stroke="#2f7f6a" strokeWidth="0.6" />
      <path d="M6.5 15.5 C6.5 9.5 8 7 10.5 7 C13.6 7 15.6 10 15.6 15.5 Z" fill="#3f7fe0" stroke="#1d4fa8" strokeWidth="0.6" />
      <circle cx="5.6" cy="11.2" r="4.6" fill="#f3efe9" stroke="#c4402a" strokeWidth="1.5" />
      <path d="M5.6 8.2 L5.6 11.4 L7.6 12.4" fill="none" stroke="#333" strokeWidth="1" />
      <circle cx="2.4" cy="6.6" r="1.3" fill="#c4402a" />
      <circle cx="8.8" cy="6.6" r="1.3" fill="#c4402a" />
    </svg>
  )
}

// "Swimmer Dude" display picture stand-in: a yellow figure mid-stroke (18 x 18)
export function SwimmerPic({ x, y }) {
  return (
    <svg {...svg(18, 18, { left: x, top: y })}>
      <rect x="0.5" y="0.5" width="17" height="17" rx="1.5" fill="#cfd8e8" fillOpacity="0.25" />
      <circle cx="9" cy="4" r="2.6" fill="#f2c641" stroke="#6b5420" strokeWidth="0.7" />
      <path
        d="M9 6.8 L9 11.5 M9 8.2 L3.6 5.6 M9 8.2 L14.6 5.6 M9 11.5 L4.4 16.2 M9 11.5 L13.8 16.2"
        stroke="#e2b22f"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M9 6.8 L9 11.5 M9 8.2 L3.6 5.6 M9 8.2 L14.6 5.6 M9 11.5 L4.4 16.2 M9 11.5 L13.8 16.2"
        stroke="#fbe78a"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

// Orange display picture (stand-in for a sports-brand logo tile): plain orange square
// with a soft white stroke (19 x 18)
export function OrangePic({ x, y }) {
  return (
    <svg {...svg(19, 18, { left: x, top: y })}>
      <rect x="0.5" y="0.5" width="18" height="17" fill="#f06a1c" stroke="#8a3a12" strokeWidth="1" />
      <path d="M4 11.2 Q9 11.6 15 7.4" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// Seattle weather tile art: skyline with the Space Needle, drawn (82 x 30)
export const Skyline = memo(function Skyline({ x, y }) {
  const b = [
    // x, top, width (towers left to right)
    [2, 20, 4], [6, 17, 3], [9, 22, 4], [13, 15, 3], [16, 19, 5], [21, 13, 3], [24, 16, 4],
    [28, 18, 3], [31, 11, 4], [35, 14, 3],
  ]
  const r = [
    [52, 14, 4], [56, 9, 3], [59, 15, 4], [63, 6, 4], [67, 12, 3], [70, 17, 4], [74, 13, 3], [77, 18, 4],
  ]
  return (
    <svg {...svg(82, 30, { left: x, top: y })}>
      <rect x="0" y="0" width="82" height="30" fill="url(#dk-sky)" />
      {b.map(([bx, top, w], i) => (
        <rect key={i} x={bx} y={top} width={w} height={30 - top} fill="url(#dk-bldg)" opacity={0.85} />
      ))}
      {r.map(([bx, top, w], i) => (
        <rect key={'r' + i} x={bx} y={top} width={w} height={30 - top} fill={i % 2 ? 'url(#dk-bldg2)' : 'url(#dk-bldg)'} opacity={0.9} />
      ))}
      {/* Space Needle */}
      <path d="M41.2 6 L42 29 M44.8 6 L44 29" stroke="#dfe6ef" strokeWidth="1.3" />
      <path d="M43 6 L43 29" stroke="#7c8aa2" strokeWidth="0.7" />
      <ellipse cx="43" cy="6.2" rx="5.6" ry="1.9" fill="#e9e1cf" stroke="#9a8f80" strokeWidth="0.5" />
      <path d="M40.4 4.6 Q43 0.6 45.6 4.6 Z" fill="#f5f2ea" />
      <rect x="0" y="27" width="82" height="3" fill="#6d6170" opacity="0.6" />
    </svg>
  )
})

// Media strip buttons
export function PlayButton({ x, y }) {
  return (
    <svg {...svg(24, 24, { left: x, top: y })}>
      <circle cx="12" cy="12" r="11.3" fill="url(#dk-play)" stroke="#0b3c9c" strokeWidth="0.8" />
      <ellipse cx="11" cy="6.5" rx="7" ry="4" fill="#ffffff" opacity="0.25" />
      <path d="M9.4 6.5 L17 12 L9.4 17.5 Z" fill="#eef6ff" />
    </svg>
  )
}
export function SmallButton({ x, y, kind }) {
  return (
    <svg {...svg(15, 15, { left: x, top: y })}>
      <circle cx="7.5" cy="7.5" r="6.9" fill="url(#dk-small)" stroke="#6f7ca2" strokeWidth="0.7" strokeOpacity="0.8" />
      <circle cx="7.5" cy="7.5" r="5" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.8" />
      {kind === 'stop' && <rect x="5.2" y="5.2" width="4.6" height="4.6" fill="#f6f8ff" />}
      {kind === 'prev' && (
        <g fill="#f6f8ff">
          <rect x="4.6" y="4.8" width="1.3" height="5.4" />
          <path d="M10.4 4.8 L6.2 7.5 L10.4 10.2 Z" />
        </g>
      )}
      {kind === 'next' && (
        <g fill="#f6f8ff">
          <path d="M4.6 4.8 L8.8 7.5 L4.6 10.2 Z" />
          <rect x="9.1" y="4.8" width="1.3" height="5.4" />
        </g>
      )}
    </svg>
  )
}

// "Go Online": a glossy blue orb (16 x 16)
export function GoOnlineOrb({ x, y }) {
  return (
    <svg {...svg(16, 16, { left: x, top: y })}>
      <circle cx="8" cy="8.4" r="7.2" fill="url(#dk-orb)" />
      <path d="M3.4 6.6 Q8 1.2 12.8 6.2 Q8 4.6 3.4 6.6 Z" fill="#ffffff" opacity="0.75" />
      <path d="M4 11.6 Q8 15 12.4 11.4" stroke="#9fd2ff" strokeWidth="0.8" fill="none" opacity="0.7" />
    </svg>
  )
}

// The four small desktop thumbnails at the bottom of the sidebar (33 x 28 each)
export function Thumb({ x, y, kind }) {
  const w = 33,
    h = 28
  const frame = { fill: 'none', stroke: '#1d2a3c', strokeOpacity: 0.7, strokeWidth: 1 }
  return (
    <svg {...svg(w, h, { left: x, top: y })}>
      {kind === 0 && (
        <>
          <rect x="0" y="0" width={w} height={h} fill="#86c4ce" />
          <rect x="0" y="0" width={w} height={h / 2} fill="#9ed3da" opacity="0.6" />
          <rect x="9" y="8" width="15" height="11" fill="#f4f7f8" />
          <rect x="9" y="8" width="15" height="2.2" fill="#c9d6e0" />
          <rect x="11" y="12" width="4" height="4" fill="#d9c9c9" />
          <rect x="17" y="12" width="5" height="1" fill="#b8b8c8" />
        </>
      )}
      {kind === 1 && (
        <>
          <rect x="0" y="0" width={w} height={h} fill="#c39ba3" />
          <path d="M0 6 L14 28 L22 28 L4 0 Z" fill="#d7b6b8" opacity="0.7" />
          <path d="M14 0 L33 18 L33 10 L22 0 Z" fill="#b48c99" opacity="0.6" />
        </>
      )}
      {kind === 2 && (
        <>
          <rect x="0" y="0" width={w} height={h} fill="#2c8ce6" />
          <rect x="3" y="3" width="27" height="22" fill="#eef4fb" />
          <rect x="6" y="4.5" width="6" height="6.5" fill="#232a33" />
          {[0, 1, 2, 3].map((i) =>
            [0, 1].map((j) => (
              <rect key={i + '-' + j} x={13 + i * 4} y={13 + j * 4} width="2.6" height="2.6" fill={['#1e2228', '#a0703a', '#6a7a8a', '#2a2a2a'][(i + j) % 4]} />
            )),
          )}
        </>
      )}
      {kind === 3 && (
        <>
          <rect x="0" y="0" width={w} height={h} fill="#a07ee0" />
          <rect x="5" y="7" width="23" height="15" fill="#f6f2fb" />
          <rect x="5" y="7" width="23" height="2.4" fill="#d6cdea" />
          <rect x="8" y="12" width="7" height="6" fill="none" stroke="#c4b8d8" strokeWidth="1" />
          <rect x="17" y="12" width="8" height="1.2" fill="#c4b8d8" />
        </>
      )}
      <rect x="0.5" y="0.5" width={w - 1} height={h - 1} {...frame} />
    </svg>
  )
}

// Taskbar clock chevron (white disc, dark chevron) (15 x 15)
export function Chevron({ x, y }) {
  return (
    <svg {...svg(15, 15, { left: x, top: y })}>
      <circle cx="7.5" cy="7.5" r="7" fill="url(#dk-chev)" />
      <path d="M3.9 6 L7.5 9.6 L11.1 6" fill="none" stroke="#1f3f72" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
