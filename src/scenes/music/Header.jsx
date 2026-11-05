// The header of my Music: the glass music device (3D slab), "Windows my Music", the swoosh and
// the Play Music / Burn CD / Share Music buttons; after an album is opened, the album slab
// and its track list. Everything is a pure function of (t, header state).
import { memo } from 'react'
import { Txt, abs, FONT, HEAVY } from './ui.jsx'
import * as I from './icons.jsx'
import { SlabCanvas } from './SlabCanvas.jsx'
import { drawDevice, deviceVersion } from './device.js'
import { HEADER, ramp, smoothRamp, lerp, devicePoseRel, albumPoseRel, spinOut, LIST_IN, toRel } from './timeline.js'
import { TWEET, TWEET_COVER } from './albums.js'
import { loadTexture } from '../../gl/slab.js'
import { FPS } from '../../core/clock.js'
import { ease } from '../../core/anim.js'

// slab canvas: window-local box that holds the device and its floor reflection
const SC = { x: 175, y: 118, w: 230, h: 240 }
const DEV = { cx: 101, cy: 93, w: 136, h: 136, d: 26 }

// sc: growth (the swoosh sweeps out from beside the device as it appears)
export const Swoosh = memo(function Swoosh({ op = 1, sc = 1 }) {
  // svg coords = window-local - (0, 123)
  return (
    <svg
      width="777"
      height="260"
      style={{
        position: 'absolute',
        left: 0,
        top: 123,
        overflow: 'visible',
        opacity: op,
        transform: sc !== 1 ? `scale(${sc})` : undefined,
        transformOrigin: '305px 104px',
      }}
    >
      <defs>
        <radialGradient id="mw-ring" cx="0.5" cy="0.5" r="0.5" fx="0.3" fy="0.52">
          <stop offset="0.45" stopColor="#f2fdff" stopOpacity="0" />
          <stop offset="0.66" stopColor="#d4f9ff" stopOpacity="0.75" />
          <stop offset="0.8" stopColor="#a9eaff" stopOpacity="0.95" />
          <stop offset="0.92" stopColor="#6ea8ef" stopOpacity="1" />
          <stop offset="0.97" stopColor="#c4dbfa" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mw-ringmask-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.54" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="mw-ringmask" maskUnits="userSpaceOnUse" x="0" y="-50" width="777" height="360">
          <rect x="0" y="-50" width="777" height="360" fill="url(#mw-ringmask-g)" />
        </mask>
        <filter id="mw-b5" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="mw-b12" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id="mw-b1" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
      <ellipse cx="430" cy="27" rx="95" ry="26" fill="#efe4ec" filter="url(#mw-b12)" />
      <ellipse cx="485" cy="107" rx="115" ry="42" fill="#fde0e0" filter="url(#mw-b12)" />
      <ellipse cx="380" cy="205" rx="150" ry="14" fill="#dceaf8" filter="url(#mw-b5)" />
      <g mask="url(#mw-ringmask)">
        <ellipse cx="535" cy="101" rx="136" ry="82" fill="url(#mw-ring)" filter="url(#mw-b1)" transform="rotate(-8 535 101)" />
      </g>
      <ellipse cx="390" cy="105" rx="115" ry="9" fill="#f0a39a" filter="url(#mw-b5)" opacity="0.85" />
      <ellipse cx="470" cy="96" rx="80" ry="6" fill="#f6c9c0" filter="url(#mw-b5)" opacity="0.6" />
    </svg>
  )
})

// "Windows my Music": "Windows" slides in from the left, "my" fades in, "Music" wipes in
// left to right, then the whole title drifts back into place.
const TITLE = { x: 361, wy: 161, y: 189 }
export function Title({ rel, op = 1 }) {
  const H = HEADER
  const wk = ramp(rel, H.windows[0], H.windows[1])
  const wOp = smoothRamp(rel, H.windows[0], H.windows[1] - 1)
  const drift = rel < H.drift[0] ? lerp(-18, 17, wk) : lerp(17, 0, ease.inOut(ramp(rel, H.drift[0], H.drift[1])))
  const myOp = smoothRamp(rel, H.my[0], H.my[1])
  const wipe = ramp(rel, H.music[0], H.music[1])
  const mOff = lerp(-3, 0, ease.out(ramp(rel, H.music[0], H.music[1] + 2)))
  const grow = lerp(0.9, 1, ease.out(ramp(rel, H.windows[0], H.drift[1])))
  if (op <= 0 || rel < H.windows[0]) return null
  const mid = `mw-wipe-${Math.round(wipe * 1000)}`
  return (
    <div
      style={{
        position: 'absolute',
        left: TITLE.x + drift,
        top: 0,
        opacity: op,
        transform: `scale(${grow})`,
        transformOrigin: `0px ${TITLE.y}px`,
      }}
    >
      <Txt x={0} y={TITLE.wy} size={13} w={400} c="#4f86d6" op={wOp}>
        Windows
      </Txt>
      {myOp > 0 && (
        <Txt x={5} y={TITLE.y} size={34} w={300} c="#86b4ea" ls={-0.3} op={myOp}>
          my
        </Txt>
      )}
      {wipe > 0 && (
        <svg width="1" height="1" style={{ position: 'absolute', left: 5 + mOff, top: TITLE.y, overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            <linearGradient id={mid} x1="0" y1="0" x2="1" y2="0">
              <stop offset={Math.max(0, wipe * 1.35 - 0.2)} stopColor="#fff" stopOpacity="1" />
              <stop offset={Math.max(0.001, wipe * 1.35)} stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id={mid + 'm'} maskUnits="userSpaceOnUse" x="40" y="-40" width="110" height="50">
              <rect x="40" y="-40" width="110" height="50" fill={`url(#${mid})`} />
            </mask>
          </defs>
          <text x="0" y="0" transform="scale(0.9,1)" fontFamily={FONT} fontSize={34} fontWeight={300} letterSpacing={-0.3} mask={`url(#${mid}m)`}>
            <tspan fill="#86b4ea" fillOpacity="0">
              {'my '}
            </tspan>
            <tspan fill="#2c6cc4" fontWeight={400}>
              Music
            </tspan>
          </text>
        </svg>
      )}
    </div>
  )
}

const btnLabel = (a, b) => [
  [a + ' ', { w: 500, c: '#3d63a6' }],
  [b, { w: 400, c: '#6e8ec8' }],
]

const BTN = [
  { icon: <I.SpeakerIcon />, box: [395, 222, 30, 36], label: btnLabel('Play', 'Music'), lx: 383, cx: 405 },
  { icon: <I.DiscIcon />, box: [466, 224, 32, 32], label: btnLabel('Burn', 'CD'), lx: 463, cx: 482 },
  { icon: <I.ShareIcon />, box: [540, 225, 40, 30], label: btnLabel('Share', 'Music'), lx: 532, cx: 560 },
]

// each button pops in: fades up while shrinking from a slightly larger size
export function Buttons({ rel, op = 1 }) {
  return BTN.map((b, i) => {
    const s0 = HEADER.buttons[i]
    const k = ramp(rel, s0, s0 + HEADER.buttonDur)
    if (k <= 0 || op <= 0) return null
    const sc = lerp(1.3, 1, ease.out(k))
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          opacity: smoothRamp(rel, s0, s0 + HEADER.buttonDur - 0.5) * op,
          transform: `scale(${sc})`,
          transformOrigin: `${b.cx}px 262px`,
        }}
      >
        <div style={abs(...b.box)}>{b.icon}</div>
        <Txt x={b.lx} y={276} size={11.5} parts={b.label} />
      </div>
    )
  })
}

export const Preview = memo(function Preview() {
  return (
    <>
      <Txt x={710} y={140} size={11} w={400} c="#8aa6d2">
        preview
      </Txt>
      <div style={abs(750, 131, 11, 11)}>
        <I.PreviewCircle />
      </div>
    </>
  )
})

const FLOOR = DEV.cy + DEV.h / 2 + 6
// floor reflection: the pose mirrored in the horizontal plane y = FLOOR
const mirror = (p) => ({ ...p, y: 2 * FLOOR - p.y, rx: -(p.rx || 0), rz: -(p.rz || 0), sy: -(p.sy ?? 1) })
const reflMask = `linear-gradient(180deg, transparent ${FLOOR - 4}px, #000 ${FLOOR + 6}px, transparent ${FLOOR + 48}px)`

loadTexture(TWEET_COVER) // start loading now so capture's ready() waits for it

const deviceSlab = (canvas) => ({
  w: DEV.w,
  h: DEV.h,
  d: DEV.d,
  radius: 8,
  canvas,
  canvasVersion: deviceVersion,
  edgeColor: [0.32, 0.64, 0.78],
  edgeMix: 0.35,
  spec: 0.35,
  rim: 0.6,
  backFlip: false,
})
const albumSlab = {
  w: DEV.w,
  h: DEV.h,
  d: DEV.d,
  radius: 8,
  map: TWEET_COVER,
  edgeColor: [0.62, 0.6, 0.55],
  edgeMix: 0.55,
  spec: 0.16,
  rim: 0.4,
  backFlip: false,
}

// The header's 3D slabs and their floor reflection. items: [{ slab, pose(tt) }] (pose may set opacity)
function Slabs({ t, items, samples = 1, shutter = 0 }) {
  return (
    <>
      <SlabCanvas
        t={t}
        width={SC.w}
        height={SC.h}
        items={items.map((it) => ({ slab: it.slab, pose: (tt) => mirror(it.pose(tt)) }))}
        samples={samples}
        shutter={shutter}
        P={900}
        style={{ left: SC.x, top: SC.y, opacity: 0.22, WebkitMaskImage: reflMask, maskImage: reflMask }}
      />
      <SlabCanvas t={t} width={SC.w} height={SC.h} items={items} samples={samples} shutter={shutter} P={900} style={{ left: SC.x, top: SC.y }} />
    </>
  )
}

// "Tweet  Southern Hummingbird" and the track list (track 3 highlighted, track 4's number blue)
const LIST = { x: 429, sx: 496, y: 151.5, nx: 431, tx: 450, ty: 174.5, dy: 15 }
const TrackListBody = memo(function TrackListBody() {
  return (
    <>
      <Txt x={LIST.x} y={LIST.y} size={20} f={HEAVY} sx={1} c="#d01a1c">
        Tweet
      </Txt>
      <Txt x={LIST.sx} y={LIST.y} size={20} f={HEAVY} sx={1} c="#6c6a69">
        Southern Hummingbird
      </Txt>
      {TWEET.tracks.map((name, i) => {
        const hi = i === 2
        const y = LIST.ty + i * LIST.dy
        return (
          <div key={i}>
            <Txt x={LIST.nx} y={y} size={11} f={HEAVY} sx={1} c={hi || i === 3 ? '#2a9ff0' : '#8e8e8e'}>
              {String(i + 1)}
            </Txt>
            <Txt x={LIST.tx} y={y} size={11} f={HEAVY} sx={1} c={hi ? '#2a9ff0' : '#8e8e8e'}>
              {name}
            </Txt>
          </div>
        )
      })}
    </>
  )
})

// slides in from the right with a horizontal multi-sample blur
function TrackList({ hrel }) {
  if (hrel < 13) return null
  const [dx0, op] = LIST_IN(hrel)
  if (hrel >= 20) return <TrackListBody />
  const n = 10
  const layers = []
  for (let k = 0; k < n; k++) {
    const h = hrel + (k + 0.5) / n - 0.5
    const [dx, o] = LIST_IN(h)
    layers.push(
      <div key={k} style={{ position: 'absolute', left: dx, top: 0, opacity: o / n, mixBlendMode: 'plus-lighter' }}>
        <TrackListBody />
      </div>,
    )
  }
  return <div style={{ position: 'absolute', left: 0, top: 0, isolation: 'isolate', opacity: op > 0 ? 1 : 0 }}>{layers}</div>
}

// t: this copy's time; openT: music.open; pageT: start of the album page transition (or null)
export function Header({ t, openT, pageT }) {
  const rel = toRel(t, openT)
  const hrel = pageT == null ? -1e9 : toRel(t, pageT)
  const fadeOut = 1 - smoothRamp(hrel, 1.5, 8.5)
  const devPose = (tt) => {
    const p = devicePoseRel(toRel(tt, openT))
    if (pageT == null) return p
    const h = toRel(tt, pageT)
    const s = spinOut(h)
    return { ...p, ry: p.ry + s.ry, z: p.z + s.z, opacity: 1 - ramp(h, 4, 5) }
  }
  const albPose = (tt) => {
    const h = toRel(tt, pageT)
    return { ...albumPoseRel(h), opacity: ramp(h, 4, 5) }
  }
  const items = []
  if (rel > 5.5 && hrel < 5.2) items.push({ slab: deviceSlab(drawDevice(t)), pose: devPose })
  if (hrel > 3.8) items.push({ slab: albumSlab, pose: albPose })
  const fast = rel < 24 || (hrel > 0 && hrel < 21)
  return (
    <>
      {fadeOut > 0 && rel > HEADER.swoosh[0] && (
        <Swoosh
          op={smoothRamp(rel, HEADER.swoosh[0], HEADER.swoosh[0] + 4) * fadeOut}
          sc={rel >= HEADER.swoosh[1] ? 1 : 0.3 + 0.7 * ease.out(ramp(rel, HEADER.swoosh[0], HEADER.swoosh[1]))}
        />
      )}
      {items.length > 0 && <Slabs t={t} items={items} samples={fast ? 8 : 3} shutter={(fast ? 0.9 : 0.5) / FPS} />}
      {fadeOut > 0 && <Title rel={rel} op={fadeOut} />}
      {fadeOut > 0 && <Buttons rel={rel} op={fadeOut} />}
      <TrackList hrel={hrel} />
      <Preview />
    </>
  )
}
