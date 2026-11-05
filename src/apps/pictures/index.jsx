// my Pictures & Videos (design from the second reference video, ref2 f00600 / f01060): the my
// Music window's layout for pictures. Header with a framed photo and "Windows my Pictures &
// Videos", task pane (enjoy pictures, find pictures, Refine By Date calendar, file types),
// date-grouped thumbnails, a detail view per photo (comments, keywords, location, Edit),
// albums, and the full-screen slide show (app 'slideshow').
import { memo, useEffect } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import {
  scoped, wid, valueOf, hoverKeys, pt, TextField, Slider, Scrollbar, DropMenu, dropBelow, ContextMenu, contextHandler, Button, C, FONT, HEAVY, find, focusField,
} from '../../ui/index.js'
import { MessageIcon } from '../../ui/Dialog.jsx'
import { Ico } from '../lib/icons.jsx'
import { ChromeMenu } from '../lib/Explorer.jsx'
import { getApp } from '../../os/apps.js'
import { openWin, openUrl, messageBox } from '../lib/common.js'
import { PHOTOS, photoById, TAGS, photoUrl } from '../lib/pictures.jsx'
import { picState, visibleGroups, library, editStyle } from './state.js'
import { Calendar } from './Calendar.jsx'

const PANE_X = 33
const AREA_X = 190

const set = (win, n, value) => emit('ui.value', { id: wid(win, n), value })

// ---- header ------------------------------------------------------------------------------------
// the my Music header's soft swoosh behind the title (own copy: window-local px, svg y = local - 123)
const Swoosh = memo(function Swoosh() {
  return (
    <svg width="777" height="260" style={{ position: 'absolute', left: 0, top: 123, overflow: 'visible', pointerEvents: 'none' }}>
      <defs>
        <radialGradient id="pv-ring" cx="0.5" cy="0.5" r="0.5" fx="0.3" fy="0.52">
          <stop offset="0.45" stopColor="#f2fdff" stopOpacity="0" />
          <stop offset="0.66" stopColor="#d4f9ff" stopOpacity="0.75" />
          <stop offset="0.8" stopColor="#a9eaff" stopOpacity="0.95" />
          <stop offset="0.92" stopColor="#6ea8ef" stopOpacity="1" />
          <stop offset="0.97" stopColor="#c4dbfa" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pv-ringmask-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.54" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="pv-ringmask" maskUnits="userSpaceOnUse" x="0" y="-50" width="777" height="360">
          <rect x="0" y="-50" width="777" height="360" fill="url(#pv-ringmask-g)" />
        </mask>
        <filter id="pv-b5" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="pv-b12" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <ellipse cx="430" cy="27" rx="95" ry="26" fill="#efe4ec" filter="url(#pv-b12)" />
      <ellipse cx="485" cy="107" rx="115" ry="42" fill="#fde0e0" filter="url(#pv-b12)" />
      <g mask="url(#pv-ringmask)">
        <ellipse cx="541" cy="101" rx="136" ry="80" fill="url(#pv-ring)" transform="rotate(-8 541 101)" />
      </g>
      <ellipse cx="390" cy="105" rx="115" ry="9" fill="#f0a39a" filter="url(#pv-b5)" opacity="0.85" />
    </svg>
  )
})
const FRAME_PHOTO = photoUrl('mountain', 31)

const Frame = memo(function Frame() {
  const face = (
    <div style={{ position: 'absolute', inset: 0, borderRadius: 6, background: 'linear-gradient(135deg, #f7fbff 0, #c9d5e6 40%, #eef3fa 60%, #a9b8cc 100%)', boxShadow: 'inset 0 0 0 1px #8796ad, 0 0 0 1px rgba(255,255,255,0.6)' }}>
      <div style={{ position: 'absolute', left: 9, top: 9, right: 9, bottom: 9, boxShadow: 'inset 0 0 0 1px #7d8aa3' }}>
        <img src={FRAME_PHOTO} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(125deg, rgba(255,255,255,0.45) 0, rgba(255,255,255,0) 40%)' }} />
      </div>
    </div>
  )
  const tf = 'perspective(500px) rotateY(24deg) rotateX(4deg) rotateZ(-2deg)'
  return (
    <>
      <div style={{ position: 'absolute', left: 168, top: 18, width: 118, height: 132, transform: tf, transformOrigin: '50% 100%' }}>
        {face}
        <div style={{ position: 'absolute', left: 40, top: 118, width: 50, height: 18, background: 'linear-gradient(180deg, #b9c6d8, #8796ad)', clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0 100%)', opacity: 0.8 }} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 168,
          top: 150,
          width: 118,
          height: 132,
          transform: tf + ' scaleY(-1)',
          transformOrigin: '50% 0',
          opacity: 0.22,
          WebkitMaskImage: 'linear-gradient(180deg, transparent 55%, #000 100%)',
          maskImage: 'linear-gradient(180deg, transparent 55%, #000 100%)',
        }}
      >
        {face}
      </div>
    </>
  )
})

const Projector = () => (
  <svg width="34" height="30" viewBox="0 0 34 30">
    <defs>
      <linearGradient id="pv-pj" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f2f5fa" />
        <stop offset="1" stopColor="#8a96a8" />
      </linearGradient>
      <radialGradient id="pv-lens" cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#cfe6ff" />
        <stop offset="0.6" stopColor="#2b4f86" />
        <stop offset="1" stopColor="#0d1a33" />
      </radialGradient>
    </defs>
    <rect x="3" y="9" width="26" height="15" rx="4" fill="url(#pv-pj)" stroke="#6f7f99" strokeWidth="0.8" />
    <circle cx="11" cy="16.5" r="6" fill="url(#pv-lens)" stroke="#55627a" strokeWidth="0.8" />
    <rect x="20" y="13" width="6" height="2" rx="1" fill="#9aa7bd" />
    <circle cx="9" cy="6" r="4" fill="#dfe6f1" stroke="#6f7f99" strokeWidth="0.7" />
    <circle cx="20" cy="6" r="4" fill="#dfe6f1" stroke="#6f7f99" strokeWidth="0.7" />
  </svg>
)
const AlbumIcon = () => (
  <svg width="34" height="30" viewBox="0 0 34 30">
    <rect x="6" y="4" width="22" height="24" rx="2" fill="#3a5f9c" stroke="#1d3a6c" strokeWidth="0.8" />
    <rect x="9" y="7" width="16" height="12" fill="#fff" />
    <image href={photoUrl('beach', 2)} x="10" y="8" width="14" height="10" preserveAspectRatio="xMidYMid slice" />
    <rect x="9" y="21" width="16" height="2" rx="1" fill="#9fb7da" />
    <path d="M6 6 Q4 6 4 8 V26 Q4 28 6 28" fill="none" stroke="#c9d3e2" strokeWidth="1.5" />
  </svg>
)

const btnLabel = (a, b) => (
  <>
    <span style={{ fontWeight: 500, color: '#3d63a6' }}>{a} </span>
    <span style={{ color: '#6e8ec8' }}>{b}</span>
  </>
)

function HeaderButton({ id, x, icon, a, b, onClick }) {
  return (
    <Button id={id} variant="flat" x={x} y={104} w={92} h={58} onClick={onClick}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ height: 32, display: 'flex', alignItems: 'flex-end' }}>{icon}</div>
        <div style={{ fontFamily: FONT, fontSize: 11.5 }}>{btnLabel(a, b)}</div>
      </div>
    </Button>
  )
}

const Title = memo(function Title() {
  return (
    <>
      <div style={{ position: 'absolute', left: 324, top: 26, fontFamily: FONT, fontSize: 13, color: '#4f86d6' }}>Windows</div>
      <div style={{ position: 'absolute', left: 322, top: 38, fontFamily: FONT, fontSize: 31, fontWeight: 300, color: '#86b4ea', whiteSpace: 'nowrap', letterSpacing: -0.4 }}>
        my <span style={{ fontWeight: 400, color: '#2c6cc4' }}>Pictures &amp; Videos</span>
      </div>
    </>
  )
})

function Header({ win }) {
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: -123 }}>
        <Swoosh />
      </div>
      <Frame />
      <Title />
      <HeaderButton id={wid(win, 'hb.show')} x={318} icon={<Projector />} a="View" b="Slide Show" onClick={() => slideshow(null, true)} />
      <HeaderButton id={wid(win, 'hb.album')} x={418} icon={<AlbumIcon />} a="Create" b="Album" onClick={() => openWin('album', 'album')} />
      <HeaderButton id={wid(win, 'hb.dvd')} x={518} icon={<MessageIcon kind="cd" size={30} />} a="Burn" b="DVD" onClick={() => openWin('burncd', 'burncd', { what: 'dvd' })} />
    </>
  )
}

const slideshow = (photo, auto = false, album = null) => openWin('slideshow', 'slideshow', { photo, auto, album })
const printBox = () => messageBox({ title: 'Print Pictures', icon: 'warning', text: 'Windows cannot print because no printer is installed.\nTo add a printer, open Printers and Faxes in Control Panel.' })

// ---- task pane ---------------------------------------------------------------------------------
function Link({ id, children, x, y, onClick, on, t }) {
  const lit = hoverKeys(t, id).get(0) || 0
  return (
    <div
      style={{ position: 'absolute', left: x, top: y, height: 17, display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT, fontSize: 11, whiteSpace: 'nowrap', color: on ? C.link : lit > 0.5 ? C.link : C.textDark, fontWeight: on ? 560 : 400, textDecoration: lit > 0.5 ? 'underline' : 'none' }}
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

function TaskPane({ win, t, st }) {
  const L = (n, y, label, icon, fn, on) => (
    <Link key={n} id={wid(win, 'tp.' + n)} x={PANE_X - 8} y={y} onClick={fn} on={on} t={t}>
      {icon !== undefined && <span style={{ width: 16, height: 16, display: 'inline-block' }}>{icon && <Ico kind={icon} size={16} />}</span>}
      {label}
    </Link>
  )
  const tags = st.moreTags ? TAGS.slice(3) : TAGS.slice(0, 3)
  return (
    <>
      <Head a="enjoy" b="pictures" y={8} />
      {L('show', 32, 'View Slide show', 'display', () => slideshow(null, true))}
      {L('album', 50, 'Create an Album', 'picture', () => openWin('album', 'album'))}
      {L('dvd', 68, 'Burn DVD', 'cd', () => openWin('burncd', 'burncd', { what: 'dvd' }))}
      {L('share', 86, 'Share Pictures', 'shared', () => openWin('sharemusic', 'sharemusic', { folder: 'my Pictures & Videos' }))}
      {L('print', 104, 'Print Pictures', 'print', printBox)}
      <Head a="find" b="pictures" y={132} />
      <div style={{ ...small, left: PANE_X - 8, top: 155 }}>Containing the words:</div>
      <TextField id={wid(win, 'words')} x={PANE_X - 8} y={170} w={136} h={17} size={10.5} pad={4} />
      <div style={{ ...small, left: PANE_X - 8, top: 194 }}>Show all images by:</div>
      {tags.map((tg, i) => L('tag' + tg, 209 + i * 16, tg, undefined, () => set(win, 'tag', st.tag === tg ? null : tg), st.tag === tg))}
      {L('more', 257, st.moreTags ? 'Back...' : 'More...', undefined, () => set(win, 'moretags', !st.moreTags))}
      <div style={{ ...small, left: PANE_X - 8, top: 282 }}>Refine By Date:</div>
      <Calendar id={wid(win, 'cal')} x={PANE_X - 8} y={297} w={136} />
      <div style={{ ...small, left: PANE_X - 8, top: 450 }}>Of this file type:</div>
      {L('tpic', 466, 'Pictures', 'picture', () => set(win, 'type', st.type === 'picture' ? 'all' : 'picture'), st.type === 'picture')}
      <div style={{ position: 'absolute', left: PANE_X + 64, top: 0 }}>{L('tvid', 466, 'Videos', 'display', () => set(win, 'type', st.type === 'video' ? 'all' : 'video'), st.type === 'video')}</div>
      {L('talb', 484, 'Albums', 'folder', () => set(win, 'type', st.type === 'album' ? 'all' : 'album'), st.type === 'album')}
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
      <div style={{ position: 'absolute', left: w - 205, top: y, fontFamily: FONT, fontWeight: 500, fontSize: 11.5, color: '#6d8db8' }}>Size</div>
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

function Grid({ win, t, groups, x, y, w, h, tw, th, active, st, onOpen, edits }) {
  const id = wid(win, 'grid')
  const width = w - 22
  const { blocks, total, cols, gap } = layout(groups, tw, th, width)
  const max = Math.max(0, total - h)
  const pos = Math.min(max, Math.max(0, valueOf(t, id + ':scroll', 0)))
  const lit = hoverKeys(t, id + ':h')
  const selId = st.photo
  const setScroll = (v) => emit('ui.value', { id: id + ':scroll', value: Math.round(Math.min(max, Math.max(0, v))) })
  const ctx = contextHandler(wid(win, 'ctx'), () => ctxItems(win, valueOf(now(), wid(win, 'photo'), null)))
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h }} onWheel={(e) => max > 0 && setScroll(pos + e.deltaY * 0.6)} onContextMenu={ctx}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: width + 4, height: h, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: width, transform: pos ? `translateY(${-pos}px)` : undefined }}>
          {blocks.map(({ g, y: gy, h: gh }) =>
            gy + gh < pos - 40 || gy > pos + h + 40 ? null : (
              <div key={g.id} style={{ position: 'absolute', left: 0, top: gy, width }}>
                <GroupHead title={g.title} caption={g.caption} w={width} />
                {g.photos.map((p, i) => (
                  <div
                    key={p.id}
                    style={{ position: 'absolute', left: 4 + (i % cols) * (tw + gap), top: GROUP_HEAD + Math.floor(i / cols) * (th + gap) }}
                    onPointerEnter={(e) => emit('hover', { id: id + ':h', key: p.id, on: true, ...pt(e) })}
                    onPointerLeave={() => emit('hover', { id: id + ':h', key: p.id, on: false })}
                    onPointerDown={(e) => (e.button === 0 || e.button === 2) && valueOf(now(), wid(win, 'photo'), null) !== p.id && set(win, 'photo', p.id)}
                    onDoubleClick={() => onOpen(p)}
                  >
                    <Thumb p={p} tw={tw} th={th} sel={selId === p.id} lit={lit.get(p.id) || 0} active={active} ed={edits.get(p.id)} />
                  </div>
                ))}
              </div>
            ),
          )}
          {!blocks.length && <div style={{ position: 'absolute', left: 0, width, top: 30, textAlign: 'center', fontFamily: FONT, fontSize: 11, color: C.textDim }}>No pictures match. Clear the filters in the task pane to see everything.</div>}
        </div>
      </div>
      {max > 0 && <Scrollbar id={id + ':bar'} x={w - 18} y={0} h={h} viewH={h} contentH={total} pos={pos} onScroll={setScroll} t={t} />}
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
  const p = photoById(st.photo) || list[0]
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
  const onOpen = (p) => openDetail(win, p)
  const selCount = st.photo ? 1 : 0
  const menus = {
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
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body, overflow: 'hidden' }}>
      {!detail && !hide && <Header win={win} />}
      {!detail && hide && <Title />}
      {detail && <Detail win={win} t={t} st={st} list={list.length ? list : PHOTOS} w={w} edits={edits} />}
      {!hide && <TaskPane win={win} t={t} st={st} />}
      <GridBar win={win} st={st} y={barY} w={w} />
      {st.type === 'album' ? (
        <Albums win={win} t={t} x={areaX} y={gridY} w={w - areaX - 10} h={h - gridY - statusH} />
      ) : (
        <Grid win={win} t={t} groups={detail ? groups.filter((g) => g.photos.some((p) => p.id === st.photo)) : groups} x={areaX} y={gridY} w={w - areaX - 8} h={h - gridY - statusH} tw={tw} th={th} active={active} st={st} onOpen={onOpen} edits={edits} />
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, top: h - statusH, height: statusH, lineHeight: `${statusH}px`, textAlign: 'center', fontFamily: FONT, fontWeight: 500, fontSize: 11, color: '#7f8db0' }}>
        {selCount ? '1 object selected' : `${list.length} objects`}
      </div>
      <ContextMenu id={wid(win, 'ctx')} items={() => ctxItems(win, valueOf(now(), wid(win, 'photo'), null))} />
      <ChromeMenu win={win} t={t} menus={menus} app={getApp('pictures')} />
    </div>
  )
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

export default {
  id: 'pictures',
  title: () => 'my Pictures & Videos',
  taskbarLabel: () => 'My Pictures & Videos',
  icon: null,
  size: { w: 777, h: 654 },
  position: { x: 45, y: 23 },
  minSize: { w: 700, h: 560 },
  explorer: {
    crumbs: ['my Stuff', 'my Pictures & Videos'],
    search: 'search my for...',
    commands: [
      { id: 'hide', label: 'Hide Picture Tasks', icon: 'hide' },
      { id: 'up', label: 'Up a Folder', icon: 'up' },
      { id: 'folders', label: 'Folders', icon: 'folders' },
      { id: 'find', label: 'Find', icon: 'find' },
      { id: 'preview', label: 'Preview', icon: 'preview' },
    ],
    pressed: () => 'preview',
  },
  Content: scoped(Pictures, { watch: ['pics'], alive: (win, t) => videoPlaying(win, t) }),
  liveTime: (win, t, base) => (videoPlaying(win, t) ? t : base),
}
