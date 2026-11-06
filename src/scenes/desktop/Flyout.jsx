// The "my Music" flyout that slides out of the sidebar's media strip (x 665-858, y 258-499).
// State lives in the event log:
//   'desk.flyout' { open }      opened by a click on the media strip, closed by a click
//                                elsewhere or by "Go to my Music"
//   'desk.flypress' { on }      mouse button held on "Go to my Music"
//   'hover' { id: 'fly.row.N' | 'fly.go', on }
// "Go to my Music" emits 'music.open' and closes the flyout.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { lastOfType } from '../../os/logIndex.js'
import { sessionFloor } from './shellState.js'
const inSession = (e) => (e && e.t >= sessionFloor() ? e : null)
import { now, FPS } from '../../core/clock.js'
import { Blur } from './Blur.jsx'
import { openMenu } from '../../ui/index.js'
import { launch } from './appInfo.jsx'
import { asset } from '../../core/preload.js'
import { clamp, track } from '../../core/anim.js'
import { FlyNote, FlyTitleButtons, FlyGoArrow } from './icons.jsx'
import { stageSize } from '../../core/Stage.jsx'

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
  const e = inSession(lastOfType(t, 'desk.flyout'))
  return { open: !!e?.open, at: e ? e.t : -Infinity }
}
export function toggleFlyout() {
  const s = flyoutState(now())
  emit('desk.flyout', { open: !s.open })
}
export function closeFlyout() {
  if (flyoutState(now()).open) emit('desk.flyout', { open: false })
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
  const e = inSession(lastOfType(t, 'hover', id))
  if (!e) return 0
  const df = (t - e.t) * FPS
  if (e.on) return clamp(df / fin)
  const on = lastOfType(e.t - 1e-9, 'hover', id)
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
      <FlyNote />
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
      <FlyTitleButtons />
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
      <FlyGoArrow />
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
  const e = inSession(lastOfType(t, 'desk.flypress'))
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

// hit areas (interactive mode): rows play their track, "Go to my Music" opens the window
const HitAreas = memo(function HitAreas() {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0 }}>
      <div
        style={{ position: 'absolute', left: FLY.x, top: FLY.y, width: FLY.w, height: FLY.h, pointerEvents: 'auto' }}
        onPointerDown={(e) => e.stopPropagation()}
      />
      {/* title bar: the note and "my Music" open the window, the arrow drops a menu, x closes */}
      <FlyHit x={668} y={261} w={110} h={30} id="fly.title" go={() => goToMusic()} />
      <FlyHit x={819} y={263} w={20} h={18} id="fly.drop" go={() => openMenu('fly.menu', true, { x: 742 + (stageSize().dw || 0), y: 282 })} />
      <FlyHit x={840} y={262} w={18} h={20} id="fly.x" go={() => closeFlyout()} />
      {/* the scrollbar: the whole list is in view, so its arrows step through the tracks */}
      <FlyHit x={845} y={296} w={12} h={10} id="fly.up" go={() => emit('media.prev')} />
      <FlyHit x={845} y={307} w={12} h={150} id="fly.thumb" go={() => goToMusic()} />
      <FlyHit x={845} y={459} w={12} h={12} id="fly.down" go={() => emit('media.next')} />
      {TRACKS.map((_, i) => (
        <div
          key={i}
          style={{ position: 'absolute', left: 668, top: ROW_Y0 + i * ROW_DY, width: 174, height: ROW_DY, pointerEvents: 'auto' }}
          onPointerEnter={() => emit('hover', { id: 'fly.row.' + i, on: true })}
          onPointerLeave={() => emit('hover', { id: 'fly.row.' + i, on: false })}
          onPointerDown={(e) => {
            e.stopPropagation()
            emit('media.play', { track: i })
          }}
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
})
const HIT_AREAS = <HitAreas />

function FlyHit({ x, y, w, h, id, go }) {
  return (
    <div
      style={{ position: 'absolute', left: x, top: y, width: w, height: h, pointerEvents: 'auto' }}
      onPointerEnter={() => emit('hover', { id, on: true })}
      onPointerLeave={() => emit('hover', { id, on: false })}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.stopPropagation()
        go()
      }}
    />
  )
}

// the title bar's drop-down (UI kit), rendered by DesktopScene
export const FLY_MENU = [
  { label: 'Play All', onClick: () => emit('media.play', { track: 0 }) },
  { label: 'Pause', onClick: () => emit('media.pause') },
  '-',
  { label: 'Go to my Music', onClick: () => goToMusic() },
  { label: 'Close', onClick: () => closeFlyout() },
]

export function goToMusic() {
  emit('desk.flypress', { on: false })
  emit('desk.flyout', { open: false })
  launch.music()
}

// the panel's box; its pre-mounted blur copies are posed by the measured edge tracks
const BOX = { left: FLY.x - 1, top: FLY.y, width: FLY.w + 1, height: FLY.h }
const BACK = <FlyoutBack />
const FRONT = <FlyoutFront />

// dw: the stage's extra width (core/Stage.jsx): the sidebar, the screen's edge the panel shoots
// in from and everything here are dw further right (the box's left; the edge tracks are
// measured on the video's frame)
export function Flyout({ t, dw = 0 }) {
  const s = flyoutState(t)
  const df = (t - s.at) * FPS
  const visible = s.open || (s.at !== -Infinity && df <= CLOSE_END)
  const pose = (ff) => {
    const L = s.open ? OPEN_L(ff) : CLOSE_L(ff)
    const R = s.open ? OPEN_R(ff) : CLOSE_R(ff)
    const w = R - L
    if (w < 0.5) return { opacity: 0 }
    return { transform: `translateX(${L - FLY.x}px) scaleX(${w / FLY.w})`, transformOrigin: `${FLY.x - BOX.left}px 0` }
  }
  const moving = visible && (s.open ? df < OPEN_END + 0.5 : df < CLOSE_END + 0.5)
  return (
    <div style={{ position: 'absolute', left: dw, top: 0, width: 960, height: 720, overflow: 'hidden', pointerEvents: 'none' }}>
      <Blur t={df} box={BOX} n={12} shutter={1} phase={-0.5} pose={pose} moving={moving} hidden={!visible} live={<RowHighlightsLayer t={t} />} front={FRONT}>
        {BACK}
      </Blur>
      <div style={{ position: 'absolute', inset: 0, visibility: s.open && df >= OPEN_END ? 'visible' : 'hidden' }}>{HIT_AREAS}</div>
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
