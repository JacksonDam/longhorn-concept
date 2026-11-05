// The "my Music" flyout that slides out of the sidebar's media strip (x 665-858, y 258-499).
// State lives in the event log:
//   'desk.flyout' { open }      opened by a click on the media strip, closed by a click
//                                elsewhere or by "Go to my Music"
//   'desk.flypress' { on }      mouse button held on "Go to my Music"
//   'hover' { id: 'fly.row.N' | 'fly.go', on }
// "Go to my Music" emits 'music.open' and closes the flyout.
import { memo } from 'react'
import { emit, last } from '../../core/events.js'
import { now, FPS } from '../../core/clock.js'
import { MotionBlur } from '../../core/MotionBlur.jsx'
import { asset } from '../../core/preload.js'
import { clamp, track } from '../../core/anim.js'

export const FLY = { x: 665, y: 258, w: 193, h: 241 }

export const TRACKS = [
  ['Gomez - Bring it on', '4:34'],
  ['U2 - One More Voice', '3:10'],
  ['Alicia Keys - Just another', '7:31'],
  ['Evergreen - Small sound', '5:09'],
  ['Gomez - Bring it on', '4:34', true],
  ['Goo Goo Dolls - Safe', '3:10'],
  ['Areosmith - Somtiimes', '5:31'],
  ['Wilco - Small sound', '5:09'],
  ['Rush - Bring it on', '4:34'],
]
const ROW_Y0 = 294 // top of the first row's text box
const ROW_DY = 19.19
const ROW_H = 18

export function flyoutState(t) {
  const e = last(t, (e) => e.type === 'desk.flyout')
  return { open: !!e?.open, at: e ? e.t : -Infinity }
}
export function toggleFlyout() {
  const s = flyoutState(now())
  emit('desk.flyout', { open: !s.open })
}
export function closeFlyout() {
  emit('desk.flyout', { open: false })
}

// ---- timing (frames after the open / close event) -------------------------------------
// Measured from the ghost coverage profiles of video frames 600-603 and 694-696: the panel's
// left edge L and right edge R (stage x). Opening, the panel shoots in from the right edge
// of the screen over the sidebar, squashed, overshoots to L ~600 while R pulls in to ~780,
// springs back and snaps to rest at 3.75 frames. Closing, L accelerates right while R jumps
// back out to the screen edge, so the panel squashes away over the sidebar.
const OPEN_L = track([[0, 960], [0.03, 952], [0.75, 880], [0.83, 856], [1.35, 800], [1.75, 744], [2.02, 696], [2.36, 664], [2.57, 640], [2.7, 616], [2.78, 602], [3.23, 632], [3.51, 656], [3.68, 664], [3.75, 665]])
const OPEN_R = track([[0, 960], [1.2, 958], [1.4, 880], [1.75, 870], [1.95, 858], [2.27, 840], [2.49, 824], [2.65, 792], [2.78, 780], [2.97, 792], [3.29, 808], [3.47, 824], [3.72, 840], [3.749, 842], [3.75, 858]])
const CLOSE_L = track([[0, 665], [1.0, 723], [1.07, 736], [1.17, 752], [1.27, 768], [1.38, 784], [1.48, 806], [1.62, 816], [1.78, 832], [2.0, 896], [2.12, 904], [2.23, 920], [2.43, 936], [2.59, 952], [2.7, 960]])
const CLOSE_R = track([[0, 858], [1.0, 860], [1.1, 870], [1.3, 960]])
const OPEN_END = 3.75
const CLOSE_END = 2.7

// level of a hover highlight from the latest hover event for `id` (ramps in/out over frames)
export function hoverLevel(t, id, fin = 1.5, fout = 1) {
  const e = last(t, (e) => e.type === 'hover' && e.id === id)
  if (!e) return 0
  const df = (t - e.t) * FPS
  if (e.on) return clamp(df / fin)
  const on = last(e.t - 1e-9, (x) => x.type === 'hover' && x.id === id)
  const reached = on?.on ? clamp(((e.t - on.t) * FPS) / fin) : 0
  return reached * (1 - clamp(df / fout))
}

// ---- drawing ---------------------------------------------------------------------------
const listGradient =
  'linear-gradient(to bottom, rgb(201,230,255) 0px, rgb(227,245,255) 1px, rgb(233,243,255) 7px, rgb(237,247,255) 18px, rgb(243,251,255) 42px, rgb(247,254,255) 60px, rgb(246,252,255) 72px, rgb(234,246,255) 102px, rgb(228,240,255) 126px, rgb(218,230,248) 144px, rgb(203,219,239) 162px, rgb(195,213,237) 174px, rgb(196,212,236) 180px, rgb(178,207,237) 181px, rgb(150,179,209) 182px)'

const rowText = {
  position: 'absolute',
  fontFamily: "'Libre Franklin', Tahoma, sans-serif",
  fontWeight: 600,
  fontSize: 9.4,
  lineHeight: '18px',
  height: 18,
  whiteSpace: 'nowrap',
  color: 'rgba(112,118,152,0.95)',
}

function NoteIcon() {
  return (
    <svg width="24" height="25" viewBox="0 0 24 25" style={{ position: 'absolute', left: 669, top: 263 }}>
      <defs>
        <radialGradient id="dk-note" cx="0.35" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#ffe8ff" />
          <stop offset="0.35" stopColor="#d58cf2" />
          <stop offset="1" stopColor="#6e3fb8" />
        </radialGradient>
        <linearGradient id="dk-stem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2c4ff" />
          <stop offset="1" stopColor="#8b55cf" />
        </linearGradient>
      </defs>
      <path d="M13.5 15.5 L15.5 2.5 C17.5 3.5 21.5 5.5 20.5 10 C19.5 7.8 18 7.2 16.6 7 L14.8 17 Z" fill="url(#dk-stem)" />
      <ellipse cx="9" cy="17.5" rx="7" ry="5.6" transform="rotate(-18 9 17.5)" fill="url(#dk-note)" />
      <ellipse cx="7" cy="15.6" rx="2.6" ry="1.5" transform="rotate(-18 7 15.6)" fill="#fff" opacity="0.7" />
    </svg>
  )
}

const FlyoutBack = memo(function FlyoutBack() {
  const x0 = FLY.x
  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      {/* frame */}
      <div
        style={{
          position: 'absolute',
          left: x0 - 1,
          top: 258,
          width: FLY.w + 1,
          height: 241,
          background:
            'linear-gradient(to bottom, rgba(70,80,120,0.45) 0px, rgba(70,80,120,0.45) 2px, rgb(107,138,201) 2px, rgb(118,148,212) 4px, rgb(68,123,216) 4px, rgb(66,125,221) 30px, rgb(87,147,233) 30px, rgb(100,160,246) 31px, rgb(116,165,247) 32px, rgb(76,125,208) 33px, rgb(114,142,195) 34px, rgb(114,142,195) 35px, rgb(78,128,220) 218px, rgb(61,112,203) 219px, rgb(52,119,222) 220px, rgb(64,120,220) 226px, rgb(56,114,199) 233px, rgb(82,139,226) 234px, rgb(97,155,242) 235px, rgb(89,144,216) 236px, rgb(98,147,232) 238px, rgb(27,76,161) 239px, rgb(8,50,116) 241px)',
        }}
      />
      {/* title bar: lighter around the note icon, fading to the plain blue on the right */}
      <div style={{ position: 'absolute', left: x0, top: 262, width: FLY.w, height: 26, background: 'linear-gradient(to right, rgb(92,148,229) 0px, rgb(85,143,228) 30px, rgb(84,142,227) 95px, rgb(72,128,223) 125px, rgb(68,124,219) 145px, rgb(68,124,217) 193px)' }} />
      {/* footer continues the scrollbar column's colour on the right */}
      <div style={{ position: 'absolute', left: 840, top: 476, width: 18, height: 16, background: 'rgb(80,136,210)' }} />
      {/* left bevel */}
      <div style={{ position: 'absolute', left: x0 - 1, top: 260, width: 3, height: 237, background: 'linear-gradient(to right, rgba(118,139,201,0.9), rgba(140,170,225,0.9))' }} />
      {/* list */}
      <div style={{ position: 'absolute', left: 668, top: 293, width: 174, height: 182, background: listGradient }} />
      <div style={{ position: 'absolute', left: 842, top: 293, width: 2, height: 182, background: 'linear-gradient(to right, rgb(198,224,255), rgb(145,171,207))' }} />
      {/* scrollbar track */}
      <div style={{ position: 'absolute', left: 844, top: 293, width: 14, height: 183, background: 'linear-gradient(to bottom, rgb(84,122,190), rgb(85,130,190) 40px, rgb(86,134,202) 130px, rgb(66,108,166))' }} />
      <svg width="14" height="183" viewBox="0 0 14 183" style={{ position: 'absolute', left: 844, top: 294 }}>
        <path d="M2.5 11 L7 6.5 L11.5 11 Z" fill="#d4e2f8" opacity="0.9" />
        <rect x="1.5" y="13" width="11" height="17" rx="1.5" fill="#a9c2ec" opacity="0.85" />
        <rect x="3.5" y="17" width="7" height="1.2" fill="#4a6fb4" />
        <rect x="3.5" y="20.5" width="7" height="1.2" fill="#4a6fb4" />
        <rect x="3.5" y="24" width="7" height="1.2" fill="#4a6fb4" />
        <path d="M2.5 169 L7 173.5 L11.5 169 Z" fill="#d4e2f8" opacity="0.9" />
      </svg>
      {/* selected row (the second "Gomez", with its album picture) */}
      <div
        style={{
          position: 'absolute',
          left: 668,
          top: 368,
          width: 174,
          height: 21,
          background: 'linear-gradient(to bottom, rgba(214,232,248,0.6), rgb(197,231,255) 30%, rgb(196,231,255) 70%, rgba(213,241,255,0.8))',
        }}
      />
    </div>
  )
})

const FlyoutFront = memo(function FlyoutFront() {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      {/* title */}
      <NoteIcon />
      <div
        style={{
          position: 'absolute',
          left: 696.5,
          top: 270.2,
          fontFamily: "'Libre Franklin', Tahoma, sans-serif",
          fontWeight: 600,
          fontSize: 12.2,
          lineHeight: '17px',
          color: '#fff',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: 'rgba(205,225,255,0.85)', fontWeight: 500 }}>my</span> Music
      </div>
      <svg width="40" height="20" viewBox="0 0 40 20" style={{ position: 'absolute', left: 820.5, top: 262.3 }}>
        <path d="M4.5 7.5 L16.5 7.5 L10.5 12.5 Z" fill="#e4ecfb" opacity="0.8" />
        <path d="M24 3.5 L33.5 13 M33.5 3.5 L24 13" stroke="#e4ecfb" strokeOpacity="0.62" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <img
        src={asset('img/desktop/album-standin.webp')}
        alt=""
        style={{ position: 'absolute', left: 672, top: 370.5, width: 17, height: 18, outline: '1px solid rgba(255,255,255,0.9)' }}
      />
      {TRACKS.map(([name, dur], i) => (
        <div key={i}>
          <div style={{ ...rowText, left: 690, top: ROW_Y0 + i * ROW_DY }}>{name}</div>
          <div style={{ ...rowText, left: 788, width: 46.5, textAlign: 'right', top: ROW_Y0 + i * ROW_DY }}>{dur}</div>
        </div>
      ))}
      {/* footer */}
      <svg width="10" height="14" viewBox="0 0 10 14" style={{ position: 'absolute', left: 719, top: 479 }}>
        <path d="M1.5 1.5 L8.5 7 L1.5 12.5 Z" fill="#cfe6ff" opacity="0.9" />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 731,
          top: 479,
          fontFamily: "'Libre Franklin', Tahoma, sans-serif",
          fontWeight: 500,
          fontSize: 10,
          lineHeight: '14px',
          color: 'rgba(225,238,255,0.95)',
          whiteSpace: 'nowrap',
        }}
      >
        Go to <span style={{ fontWeight: 700, color: '#fff' }}>my Music</span>
      </div>
    </div>
  )
})

function RowHighlights({ t }) {
  const out = []
  for (let i = 0; i < TRACKS.length; i++) {
    const lv = hoverLevel(t, 'fly.row.' + i)
    if (lv <= 0) continue
    out.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          left: 668,
          top: ROW_Y0 + i * ROW_DY,
          width: 174,
          height: ROW_H,
          opacity: lv,
          background: 'linear-gradient(to bottom, rgba(200,228,255,0.7), rgba(185,222,255,0.95) 40%, rgba(200,232,255,0.8))',
        }}
      />,
    )
  }
  return out
}

function FooterHighlight({ t }) {
  const e = last(t, (e) => e.type === 'desk.flypress')
  if (!e) return null
  const df = (t - e.t) * FPS
  const lv = e.on ? clamp(df / 3.5) : 0
  if (lv <= 0) return null
  return (
    <div
      style={{
        position: 'absolute',
        left: 667,
        top: 476,
        width: 175,
        height: 20,
        opacity: lv,
        background: 'linear-gradient(to bottom, rgba(140,200,255,0.55), rgba(120,190,255,0.35))',
      }}
    />
  )
}

// hit areas (interactive mode)
function HitAreas() {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      <div
        style={{ position: 'absolute', left: FLY.x, top: FLY.y, width: FLY.w, height: FLY.h, pointerEvents: 'auto' }}
        onPointerDown={(e) => e.stopPropagation()}
      />
      {TRACKS.map((_, i) => (
        <div
          key={i}
          style={{ position: 'absolute', left: 668, top: ROW_Y0 + i * ROW_DY, width: 174, height: ROW_DY, pointerEvents: 'auto' }}
          onPointerEnter={() => emit('hover', { id: 'fly.row.' + i, on: true })}
          onPointerLeave={() => emit('hover', { id: 'fly.row.' + i, on: false })}
          onPointerDown={(e) => e.stopPropagation()}
        />
      ))}
      <div
        style={{ position: 'absolute', left: 667, top: 476, width: 175, height: 21, pointerEvents: 'auto' }}
        onPointerDown={(e) => {
          e.stopPropagation()
          emit('desk.flypress', { on: true })
        }}
        onPointerUp={() => goToMusic()}
        onPointerLeave={() => emit('desk.flypress', { on: false })}
      />
    </div>
  )
}

export function goToMusic() {
  emit('desk.flypress', { on: false })
  emit('desk.flyout', { open: false })
  emit('music.open')
}

export function Flyout({ t }) {
  const s = flyoutState(t)
  const df = (t - s.at) * FPS
  if (!s.open && (s.at === -Infinity || df > CLOSE_END)) return null
  const pose = (ff) => {
    const L = s.open ? OPEN_L(ff) : CLOSE_L(ff)
    const R = s.open ? OPEN_R(ff) : CLOSE_R(ff)
    const w = R - L
    if (w < 0.5) return { opacity: 0 }
    return { transform: `translateX(${L - FLY.x}px) scaleX(${w / FLY.w})`, transformOrigin: `${FLY.x}px 0` }
  }
  const moving = s.open ? df < OPEN_END + 0.5 : df < CLOSE_END + 0.5
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 960, height: 720, overflow: 'hidden', pointerEvents: 'none' }}>
      <MotionBlur t={df} pose={pose} moving={moving} samples={24} shutter={1} phase={-0.5} style={{ left: 0, top: 0, width: 960, height: 720 }}>
        <FlyoutBack />
        <RowHighlightsLayer t={t} />
        <FlyoutFront />
      </MotionBlur>
      {s.open && df >= OPEN_END && <HitAreas />}
    </div>
  )
}

function RowHighlightsLayer({ t }) {
  return (
    <>
      <RowHighlights t={t} />
      <FooterHighlight t={t} />
    </>
  )
}
