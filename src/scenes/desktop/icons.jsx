// The small Plex sidebar / taskbar / flyout icons, sized in video pixels. Most are SVG files
// (public/img/desktop/icons); the substituted buddy pictures and the skyline are inline SVG whose
// gradient ids are namespaced 'dk-' so multiple copies can share them.
import { memo } from 'react'
import { asset, preload } from '../../core/preload.js'

// Icon art lives in public/img/desktop/icons/*.svg (gradients only, no filters); every file is
// preloaded so the first frame that shows one never waits on a decode.
const FILES = [
  'env-closed', 'env-hot', 'env-open', 'buddy-away', 'play', 'pause', 'capsule', 'btn-stop', 'btn-prev',
  'btn-next', 'go-online', 'thumb0', 'thumb1', 'thumb2', 'thumb3', 'chevron', 'ic-outlook', 'ic-winamp',
]
export const iconUrl = (f) => asset('img/desktop/icons/' + f + '.svg')
// the Start button's white flag (Taskbar.jsx) is the XP flag recoloured, a 4x WebP
preload([...FILES.map(iconUrl), asset('img/desktop/icons/flag-start.webp')])

// one icon image at stage position (x, y), w x h stage px; data-ic marks it for icon-free captures
export function Ico({ f, x, y, w, h, style }) {
  return <img data-ic={f} src={iconUrl(f)} alt="" draggable={false} style={{ position: 'absolute', left: x, top: y, width: w, height: h, ...style }} />
}

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
      </defs>
    </svg>
  )
})

// Mail: an unread envelope seen from the back (grey; cream for the hot Hotmail row) and the
// read one lying open (a pale diamond). x, y: the row's anchor; the art extends around it.
// The video's icons sit up to 2 px off the rows' 18.8 px pitch; MAIL_DY is that per-row offset
// (fitted against the reference median of frames 1100-1400).
const MAIL_DY = [0.5, 1.25, 2, 0.5, 1.25, 0.5, 0.25, 1.25, 0.5]
const mailDy = (b) => MAIL_DY[Math.round((b - 99.4) / 18.8)] ?? 0.5
export function EnvelopeClosed({ x, y, hot }) {
  return <Ico f={hot ? 'env-hot' : 'env-closed'} x={x - 3.25} y={y - 2 + mailDy(y + 14.5)} w={18} h={20} />
}
export function EnvelopeOpen({ x, y }) {
  return <Ico f="env-open" x={x - 2} y={y - 2.5 + mailDy(y + 11)} w={22} h={18} />
}

// Messenger "away" status: the buddy behind an alarm clock. The video places Kathy's 4 px
// above her row (per-row offsets by baseline, fitted like MAIL_DY).
const AWAY_DY = { 445: -4, 483: -0.5, 502: -0.5 }
export function BuddyAway({ x, y }) {
  return <Ico f="buddy-away" x={x - 0.75} y={y + (AWAY_DY[Math.round(y + 17.5)] ?? 0)} w={18} h={22} />
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

// Media strip (Windows Media Player 9 style): a glass play button with a silver rim, and
// small round stop/previous/next buttons on two dark capsules with a teal under-glow.
export const PlayButton = memo(function PlayButton({ x, y, playing }) {
  return <Ico f={playing ? 'pause' : 'play'} x={x - 2.25} y={y - 3.5} w={30} h={30} />
})
export function MediaCapsule({ x, y }) {
  return <Ico f="capsule" x={x - 24} y={y - 3} w={92} h={26} />
}
// measured centres: stop 901, previous 922, next 940.5 (y 288.5)
const BTN_DX = { stop: -1, prev: 0, next: 0.5 }
export function SmallButton({ x, y, kind }) {
  return <Ico f={'btn-' + kind} x={x + (BTN_DX[kind] ?? 0)} y={y - 3.5} w={16} h={16} />
}

// "Go Online": a glossy blue globe
export function GoOnlineOrb({ x, y }) {
  return <Ico f="go-online" x={x - 2} y={y - 2} w={20} h={20} />
}

// The four small desktop thumbnails at the bottom of the sidebar (33 x 29 each, framed)
const THUMB_D = [[-1.5, -1.5], [-1.5, -1.5], [-2, -2.5], [-1.5, -2.5]]
export function Thumb({ x, y, kind }) {
  const [dx, dy] = THUMB_D[kind] ?? [-2, -2]
  return <Ico f={'thumb' + kind} x={x + dx} y={y + dy} w={37} h={33} />
}

// Taskbar clock chevron (white disc, dark chevron); the video's disc is centred 2 px left of
// the old 15 px box at (x, y)
export function Chevron({ x, y }) {
  return <Ico f="chevron" x={x - 3} y={y - 1} w={17} h={17} />
}

// Taskbar: Outlook (pre-release blue): a blue tile with white corner brackets and a clock
export function OutlookIcon({ x, y, size = 16 }) {
  return <Ico f="ic-outlook" x={x} y={y} w={size} h={size} />
}

// Taskbar: Winamp3 in the demo's blue/silver: a tilted diamond with a lightning bolt
export function WinampIcon({ x, y, size = 16 }) {
  return <Ico f="ic-winamp" x={x} y={y} w={size} h={size} />
}
