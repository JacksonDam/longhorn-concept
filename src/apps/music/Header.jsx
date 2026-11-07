// The header of my Music: the glass music device (3D slab), "Windows my Music", the swoosh and
// the Play Music / Burn CD / Share Music buttons; after an album is opened, the album slab
// and its track list. Everything is a pure function of (t, header state).
import { memo, useContext } from 'react'
import { emit } from '../../core/events.js'
import { Txt, abs, FONT, HEAVY, useLayer, LiveLayers } from '../../os/text.jsx'
import * as I from '../../os/icons.jsx'
import { drawDevice, deviceVersion } from './device.js'
import { HEADER, ramp, smoothRamp, lerp, devicePoseRel, albumPoseRel, spinOut, LIST_IN, toRel, DEVICE_REST, ALBUM_REST } from './timeline.js'
import { drifting } from './tilt.js'
import { Slabs, settledPose, slabClock, DEVICE_IN, SPIN_END } from './HeaderSlab.jsx'
import { TWEET_COVER } from './albums.js'
import { loadTexture } from '../../gl/slab.js'
import { ease } from '../../core/anim.js'

// slab canvas: window-local box that holds the device and its floor reflection
const SC = { x: 175, y: 118, w: 230, h: 240 }
const DEV = { cx: 101, cy: 93, w: 136, h: 136, d: 26 }

// sc: growth (the swoosh sweeps out from beside the device as it appears)
export const Swoosh = memo(function Swoosh({ op = 1, sc = 1 }) {
  const LAYER = useLayer(sc !== 1)
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
        willChange: LAYER,
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
        <ellipse cx="541" cy="101" rx="136" ry="80" fill="url(#mw-ring)" filter="url(#mw-b1)" transform="rotate(-8 541 101)" />
      </g>
      <ellipse cx="390" cy="105" rx="115" ry="9" fill="#f0a39a" filter="url(#mw-b5)" opacity="0.85" />
      <ellipse cx="470" cy="96" rx="80" ry="6" fill="#f6c9c0" filter="url(#mw-b5)" opacity="0.6" />
    </svg>
  )
})

// the swoosh's intro (my Music's, and my Pictures' header the same): it fades in and sweeps out
// to full size from beside the device. rel: frames from the window's open reference (openT)
export function SwooshIn({ rel, op = 1 }) {
  if (op <= 0 || rel <= HEADER.swoosh[0]) return null
  return (
    <Swoosh
      op={smoothRamp(rel, HEADER.swoosh[0], HEADER.swoosh[0] + 4) * op}
      sc={rel >= HEADER.swoosh[1] ? 1 : 0.3 + 0.7 * ease.out(ramp(rel, HEADER.swoosh[0], HEADER.swoosh[1]))}
    />
  )
}

// "Windows my Music": "Windows" slides in from the left, "my" fades in, "Music" wipes in
// left to right, then the whole title drifts back into place. Another header's title plays the
// same intro (my Pictures' "Windows my Pictures & Videos"): name, the wipe's width (px of the
// unscaled text from the name's start: wider than the name) and an id unique to the window kind.
const TITLE = { x: 361, wy: 161, y: 189 }
export function Title({ rel, op = 1, name = 'Music', wipeW = 110, id = 'mw' }) {
  const LAYER = useLayer(rel < HEADER.drift[1])
  const H = HEADER
  const wk = ramp(rel, H.windows[0], H.windows[1])
  const wOp = smoothRamp(rel, H.windows[0], H.windows[1] - 1)
  const drift = rel < H.drift[0] ? lerp(-18, 17, wk) : lerp(17, 0, ease.inOut(ramp(rel, H.drift[0], H.drift[1])))
  const myOp = smoothRamp(rel, H.my[0], H.my[1])
  const wipe = ramp(rel, H.music[0], H.music[1])
  const mOff = lerp(-3, 0, ease.out(ramp(rel, H.music[0], H.music[1] + 2)))
  const grow = lerp(0.9, 1, ease.out(ramp(rel, H.windows[0], H.drift[1])))
  if (op <= 0 || rel < H.windows[0]) return null
  const mid = `${id}-wipe-${Math.round(wipe * 1000)}`
  return (
    <div
      style={{
        position: 'absolute',
        left: TITLE.x + drift,
        top: 0,
        opacity: op,
        transform: `scale(${grow})`,
        transformOrigin: `0px ${TITLE.y}px`,
        willChange: LAYER,
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
            <mask id={mid + 'm'} maskUnits="userSpaceOnUse" x="40" y="-40" width={wipeW} height="50">
              <rect x="40" y="-40" width={wipeW} height="50" fill={`url(#${mid})`} />
            </mask>
          </defs>
          <text x="0" y="0" transform="scale(0.9,1)" fontFamily={FONT} fontSize={34} fontWeight={300} letterSpacing={-0.3} mask={`url(#${mid}m)`}>
            <tspan fill="#86b4ea" fillOpacity="0">
              {'my '}
            </tspan>
            <tspan fill="#2c6cc4" fontWeight={400}>
              {name}
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
  { icon: <I.SpeakerIcon />, box: [395, 222, 30, 36], label: btnLabel('Play', 'Music'), lx: 383, cx: 405, act: 'play', hw: 70 },
  { icon: <I.DiscIcon />, box: [466, 224, 32, 32], label: btnLabel('Burn', 'CD'), lx: 463, cx: 482, act: 'burn', hw: 50 },
  { icon: <I.ShareIcon />, box: [540, 225, 40, 30], label: btnLabel('Share', 'Music'), lx: 532, cx: 560, act: 'share', hw: 76 },
]

// the header buttons' intro has played by this rel (frames from the open reference)
export const BUTTONS_END = HEADER.buttons[HEADER.buttons.length - 1] + HEADER.buttonDur
// what a motion-blur copy of the window shows of the header's intro (rel frames): the video's
// copies show rel 9 while it plays, then the whole header
export const INTRO_SHOTS = [9, 74]

// Header button i's pop-in (my Music's, and my Pictures' buttons the same): it fades up while
// shrinking from a slightly larger size about (cx, cy) in its parent's px (cy: under the icon).
// children(done): the button, done once it has popped in. rel: frames from the open reference
export function PopIn({ rel, i, op = 1, cx, cy = 262, children }) {
  const LAYER = useLayer(rel < BUTTONS_END)
  const s0 = HEADER.buttons[i]
  const k = ramp(rel, s0, s0 + HEADER.buttonDur)
  if (k <= 0 || op <= 0) return null
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        opacity: smoothRamp(rel, s0, s0 + HEADER.buttonDur - 0.5) * op,
        transform: `scale(${lerp(1.3, 1, ease.out(k))})`,
        transformOrigin: `${cx}px ${cy}px`,
        willChange: LAYER,
      }}
    >
      {children(op >= 1 && k >= 1)}
    </div>
  )
}

// actions: { play, burn, share } click handlers (live window only)
export function Buttons({ rel, op = 1, actions }) {
  return BTN.map((b, i) => (
    <PopIn key={i} rel={rel} i={i} op={op} cx={b.cx}>
      {(done) => (
        <>
          <div style={abs(...b.box)}>{b.icon}</div>
          <Txt x={b.lx} y={276} size={11.5} parts={b.label} />
          {actions && done && (
            <div
              data-hit={'music.' + b.act}
              style={abs(b.lx - 4, b.box[1] - 4, b.hw, 62)}
              onClick={(e) => {
                e.stopPropagation()
                actions[b.act]?.()
              }}
            />
          )}
        </>
      )}
    </PopIn>
  ))
}

export const Preview = memo(function Preview({ onClick }) {
  return (
    <>
      <Txt x={710} y={140} size={11} w={400} c="#8aa6d2">
        preview
      </Txt>
      <div style={abs(750, 131, 11, 11)}>
        <I.PreviewCircle />
      </div>
      {/* (over the arrow too) */}
      {onClick && <div data-hit="music.preview" style={abs(706, 128, 58, 16)} onClick={onClick} />}
    </>
  )
})

// the slab canvases (HeaderSlab.jsx): the device's box, its tilt's half size, the floor its
// reflection stands on, and where it stands once the pointer drives it: turned toward the
// pointer, the settled place would cover the start of "Windows my Music" (x 361), so it moves
// 48.6 px left at 0.9 of its size (its foot kept on the floor line) and every pointer pose
// (+-12 deg) ends 49.5 px short of the title, my Pictures' frame's gap
// (worked out with the slab renderer's geometry and camera)
const SPEC = { box: SC, hw: DEV.w / 2, hh: DEV.h / 2, floor: DEV.cy + DEV.h / 2 + 6, fade: 48, pointer: { x: 73.6, y: 88.5 + (DEV.h / 2) * 0.1, s: 0.9 } }

loadTexture(TWEET_COVER) // start loading now so capture's ready() waits for it

// (one slab record per canvas, its version bumped when the equaliser redraws: SlabCanvas keys
// what it shows on the slab's identity and version)
const deviceSlabs = new WeakMap()
const deviceSlab = (canvas) => {
  let s = deviceSlabs.get(canvas)
  if (!s) {
    s = {
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
      sat: 0.75,
      backFlip: false,
    }
    deviceSlabs.set(canvas, s)
  }
  s.canvasVersion = deviceVersion
  return s
}
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

// the album page's title ("Tweet  Southern Hummingbird" in the video) and track list (the
// selected track highlighted; the playing track's number blue - the video's track 4)
const LIST = { x: 429, sx: 496, y: 151.5, nx: 431, tx: 450, ty: 174.5, dy: 15 }
const listDy = (n) => (n > 10 ? 150 / (n - 1) : LIST.dy)
// sel: highlighted track index; hover: hovered index or -1; playing: index whose number is blue
const TrackListBody = memo(function TrackListBody({ album, sel = -1, hover = -1, playing = -1 }) {
  const dy = listDy(album.tracks.length)
  const isTweet = album.artist === 'Tweet'
  return (
    <>
      {isTweet ? (
        <>
          <Txt x={LIST.x} y={LIST.y} size={20} f={HEAVY} sx={1} c="#d01a1c">
            Tweet
          </Txt>
          <Txt x={LIST.sx} y={LIST.y} size={20} f={HEAVY} sx={1} c="#6c6a69">
            Southern Hummingbird
          </Txt>
        </>
      ) : (
        <Txt
          x={LIST.x}
          y={LIST.y}
          size={album.artist.length + album.title.length > 30 ? 16 : 20}
          f={HEAVY}
          sx={1}
          parts={[
            [album.artist, { c: '#d01a1c' }],
            ['  ' + album.title, { c: '#6c6a69' }],
          ]}
        />
      )}
      {album.tracks.map((tr, i) => {
        const hi = i === sel || i === hover
        const y = LIST.ty + i * dy
        return (
          <div key={i}>
            <Txt x={LIST.nx} y={y} size={11} f={HEAVY} sx={1} c={hi || i === playing ? '#2a9ff0' : '#8e8e8e'}>
              {String(i + 1)}
            </Txt>
            <Txt x={LIST.tx} y={y} size={11} f={HEAVY} sx={1} c={hi ? '#2a9ff0' : '#8e8e8e'}>
              {tr.title}
            </Txt>
          </div>
        )
      })}
    </>
  )
})

// invisible hit rows for hover / click on the tracks (a click selects and plays the track)
const TrackHits = memo(function TrackHits({ album }) {
  const dy = listDy(album.tracks.length)
  return album.tracks.map((_, i) => (
    <div
      key={i}
      data-track={i}
      onPointerEnter={() => emit('hover', { id: 'music.track.' + i, on: true })}
      onPointerLeave={() => emit('hover', { id: 'music.track.' + i, on: false })}
      onClick={(e) => {
        e.stopPropagation()
        emit('music.track', { n: i, album: album.key })
        emit('media.play', { playlist: album.tracks.map((tr) => ({ title: `${album.artist} - ${tr.title}`, duration: tr.duration })), track: i })
      }}
      style={abs(LIST.nx - 4, LIST.ty - 11 + i * dy, 300, dy)}
    />
  ))
})

// Slides in from the right with a horizontal multi-sample blur. The blur layers are mounted one
// per frame from the click (parked off-stage, so they are painted before they're needed) and stay
// mounted while the page shows; afterwards layer 0 is the list. `out` fades a list being replaced.
const LIST_N = 5
const PARK = { transform: 'translateX(-4000px)', opacity: 1e-4 }
function TrackList({ album, hrel, sel, hover, playing, out = 1 }) {
  const live = useContext(LiveLayers)
  if (!album) return null
  // motion-blur copies of the window show the settled list, flat (no layers of their own)
  if (!live) return hrel >= 20 ? <div style={{ position: 'absolute', left: 0, top: 0, opacity: out }}><TrackListBody album={album} sel={sel} playing={playing} /></div> : null
  const settled = hrel >= 20
  const [, op] = LIST_IN(Math.min(hrel, 20))
  const mounted = Math.min(LIST_N, Math.max(1, Math.floor(hrel + 23) + 1))
  const layers = []
  for (let k = 0; k < mounted; k++) {
    let style
    if (settled) style = k === 0 ? { opacity: out } : PARK
    else if (hrel < 13 || op <= 0) style = PARK
    else {
      const [dx, o] = LIST_IN(hrel + (k + 0.5) / LIST_N - 0.5)
      style = { transform: `translateX(${dx}px)`, opacity: o / LIST_N }
    }
    layers.push(
      <div key={k} style={{ position: 'absolute', left: 0, top: 0, mixBlendMode: settled ? undefined : 'plus-lighter', willChange: k === 0 && settled && live === 'rest' ? 'opacity' : 'transform, opacity', ...style }}>
        {k === 0 && settled ? (
          <TrackListBody album={album} sel={sel} hover={hover} playing={playing} />
        ) : (
          <TrackListBody album={album} sel={sel} playing={playing} />
        )}
      </div>,
    )
  }
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, isolation: 'isolate' }}>
      {layers}
      {settled && out === 1 && <TrackHits album={album} />}
    </div>
  )
}

const albumSlabs = new Map()
function albumSlabFor(album) {
  let s = albumSlabs.get(album.key)
  if (!s) {
    s = { ...albumSlab, map: album.artist === 'Tweet' ? TWEET_COVER : album.url }
    albumSlabs.set(album.key, s)
  }
  return s
}

// t: this copy's time; openT: the window's open reference time.
// page: { album (library record | null = the device), t (start of its transition), prev (the page
// before: album | null), prevSince (when that page started) } or null (never left the device).
// slabs: 'all' (default), 'none' (everything but the 3D slabs) or 'only' (just the slabs, for the
// window's overlay layer). track / trackHover / playing: the page's track list state.
// rect: the window's rect at a time (t => { x, y, w, h }, stage px), for the slabs' pointer tilt
// (none: no tilt)
export function Header({ t, openT, page, next = null, copy = false, track = -1, trackHover = -1, playing = -1, slabT: slabT0 = t, slabs = 'all', cache = false, skip = false, hidden = false, rect = null, actions }) {
  const rel = toRel(t, openT)
  const hrel = page == null ? -1e9 : toRel(t, page.t)
  // after its spin-in has settled (`rest` frames from `t0`), a slab hands over to the pointer
  // (tilt.js); the video's idle drift plays only when the log asks for it. -> the pose at tt
  const drift = drifting(t)
  const settled = (poseAt, tt, t0, rest) => settledPose(SPEC, poseAt, tt, t0, rest, rect, drift)
  // (the open's spin-in and a page's spin are fast; HeaderSlab.jsx slabClock)
  const spin = rel < SPIN_END || (hrel > 0 && hrel < 21)
  // (the shown page's slab: the device since the open, or a page's, the device back from an
  // album too, spun in with the album's spin)
  const sample = (tt) => (page == null ? settled(devicePoseRel, tt, openT, DEVICE_REST) : settled(albumPoseRel, tt, page.t, ALBUM_REST))
  const { slabT } = slabClock(slabT0, spin, rect && sample)
  const toDevice = page != null && page.album == null
  const fromDevice = page != null && page.prev == null
  // the device header (title, buttons, swoosh): fades out leaving the device, back in returning
  const headerOp = page == null ? 1 : toDevice ? smoothRamp(hrel, 8, 16) : fromDevice ? 1 - smoothRamp(hrel, 1.5, 8.5) : 0
  const spinAway = (pose, tt) => {
    const h = toRel(tt, page.t)
    const s = spinOut(h)
    return { ...pose, ry: pose.ry + s.ry, z: pose.z + s.z, opacity: 1 - ramp(h, 4, 5) }
  }
  const spinIn = (tt) => ({ ...sample(tt), opacity: ramp(toRel(tt, page.t), 4, 5) })
  const items = []
  const device = (tt) => settled(devicePoseRel, tt, openT, DEVICE_REST)
  // (only a header that draws the slabs builds them: the device's equaliser canvas is one shared
  // canvas, drawn here for this header's slab time, so a header without slabs (the window
  // content's, at its own content time) mustn't redraw it under the slab overlay)
  if (slabs === 'none') {
    // no slabs
  } else if (page == null) {
    if (rel > DEVICE_IN) items.push({ slab: deviceSlab(drawDevice(slabT)), pose: device })
  } else {
    // outgoing (until it has turned away), from the pose it held (the pointer's too)
    if (hrel < 5.2) {
      const held = (tt) => (page.prevSince == null ? device(tt) : settled(albumPoseRel, tt, page.prevSince, ALBUM_REST))
      if (page.prev == null) {
        if (rel > DEVICE_IN) items.push({ slab: deviceSlab(drawDevice(slabT)), pose: (tt) => spinAway(held(tt), tt) })
      } else items.push({ slab: albumSlabFor(page.prev), pose: (tt) => spinAway(held(tt), tt) })
    }
    // incoming
    if (hrel > 3.8) items.push({ slab: page.album ? albumSlabFor(page.album) : deviceSlab(drawDevice(slabT)), pose: spinIn })
  }
  const slabEl =
    items.length > 0 && slabs !== 'none' ? (
      <Slabs spec={SPEC} t={slabT} items={items} spin={spin} copy={copy} cache={cache && 'music'} skip={skip} hidden={hidden} />
    ) : null
  if (slabs === 'only') return slabEl
  const prevListOp = page && page.prev ? 1 - smoothRamp(hrel, 1, 6) : 0
  return (
    <>
      <SwooshIn rel={rel} op={headerOp} />
      {slabEl}
      {headerOp > 0 && <Title rel={rel} op={headerOp} />}
      {headerOp > 0 && <Buttons rel={rel} op={headerOp} actions={actions} />}
      {/* keyed by album: a list keeps its layers from being pre-mounted (clicked, page pending)
          through showing to fading out as the previous page (no remounts) */}
      {[
        page && page.prev && prevListOp > 0 && <TrackList key={page.prev.key} album={page.prev} hrel={99} sel={-1} hover={-1} playing={-1} out={prevListOp} />,
        page && page.album && <TrackList key={page.album.key} album={page.album} hrel={hrel} sel={track} hover={copy ? -1 : trackHover} playing={playing} />,
        next && next.album && next.album !== page?.album && (
          <TrackList key={next.album.key} album={next.album} hrel={toRel(t, next.t)} sel={-1} hover={-1} playing={-1} />
        ),
      ]}
      <Preview onClick={actions?.preview} />
    </>
  )
}
