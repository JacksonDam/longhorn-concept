// my Pictures & Videos (design from the second reference video, ref2 f00600 / f01060): the my
// Music window's layout for pictures. Header with a framed photo and "Windows my Pictures &
// Videos", task pane (enjoy pictures, find pictures, Refine By Date calendar, file types),
// date-grouped thumbnails, a detail view per photo (comments, keywords, location, Edit),
// albums, and the full-screen slide show (app 'slideshow').
import { memo, useCallback, useEffect } from 'react'
import { emit } from '../../core/events.js'
import { now, FPS } from '../../core/clock.js'
import {
  scoped, wid, valueOf, hoverKeys, pt, TextField, Slider, Scrollbar, DropMenu, dropBelow, ContextMenu, contextHandler, Button, C, FONT, HEAVY, find, focusField,
} from '../../ui/index.js'
import { Ico } from '../lib/icons.jsx'
import { SwooshIn, PopIn, Title as MusicTitle, BUTTONS_END, INTRO_SHOTS } from '../music/Header.jsx'
import { Slabs, settledPose, slabClock, devicePoseTo, rectAt, DEVICE_IN, DEVICE_REST, SPIN_END } from '../music/HeaderSlab.jsx'
import { drifting } from '../music/tilt.js'
import { toRel } from '../music/timeline.js'
import { openT } from '../music/actions.js'
import { wantPointer } from '../../core/Cursor.jsx'
import { EXPLORER_TOP } from '../../os/ExplorerChrome.jsx'
import { Txt } from '../../os/text.jsx'
import { textWidth } from '../../ui/measure.js'
import { waitFor } from '../../core/preload.js'
import { getApp } from '../../os/apps.js'
import { openWin, openUrl, messageBox } from '../lib/common.js'
import { PHOTOS, photoById, TAGS, photoUrl } from '../lib/pictures.jsx'
import { picState, visibleGroups, library, editStyle } from './state.js'
import { Calendar } from './Calendar.jsx'
import { openCamera } from '../autoplay/index.jsx'

// a grid of images as one element (background layers)
function ImageGrid({ x, y, w, h, urls, tw, th, gap, cols }) {
  const n = urls.length
  if (!n) return null
  const pos = urls.map((_, i) => `${(i % cols) * (tw + gap)}px ${Math.floor(i / cols) * (th + gap)}px`)
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        backgroundImage: urls.map((u) => `url("${u}")`).join(','),
        backgroundPosition: pos.join(','),
        backgroundSize: urls.map(() => `${tw}px ${th}px`).join(','),
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}

const PANE_X = 33
const AREA_X = 190

const set = (win, n, value) => emit('ui.value', { id: wid(win, n), value })

// ---- header ------------------------------------------------------------------------------------
// my Music's header for pictures (ref2 f00600, measured at the video's window scale x1.5), with
// my Music's own parts and intro: the swoosh (music/Header.jsx SwooshIn), the device as a real 3D
// glass slab (music/HeaderSlab.jsx: the shared slab renderer, a framed photo on its face, its
// floor reflection below; my Music's spin-in on open into its own resting pose, then the pointer
// tilt), "Windows my Pictures & Videos" in my Music's title type, and the View Slide Show /
// Create Album / Burn DVD buttons laid out as my Music's (icon over label) popping in as its
// buttons do (music/Header.jsx PopIn). Coordinates: content px (window px - EXPLORER_TOP 123).
const DEV = { x: 133, y: -12, w: 240, h: 260, cx: 117, cy: 98, fw: 120, fh: 140, d: 14 }
const DFLOOR = DEV.cy + DEV.fh / 2 + 6
// the frame's resting pose (in the slab box), the box in window px (the slab is drawn by the
// window's Overlay) and my Music's spin-in into that pose
const DPOSE = { x: DEV.cx, y: DEV.cy, ry: 0.55, rx: -0.06, rz: -0.03, z: 0 }
const SPEC = { box: { x: DEV.x, y: DEV.y + EXPLORER_TOP, w: DEV.w, h: DEV.h }, hw: DEV.fw / 2, hh: DEV.fh / 2, floor: DFLOOR, fade: 30 }
const framePose = devicePoseTo(DPOSE)

// the device's face: a silver photo frame around the header photo (a stand-in canyon), drawn on a
// canvas once the photo has rasterised (photoUrl: a blob, ready before capture)
const FW = 240, FH = 280
let frameSlab = null
function deviceSlab() {
  if (frameSlab) return frameSlab
  const c = document.createElement('canvas')
  c.width = FW
  c.height = FH
  frameSlab = { w: DEV.fw, h: DEV.fh, d: DEV.d, radius: 6, canvas: c, canvasVersion: 0, edgeColor: [0.86, 0.89, 0.94], edgeMix: 0.55, spec: 0.3, rim: 0.5, sat: 1, backFlip: false }
  const g = c.getContext('2d')
  const frame = g.createLinearGradient(0, 0, FW, FH)
  frame.addColorStop(0, '#fbfdff')
  frame.addColorStop(0.4, '#c9d3e2')
  frame.addColorStop(0.62, '#eef3fa')
  frame.addColorStop(1, '#a3b1c6')
  g.fillStyle = frame
  g.fillRect(0, 0, FW, FH)
  g.strokeStyle = '#7d8aa3'
  g.lineWidth = 2
  const M = 22
  g.strokeRect(M - 1, M - 1, FW - 2 * M + 2, FH - 2 * M + 2)
  const img = new Image()
  img.src = photoUrl('mountain', 31)
  const paint = () => {
    g.drawImage(img, M, M, FW - 2 * M, FH - 2 * M)
    const sheen = g.createLinearGradient(M, M, FW - M, FH - M)
    sheen.addColorStop(0, 'rgba(255,255,255,0.4)')
    sheen.addColorStop(0.4, 'rgba(255,255,255,0)')
    g.fillStyle = sheen
    g.fillRect(M, M, FW - 2 * M, FH - 2 * M)
    frameSlab.canvasVersion++
  }
  frameSlab.ready = img.decode().then(paint, () => {})
  waitFor(frameSlab.ready)
  return frameSlab
}
if (typeof document !== 'undefined') deviceSlab() // the face starts drawing with the app module

// whether the header shows (the overview with the task pane; detail and hidden tasks have none)
function headerShown(t, win) {
  return viewOf(t, win, { view: valueOf(t, wid(win, 'view'), 'browse') }).view !== 'detail' && !taskHidden(t, win)
}
// The photo frame, drawn above the content on every layer of the window (the motion-blur copies
// share one render): my Music's spin-in on open, then its settled pose until the pointer takes
// over (music/tilt.js; while the overlay is mounted the pointer's moves are logged). The face's
// canvas redraws once its photo has decoded (canvasVersion: the canvases' next frame shows it).
function PicturesOverlay({ win, t, skip, hidden }) {
  useEffect(() => wantPointer(), [])
  const t0 = openT(win)
  const rel = toRel(t, t0)
  if (rel <= DEVICE_IN || !headerShown(t, win)) return null
  const rect = rectAt(win, pictures)
  const drift = drifting(t)
  const pose = (tt) => settledPose(SPEC, framePose, tt, t0, DEVICE_REST, rect, drift)
  const spin = rel < SPIN_END
  const { slabT } = slabClock(t, spin, pose)
  return <Slabs spec={SPEC} t={slabT} items={[{ slab: deviceSlab(), pose }]} spin={spin} cache="pictures" skip={skip} hidden={hidden} />
}

// my Music's title and its intro (music/Header.jsx Title: "Windows" slides in, "my" fades in, the
// name wipes in, the whole title drifts into place), in window px like my Music's header. The
// wipe spans the name (unscaled px, the margin my Music's has past "Music")
const NAME = 'Pictures & Videos'
function Title({ rel }) {
  // (measured when drawn: the boot has loaded the face by then)
  const wipeW = Math.ceil(textWidth(NAME, { size: 34, w: 400, ls: -0.3 })) + 16
  return (
    <div style={{ position: 'absolute', left: 0, top: -EXPLORER_TOP }} onPointerDown={(e) => e.button === 0 && slideshow(null, true)}>
      <MusicTitle rel={rel} name={NAME} wipeW={wipeW} id="pw" />
    </div>
  )
}

// my Music's header buttons: a 32 px icon over a two-tone label, hit box around both
const btnParts = (a, b) => [
  [a + ' ', { w: 500, c: '#3d63a6' }],
  [b, { w: 400, c: '#6e8ec8' }],
]
const HB = [
  { id: 'hb.show', icon: 'slideshow', cx: 404, a: 'View', b: 'Slide Show', go: () => slideshow(null, true) },
  { id: 'hb.album', icon: 'wmp-album', cx: 494, a: 'Create', b: 'Album', go: () => openWin('album', 'album') },
  { id: 'hb.dvd', icon: 'cd', cx: 584, a: 'Burn', b: 'DVD', go: () => openWin('burncd', 'burncd', { what: 'dvd' }) },
]
// (each pops in as my Music's do, about the bottom of its icon: 262 window px, music/Header.jsx;
// it takes input once it has)
function HeaderButtons({ win, t, rel }) {
  const lit = hoverKeys(t, wid(win, 'hb'))
  return HB.map((b, i) => {
    const tw = textWidth(b.a + ' ' + b.b, { size: 11.5, w: 500 })
    const on = (lit.get(b.id) || 0) > 0.5
    return (
      <PopIn key={b.id} rel={rel} i={i} cx={b.cx} cy={262 - EXPLORER_TOP}>
        {(done) => (
          <div
            style={{ position: 'absolute', left: b.cx - Math.max(tw, 36) / 2 - 6, top: 92, width: Math.max(tw, 36) + 12, height: 66, borderRadius: 4, background: on ? 'rgba(160,200,250,0.18)' : 'transparent', pointerEvents: done ? undefined : 'none' }}
            onPointerEnter={(e) => emit('hover', { id: wid(win, 'hb'), key: b.id, on: true, ...pt(e) })}
            onPointerLeave={() => emit('hover', { id: wid(win, 'hb'), key: b.id, on: false })}
            onPointerDown={(e) => e.button === 0 && b.go()}
          >
            <div style={{ position: 'absolute', left: Math.max(tw, 36) / 2 + 6 - 16, top: 6 }}>
              <Ico kind={b.icon} size={32} />
            </div>
            <Txt x={6 + (Math.max(tw, 36) - tw) / 2} y={58} size={11.5} parts={btnParts(b.a, b.b)} />
          </div>
        )}
      </PopIn>
    )
  })
}

// (the frame itself is the window's Overlay, PicturesOverlay; here its hit box, the face's
// settled place: a click starts the slide show)
function Header({ win, t }) {
  const rel = toRel(t, openT(win))
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: -EXPLORER_TOP }}>
        <SwooshIn rel={rel} />
      </div>
      {rel > SPIN_END && (
        <div
          style={{ position: 'absolute', left: DEV.x + DEV.cx - DEV.fw / 2, top: DEV.y + DEV.cy - DEV.fh / 2, width: DEV.fw, height: DEV.fh }}
          onPointerDown={(e) => e.button === 0 && slideshow(null, true)}
        />
      )}
      <Title rel={rel} />
      <HeaderButtons win={win} t={t} rel={rel} />
    </>
  )
}
// the header's intro (the swoosh, the buttons) plays at the frame rate: the content follows the
// clock until it has played, and holds its end after (scoped until, liveTime)
const introEnd = (win) => openT(win) + (BUTTONS_END + 1) / FPS

const slideshow = (photo, auto = false, album = null) => openWin('slideshow', 'slideshow', { photo, auto, album })
const printBox = () => messageBox({ title: 'Print Pictures', icon: 'warning', text: 'Windows cannot print because no printer is installed.\nTo add a printer, open Printers and Faxes in Control Panel.' })

// ---- task pane ---------------------------------------------------------------------------------
// wrap: a width the label wraps within (two lines, the icon on the first), else one line
function Link({ id, children, x, y, onClick, on, t, wrap }) {
  const lit = hoverKeys(t, id).get(0) || 0
  return (
    <div
      style={{ position: 'absolute', left: x, top: y, ...(wrap ? { width: wrap, alignItems: 'flex-start', lineHeight: '13px', paddingTop: 2 } : { height: 17, alignItems: 'center', whiteSpace: 'nowrap' }), display: 'flex', gap: 5, fontFamily: FONT, fontSize: 11, color: on ? C.link : lit > 0.5 ? C.link : C.textDark, fontWeight: on ? 560 : 400, textDecoration: lit > 0.5 ? 'underline' : 'none' }}
      onPointerEnter={(e) => emit('hover', { id, key: 0, on: true, ...pt(e) })}
      onPointerLeave={() => emit('hover', { id, key: 0, on: false })}
      onPointerDown={(e) => e.button === 0 && onClick()}
    >
      {children}
    </div>
  )
}
const Head = memo(function Head({ a, b, y }) {
  return (
    <div style={{ position: 'absolute', left: PANE_X - 12, top: y, fontFamily: FONT, fontSize: 17.5, fontWeight: 300, color: C.headingLight, whiteSpace: 'nowrap', lineHeight: '20px' }}>
      {a} <span style={{ fontWeight: 500, color: C.heading }}>{b}</span>
    </div>
  )
})
const small = { position: 'absolute', fontFamily: FONT, fontSize: 10.5, color: '#8b91a6', whiteSpace: 'nowrap' }

function TaskPane({ win, t, st, calendar = true }) {
  const L = (n, y, label, icon, fn, on, wrap) => (
    <Link key={n} id={wid(win, 'tp.' + n)} x={PANE_X - 8} y={y} onClick={fn} on={on} t={t} wrap={wrap}>
      {icon !== undefined && <span style={{ width: 16, height: 16, display: 'inline-block' }}>{icon && <Ico kind={icon} size={16} />}</span>}
      {label}
    </Link>
  )
  const tags = st.moreTags ? TAGS.slice(3) : TAGS.slice(0, 3)
  return (
    <>
      <div onPointerDown={(e) => e.button === 0 && slideshow(null, true)}>
        <Head a="enjoy" b="pictures" y={8} />
      </div>
      {L('show', 30, 'View Slide show', 'slideshow', () => slideshow(null, true))}
      {L('album', 46, 'Create an Album', 'wmp-album', () => openWin('album', 'album'))}
      {L('dvd', 62, 'Burn DVD', 'wmp-burn', () => openWin('burncd', 'burncd', { what: 'dvd' }))}
      {L('share', 78, 'Share Pictures', 'shared', () => openWin('sharemusic', 'sharemusic', { folder: 'my Pictures & Videos' }))}
      {L('print', 94, 'Print Pictures', 'printpics', printBox)}
      {/* (wraps: on one line it ran into the header's device) */}
      {L('camera', 110, 'Get Pictures from Camera', 'camera', () => openCamera(now()), false, 120)}
      <div onPointerDown={(e) => e.button === 0 && focusField(wid(win, 'words'))}>
        <Head a="find" b="pictures" y={145} />
      </div>
      <div style={{ ...small, left: PANE_X - 8, top: 168 }} onPointerDown={(e) => e.button === 0 && focusField(wid(win, 'words'))}>Containing the words:</div>
      <TextField id={wid(win, 'words')} x={PANE_X - 8} y={183} w={136} h={17} size={10.5} pad={4} />
      <div style={{ ...small, left: PANE_X - 8, top: 207 }} onPointerDown={(e) => e.button === 0 && set(win, 'tag', null)}>Show all images by:</div>
      {tags.map((tg, i) => L('tag' + tg, 222 + i * 16, tg, undefined, () => set(win, 'tag', st.tag === tg ? null : tg), st.tag === tg))}
      {L('more', 270, st.moreTags ? 'Back...' : 'More...', undefined, () => set(win, 'moretags', !st.moreTags))}
      <div style={{ ...small, left: PANE_X - 8, top: 295 }} onPointerDown={(e) => e.button === 0 && emit('ui.value', { id: wid(win, 'cal'), value: { ...st.cal, sel: null } })}>Refine By Date:</div>
      {calendar ? <Calendar id={wid(win, 'cal')} x={PANE_X - 8} y={310} w={136} /> : <div style={{ position: 'absolute', left: PANE_X - 8, top: 310, width: 136, height: 150, borderRadius: 4, background: 'linear-gradient(180deg, #ffffff, #eef4fc)', boxShadow: `inset 0 0 0 1px ${C.borderLight}` }} />}
      <div style={{ ...small, left: PANE_X - 8, top: 463 }} onPointerDown={(e) => e.button === 0 && set(win, 'type', 'all')}>Of this file type:</div>
      {L('tpic', 479, 'Pictures', 'image', () => set(win, 'type', st.type === 'picture' ? 'all' : 'picture'), st.type === 'picture')}
      <div style={{ position: 'absolute', left: PANE_X + 64, top: 0 }}>{L('tvid', 479, 'Videos', 'wmp-video', () => set(win, 'type', st.type === 'video' ? 'all' : 'video'), st.type === 'video')}</div>
      {L('talb', 497, 'Albums', 'wmp-album', () => set(win, 'type', st.type === 'album' ? 'all' : 'album'), st.type === 'album')}
    </>
  )
}

// ---- grid bar -------------------------------------------------------------------------------
const sel2 = (a, b) => (
  <>
    <span style={{ fontWeight: 500, color: '#6d8db8' }}>{a} </span>
    <span style={{ color: '#8cb8ee' }}>{b}</span>
  </>
)
function DropLabel({ id, x, y, a, b, items }) {
  return (
    <>
      <div
        style={{ position: 'absolute', left: x, top: y, height: 16, display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT, fontSize: 11.5, whiteSpace: 'nowrap' }}
        onPointerDown={(e) => e.button === 0 && dropBelow(id, e.currentTarget, items)}
      >
        {sel2(a, b)}
        <svg width="7" height="4">
          <path d="M0 0 L7 0 L3.5 4 Z" fill="#5a84c4" />
        </svg>
      </div>
      <DropMenu id={id} items={items} />
    </>
  )
}
const RANGES = { time: 'by time taken', name: 'by name', type: 'by type' }
function GridBar({ win, st, y, w }) {
  const range = Object.entries(RANGES).map(([k, l]) => ({ label: l.replace('by ', 'By '), radio: st.range === k, onClick: () => set(win, 'range', k) }))
  const views = [
    { label: 'Thumbnails', radio: st.viewby === 'thumbnail', onClick: () => set(win, 'viewby', 'thumbnail') },
    { label: 'Filmstrip', radio: st.viewby === 'filmstrip', onClick: () => set(win, 'viewby', 'filmstrip') },
  ]
  return (
    <>
      <DropLabel id={wid(win, 'dd.range')} x={AREA_X + 10} y={y} a="range" b={RANGES[st.range]} items={range} />
      <DropLabel id={wid(win, 'dd.view')} x={AREA_X + 175} y={y} a="View" b={`by ${st.viewby}`} items={views} />
      <div onPointerDown={(e) => e.button === 0 && set(win, 'size', st.size > 0.5 ? 0.2 : 0.8)} style={{ position: 'absolute', left: w - 205, top: y, fontFamily: FONT, fontWeight: 500, fontSize: 11.5, color: '#6d8db8' }}>Size</div>
      <Slider id={wid(win, 'size')} x={w - 178} y={y - 4} w={46} variant="wedge" def={0.45} />
    </>
  )
}

// ---- thumbnails --------------------------------------------------------------------------------
const Thumb = memo(function Thumb({ p, tw, th, sel, lit, active, ed }) {
  return (
    <div style={{ position: 'relative', width: tw, height: th }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          boxShadow: sel
            ? `0 0 0 2px ${active ? '#5a9ef0' : '#a9bfdc'}, 0 0 0 4px rgba(190,225,255,0.9), 0 4px 8px rgba(40,70,130,0.35)`
            : lit > 0.5
              ? '0 0 0 1px rgba(120,170,240,0.95), 0 4px 7px rgba(40,70,130,0.3)'
              : '1px 1px 0 rgba(244,243,252,0.95), 0 0 0 0.6px rgba(190,198,222,0.7), 0 3px 5px rgba(50,70,110,0.18)',
          transform: lit > 0.5 && !sel ? 'translateY(-1px)' : undefined,
        }}
      >
        <img src={p.url} alt="" draggable={false} style={{ width: tw, height: th, objectFit: 'cover', display: 'block', ...editStyle(ed) }} />
        {p.kind === 'video' && (
          <>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: 'repeating-linear-gradient(180deg, #1b1f2a 0, #1b1f2a 3px, #e6ecf5 3px, #e6ecf5 5px)' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, background: 'repeating-linear-gradient(180deg, #1b1f2a 0, #1b1f2a 3px, #e6ecf5 3px, #e6ecf5 5px)' }} />
            <svg width="14" height="14" style={{ position: 'absolute', right: 7, bottom: 3 }}>
              <circle cx="7" cy="7" r="6.5" fill="rgba(0,20,60,0.55)" />
              <path d="M5 4 L10.5 7 L5 10 Z" fill="#fff" />
            </svg>
          </>
        )}
      </div>
    </div>
  )
})

const GROUP_HEAD = 24
function layout(groups, tw, th, width) {
  const gap = Math.round(tw * 0.18) + 4
  const cols = Math.max(1, Math.floor((width + gap) / (tw + gap)))
  let y = 0
  const out = groups.map((g) => {
    const rows = Math.ceil(g.photos.length / cols)
    const h = GROUP_HEAD + rows * (th + gap) + 10
    const r = { g, y, h }
    y += h
    return r
  })
  return { blocks: out, total: y, cols, gap }
}

const GroupHead = memo(function GroupHead({ title, caption, w }) {
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: 18, borderRadius: 3, background: 'linear-gradient(90deg, rgba(200,222,250,0.6), rgba(220,234,252,0.2))' }} />
      <div style={{ position: 'absolute', left: 6, top: 2, fontFamily: FONT, fontSize: 11, whiteSpace: 'nowrap' }}>
        <span style={{ color: '#3b6fc0', fontWeight: 500 }}>{title}</span>
        <span style={{ color: '#8cb0e0' }}> | {caption}</span>
      </div>
    </>
  )
})

// One date group: its thumbnails are one element with a background layer per photo (cheap to
// mount and paint), under plain hit cells that carry the frame shadow and the pointer handlers;
// only the hovered, selected, video and edited thumbnails get their own element on top.
const GroupBlock = memo(function GroupBlock({ win, g, width, cols, tw, th, gap, selId, litId, active, edits, onOpen }) {
  const id = wid(win, 'grid')
  const cell = (i) => ({ left: 4 + (i % cols) * (tw + gap), top: GROUP_HEAD + Math.floor(i / cols) * (th + gap) })
  const rows = Math.ceil(g.photos.length / cols)
  return (
    <>
      <div onPointerDown={(e) => e.button === 0 && g.photos[0] && openDetail(win, g.photos[0])}>
        <GroupHead title={g.title} caption={g.caption} w={width} />
      </div>
      <ImageGrid x={4} y={GROUP_HEAD} w={width} h={rows * (th + gap)} urls={g.photos.map((p) => p.url)} tw={tw} th={th} gap={gap} cols={cols} />
      {g.photos.map((p, i) => (
        <div
          key={p.id}
          style={{ position: 'absolute', ...cell(i), width: tw, height: th, boxShadow: '1px 1px 0 rgba(244,243,252,0.95), 0 0 0 0.6px rgba(190,198,222,0.7), 0 3px 5px rgba(50,70,110,0.18)' }}
          onPointerEnter={(e) => emit('hover', { id: id + ':h', key: p.id, on: true, ...pt(e) })}
          onPointerLeave={() => emit('hover', { id: id + ':h', key: p.id, on: false })}
          onPointerDown={(e) => (e.button === 0 || e.button === 2) && valueOf(now(), wid(win, 'photo'), null) !== p.id && set(win, 'photo', p.id)}
          onDoubleClick={() => onOpen(p)}
        />
      ))}
      {g.photos.map((p, i) => {
        const sel = selId === p.id
        const lit = litId === p.id
        const ed = edits.get(p.id)
        if (!sel && !lit && !ed && p.kind !== 'video') return null
        return (
          <div key={'o' + p.id} style={{ position: 'absolute', ...cell(i), pointerEvents: 'none' }}>
            <Thumb p={p} tw={tw} th={th} sel={sel} lit={lit ? 1 : 0} active={active} ed={ed} />
          </div>
        )
      })}
    </>
  )
})

function Grid({ win, t, groups, x, y, w, h, tw, th, active, st, onOpen, edits, stage }) {
  const id = wid(win, 'grid')
  const width = w - 22
  const { blocks, total, cols, gap } = layout(groups, tw, th, width)
  const max = Math.max(0, total - h)
  const pos = Math.min(max, Math.max(0, valueOf(t, id + ':scroll', 0)))
  const lit = hoverKeys(t, id + ':h')
  let litId = null
  for (const [k, v] of lit) if (v > 0.5) litId = k
  const selId = st.photo
  const setScroll = (v) => emit('ui.value', { id: id + ':scroll', value: Math.round(Math.min(max, Math.max(0, v))) })
  const ctx = contextHandler(wid(win, 'ctx'), () => ctxItems(win, valueOf(now(), wid(win, 'photo'), null)))
  let shown = 0
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h }} onWheel={(e) => max > 0 && setScroll(pos + e.deltaY * 0.6)} onContextMenu={ctx}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: width + 4, height: h, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: width, transform: pos ? `translateY(${-pos}px)` : undefined }}>
          {blocks.map(({ g, y: gy, h: gh }) => {
            if (gy + gh < pos - 40 || gy > pos + h + 40) return null
            // the first mount brings the groups in one per frame (the window is still hidden)
            if (shown++ >= stage) return null
            return (
              <div key={g.id} style={{ position: 'absolute', left: 0, top: gy, width }}>
                <GroupBlock win={win} g={g} width={width} cols={cols} tw={tw} th={th} gap={gap} selId={g.photos.some((p) => p.id === selId) ? selId : null} litId={g.photos.some((p) => p.id === litId) ? litId : null} active={active} edits={edits} onOpen={onOpen} />
              </div>
            )
          })}
          {!blocks.length && <div style={{ position: 'absolute', left: 0, width, top: 30, textAlign: 'center', fontFamily: FONT, fontSize: 11, color: C.textDim }}>No pictures match. Clear the filters in the task pane to see everything.</div>}
        </div>
      </div>
      {max > 0 && stage > 0 && <Scrollbar id={id + ':bar'} x={w - 18} y={0} h={h} viewH={h} contentH={total} pos={pos} onScroll={setScroll} t={t} />}
    </div>
  )
}

function ctxItems(win, photo) {
  const p = photo && photoById(photo)
  if (!p) return [{ label: 'View Slide Show', onClick: () => slideshow(null, true) }, { label: 'Create an Album', onClick: () => openWin('album', 'album') }, '-', { label: 'Refresh' }]
  return [
    { label: 'Open', bold: true, onClick: () => openDetail(win, p) },
    { label: 'Edit', onClick: () => openWin('picedit', 'picedit', { photo: p.id }) },
    { label: 'View Slide Show', onClick: () => slideshow(p.id, true) },
    '-',
    { label: 'Print...', onClick: printBox },
    { label: 'Set as Desktop Background', onClick: () => messageBox({ title: 'Display Properties', icon: 'info', text: 'Pictures can be chosen as the desktop background in Display Properties.' }) },
    '-',
    { label: 'Properties', onClick: () => messageBox({ title: `${p.name} Properties`, icon: 'info', text: `${p.name}\nType: ${p.kind === 'video' ? 'Windows Media Video' : 'JPEG Image'}\nSize: ${p.size}\nTaken: ${p.created}` }) },
  ]
}
const openDetail = (win, p) => {
  set(win, 'photo', p.id)
  set(win, 'view', 'detail')
}

// ---- albums --------------------------------------------------------------------------------
const AlbumTile = memo(function AlbumTile({ album, sel }) {
  const ps = album.photos.slice(0, 3).map(photoById).filter(Boolean)
  return (
    <div style={{ position: 'relative', width: 120, height: 110 }}>
      {sel && <div style={{ position: 'absolute', inset: -4, borderRadius: 5, background: C.rowSel, boxShadow: `inset 0 0 0 1px ${C.rowSelEdge}` }} />}
      {ps.map((p, i) => (
        <img key={p.id} src={p.url} alt="" draggable={false} style={{ position: 'absolute', left: 18 + i * 6, top: 8 + i * 4, width: 76, height: 57, objectFit: 'cover', border: '3px solid #fff', boxShadow: '0 2px 5px rgba(30,50,90,0.35)', transform: `rotate(${(i - 1) * 6}deg)` }} />
      ))}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 84, textAlign: 'center', fontFamily: FONT, fontSize: 11, color: '#3a4260' }}>{album.name}</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 98, textAlign: 'center', fontFamily: FONT, fontSize: 9.5, color: '#8b91a6' }}>{album.photos.length} items</div>
    </div>
  )
})
function Albums({ win, t, x, y, w, h }) {
  const { albums } = library(t)
  const sel = valueOf(t, wid(win, 'albumsel'), null)
  if (!albums.length)
    return (
      <div style={{ position: 'absolute', left: x, top: y + 30, width: w, textAlign: 'center', fontFamily: FONT, fontSize: 11, color: C.textDim }}>
        No albums yet. Click <b>Create an Album</b> to make one.
      </div>
    )
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden' }}>
      {albums.map((a, i) => (
        <div key={a.id} style={{ position: 'absolute', left: 10 + (i % 4) * 136, top: 10 + Math.floor(i / 4) * 124 }} onPointerDown={() => set(win, 'albumsel', a.id)} onDoubleClick={() => slideshow(a.photos[0], true, a.photos)}>
          <AlbumTile album={a} sel={sel === a.id} />
        </div>
      ))}
    </div>
  )
}

// ---- detail view ---------------------------------------------------------------------------
const lbl = { fontFamily: FONT, fontSize: 10.5, color: '#8b91a6', whiteSpace: 'nowrap' }
const val = { fontFamily: FONT, fontSize: 10.5, color: '#4a7fd0', lineHeight: '14px' }

const DetailInfo = memo(function DetailInfo({ p, w }) {
  const row = (y, label, value, h) => (
    <div key={label} style={{ position: 'absolute', left: 505, top: y, width: w - 520, display: 'flex', gap: 8 }}>
      <div style={{ ...lbl, width: 62, flex: 'none' }}>{label}</div>
      <div style={{ ...val, color: h ? '#4a7fd0' : '#4a5068' }}>{value}</div>
    </div>
  )
  return (
    <>
      {row(20, 'Comments:', `< ${p.comment} >`, true)}
      {row(80, 'Keywords ▾', `< ${p.keywords.join(', ')} >`, true)}
      {row(118, 'Location:', p.location)}
      <div style={{ position: 'absolute', left: 505, top: 140, ...val }}>Show me more pictures taken at this location</div>
      {row(170, 'Stored in:', '\\\\Family Computer\\my pictures')}
      {row(186, 'Creator', 'Sondra')}
      {row(202, 'Size:', p.size)}
      {row(218, 'Date Created:', p.created)}
    </>
  )
})

function Detail({ win, t, st, list, w, edits }) {
  const p = list.find((x) => x.id === st.photo) || photoById(st.photo) || list[0]
  if (!p) return null
  const i = list.findIndex((x) => x.id === p.id)
  const step = (d) => {
    const n = list[(i + d + list.length) % list.length]
    if (n) set(win, 'photo', n.id)
  }
  const ed = edits.get(p.id)
  const playE = lastPlay(t, win, p.id)
  return (
    <>
      <div style={{ position: 'absolute', left: 187, top: 8, fontFamily: HEAVY, fontSize: 16, color: '#2c6cc4', whiteSpace: 'nowrap' }}>{p.name}</div>
      <div style={{ position: 'absolute', left: 187, top: 32, width: 286, height: 215, overflow: 'hidden', background: '#000', boxShadow: '0 0 0 1px #c5d3e8, 0 5px 10px rgba(40,70,130,0.3)' }}>
        <img src={p.url} alt="" draggable={false} style={{ width: 286, height: 215, objectFit: 'cover', display: 'block', ...editStyle(ed) }} />
        {p.kind === 'video' && <VideoBar t={t} e={playE} len={p.length} />}
      </div>
      <Button id={wid(win, 'prev')} variant="flat" x={296} y={252} w={22} h={18} onClick={() => step(-1)}>
        <span style={{ color: '#5a84c4' }}>{'◂'}</span>
      </Button>
      <Button id={wid(win, 'next')} variant="flat" x={320} y={252} w={22} h={18} onClick={() => step(1)}>
        <span style={{ color: '#5a84c4' }}>{'▸'}</span>
      </Button>
      {p.kind === 'video' && (
        <Button id={wid(win, 'play')} x={187} y={252} w={60} h={20} label={playE?.on ? 'Pause' : 'Play'} onClick={() => emit('pics.play', { id: win.id, photo: p.id, on: !playE?.on })} />
      )}
      <Button id={wid(win, 'edit')} x={426} y={252} w={48} h={20} label="Edit" onClick={() => openWin('picedit', 'picedit', { photo: p.id })} />
      <DetailInfo p={p} w={w} />
      <div
        style={{ position: 'absolute', right: 20, top: 2, fontFamily: FONT, fontSize: 11, color: '#8aa6d2' }}
        onPointerDown={(e) => e.button === 0 && set(win, 'view', 'browse')}
      >
        overview {'▾'}
      </div>
    </>
  )
}
// silent video playback: the position runs while 'pics.play' is on
function lastPlay(t, win, photo) {
  const [a, i] = find(t, 'pics.play', win.id)
  for (let j = i; j >= 0; j--) if (a[j].photo === photo) return a[j]
  return null
}
function VideoBar({ t, e, len }) {
  const total = +len.split(':')[1] + 60 * +len.split(':')[0]
  let pos = 0
  if (e) pos = e.on ? (t - e.t) % total : 0
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 18, background: 'linear-gradient(180deg, rgba(20,40,80,0.2), rgba(10,25,60,0.75))' }}>
      <div style={{ position: 'absolute', left: 8, top: 8, width: 210, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.3)' }}>
        <div style={{ width: `${(pos / total) * 100}%`, height: 3, borderRadius: 2, background: '#7fc0ff' }} />
      </div>
      <div style={{ position: 'absolute', right: 8, top: 2, fontFamily: FONT, fontSize: 10, color: '#cfe6ff' }}>
        0:{String(Math.floor(pos)).padStart(2, '0')} / {len}
      </div>
    </div>
  )
}

// ---- the window --------------------------------------------------------------------------------
function Pictures({ win, t, w, h, active }) {
  const st0 = picState(t, win)
  // opened on a photo from elsewhere (my Documents, Search): the latest win.open with props.photo
  const st = viewOf(t, win, st0)
  // first mount in stages, while the open is still hidden behind the beam: header and pane,
  // then a date group per frame, then the calendar
  const age = (t - win.openedAt) * FPS
  const stage = age < 1.5 ? 0 : Math.floor(age - 0.5)
  useFindFocus(t, win)
  const { edits } = library(t)
  const hide = taskHidden(t, win)
  const groups = st.type === 'album' ? [] : visibleGroups(st)
  const list = groups.flatMap((g) => g.photos)
  const tw = Math.round(40 + st.size * 40)
  const th = Math.round(tw * 0.75)
  const detail = st.view === 'detail'
  const areaX = hide ? 20 : AREA_X
  const barY = detail ? 288 : 206
  const gridY = barY + 22
  const statusH = 20
  // (stable while the window record is: the date groups are memoised on it)
  const onOpen = useCallback((p) => openDetail(win, p), [win])
  const selCount = st.photo ? 1 : 0
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body, overflow: 'hidden' }}>
      {!detail && !hide && <Header win={win} t={t} />}
      {!detail && hide && <Title rel={toRel(t, openT(win))} />}
      {detail && <Detail win={win} t={t} st={st} list={list.length ? list : PHOTOS} w={w} edits={edits} />}
      {!hide && <TaskPane win={win} t={t} st={st} calendar={stage >= 3} />}
      <GridBar win={win} st={st} y={barY} w={w} />
      {st.type === 'album' ? (
        <Albums win={win} t={t} x={areaX} y={gridY} w={w - areaX - 10} h={h - gridY - statusH} />
      ) : (
        <Grid win={win} t={t} groups={detail ? groups.filter((g) => g.photos.some((p) => p.id === st.photo)) : groups} x={areaX} y={gridY} w={w - areaX - 8} h={h - gridY - statusH} tw={tw} th={th} active={active} st={st} onOpen={onOpen} edits={edits} stage={stage} />
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, top: h - statusH, height: statusH, lineHeight: `${statusH}px`, textAlign: 'center', fontFamily: FONT, fontWeight: 500, fontSize: 11, color: '#7f8db0' }}>
        <span onPointerDown={(e) => e.button === 0 && clearFilters(win)}>{selCount ? '1 object selected' : `${list.length} objects`}</span>
      </div>
      <ContextMenu id={wid(win, 'ctx')} items={() => ctxItems(win, valueOf(now(), wid(win, 'photo'), null))} />
    </div>
  )
}
// the chrome's File / Edit / View / Help / Favorites (os/ExplorerChrome draws them)
function pictureMenus(win, t) {
  const st = viewOf(t, win, picState(t, win))
  const list = st.type === 'album' ? [] : visibleGroups(st).flatMap((g) => g.photos)
  const detail = st.view === 'detail'
  return {
    File: [
      { label: 'Open', disabled: !st.photo, onClick: () => st.photo && openDetail(win, photoById(st.photo)) },
      { label: 'Edit', disabled: !st.photo, onClick: () => openWin('picedit', 'picedit', { photo: st.photo }) },
      '-',
      { label: 'Create an Album...', onClick: () => openWin('album', 'album') },
      { label: 'Print...', onClick: printBox },
      '-',
      { label: 'Close', onClick: () => emit('win.close', { id: win.id }) },
    ],
    Edit: [{ label: 'Select All', disabled: true }, { label: 'Clear Filters', onClick: () => clearFilters(win) }],
    View: [
      { label: 'Overview', radio: !detail, onClick: () => set(win, 'view', 'browse') },
      { label: 'Detail', radio: detail, disabled: !list.length, onClick: () => list.length && openDetail(win, photoById(st.photo) || list[0]) },
      '-',
      { label: 'Slide Show', onClick: () => slideshow(st.photo, true) },
    ],
    Help: [{ label: 'Help and Support Center', onClick: () => openWin('help', 'help', { topic: 'pictures' }) }, '-', { label: 'About Windows', onClick: () => openWin('about', 'about') }],
    Favorites: [{ label: 'MSN Photos', onClick: () => openUrl('photos.msn.com') }, { label: 'ofoto.com', onClick: () => openUrl('www.ofoto.com') }],
  }
}

// the view: the latest of the window's own view changes, a win.open on a photo (my Documents,
// Search) and the chrome's Up a Folder (back to the overview) / Preview (detail of the selection)
function viewOf(t, win, st0) {
  let best = valueOfE(t, wid(win, 'view'))
  let st = st0
  const [oa, oi] = find(t, 'win.open', win.id)
  const oe = oi >= 0 && oa[oi].t >= win.openedAt && oa[oi].props?.photo ? oa[oi] : null
  if (oe && (!best || oe.t > best.t)) {
    best = oe
    st = { ...st0, view: 'detail', photo: oe.props.photo }
  }
  const [ca, ci] = find(t, 'explorer.command', win.id)
  for (let j = ci; j >= 0 && ca[j].t >= win.openedAt; j--) {
    const c = ca[j]
    if (c.command !== 'up' && c.command !== 'preview') continue
    if (!best || c.t > best.t) {
      if (c.command === 'up') st = { ...st, view: 'browse' }
      else st = { ...st, view: st.view === 'detail' ? 'browse' : 'detail', photo: st.photo || PHOTOS[0].id }
    }
    break
  }
  return st
}
// Find (chrome command): the keyboard goes to "Containing the words"; Folders opens my Documents
function useFindFocus(t, win) {
  const [ca, ci] = find(t, 'explorer.command', win.id)
  const last = ci >= 0 && ca[ci].t >= win.openedAt ? ca[ci] : null
  const key = last ? last.t : null
  useEffect(() => {
    if (!last || now() - last.t > 0.5) return
    if (last.command === 'find') focusField(wid(win, 'words'))
    else if (last.command === 'folders') openWin('documents', 'documents', { go: ['my Computer', 'my Documents'] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
function videoPlaying(win, t) {
  const [a, i] = find(t, 'pics.play', win.id)
  return i >= 0 && a[i].t >= win.openedAt && a[i].on
}
function valueOfE(t, id) {
  const [a, i] = find(t, 'ui.value', id)
  return i >= 0 ? a[i] : null
}
function taskHidden(t, win) {
  const [a, i] = find(t, 'explorer.command', win.id)
  let n = 0
  for (let j = 0; j <= i; j++) if (a[j].t >= win.openedAt && a[j].command === 'hide') n++
  return n % 2 === 1
}
function clearFilters(win) {
  set(win, 'tag', null)
  set(win, 'type', 'all')
  emit('ui.value', { id: wid(win, 'words'), value: { text: '', a: 0, b: 0, sx: 0, sy: 0 } })
  emit('ui.value', { id: wid(win, 'cal'), value: { level: 'days', y: 2002, m: 4, sel: null } })
}

const pictures = {
  id: 'pictures',
  title: () => 'my Pictures & Videos',
  taskbarLabel: () => 'my Pictures & Videos',
  icon: null,
  size: { w: 777, h: 654 },
  position: { x: 45, y: 23 },
  minSize: { w: 700, h: 560 },
  explorer: {
    crumbs: ['my Stuff', 'my Pictures & Videos'],
    search: 'search for…',
    commands: [
      { id: 'hide', label: 'Hide Picture Tasks', icon: 'hide' },
      { id: 'up', label: 'Up a Folder', icon: 'up' },
      { id: 'folders', label: 'Folders', icon: 'folders' },
      { id: 'find', label: 'Find', icon: 'find' },
      { id: 'preview', label: 'Preview', icon: 'preview' },
    ],
    pressed: (win, t) => (viewOf(t, win, picState(t, win)).view === 'detail' ? 'preview' : null),
    crumbs: (win, t) => {
      const st = viewOf(t, win, picState(t, win))
      const p = st.view === 'detail' && photoById(st.photo)
      return p ? ['my Pictures & Videos', p.name] : ['my Stuff', 'my Pictures & Videos']
    },
    menus: (win, t) => pictureMenus(win, t),
  },
  Content: scoped(Pictures, { watch: ['pics'], alive: (win, t) => videoPlaying(win, t), until: introEnd }),
  Overlay: PicturesOverlay,
  usesActive: true, // Content draws differently when the window isn't active
  liveTime: (win, t, base) => (win.state === 'open' && videoPlaying(win, t) ? t : Math.max(base, Math.min(t, introEnd(win)))),
  // what a motion-blur copy shows: my Music's header intro shots (music/index.jsx snapshot), and
  // any later change of the window `settle` s after its event
  snapshot: (win, tk, ev, settle) => {
    const t0 = openT(win)
    let best = t0 + INTRO_SHOTS[0] / FPS
    for (const f of INTRO_SHOTS) if (t0 + f / FPS <= tk) best = t0 + f / FPS
    return Math.max(best, ev + settle)
  },
}
export default pictures
