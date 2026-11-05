// The my Music album view: thumbnails (the video's grid), tiles or details, scrolled in a clipped
// view with the window's own scrollbar. Hover and selection come from the event log; the
// selected thumbnail becomes a blue glass frame that pops (tilt, grow, settle) when clicked.
import { memo, useRef } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { toStage } from '../../core/Stage.jsx'
import { Txt, abs, HEAVY } from '../../os/text.jsx'
import { setValue, wid, valueOf } from '../../ui/index.js'
import { table, toRel } from './timeline.js'
import { gridScroll } from './layout.js'

const hoverOn = (key) => () => emit('hover', { id: 'music.album.' + key, on: true })
const hoverOff = (key) => () => emit('hover', { id: 'music.album.' + key, on: false })
// the video's tiles keep their numeric ids (the demo's 'music.album' { id: 10 } is Tweet)
const albumEventId = (a) => (a.video != null ? a.video : a.key)
const click = (a) => (e) => {
  e.stopPropagation()
  emit('music.album', { id: albumEventId(a) })
}
// double-click plays the album (silently, through os/media.js)
const play = (a) => (e) => {
  e.stopPropagation()
  emit('media.play', { playlist: a.tracks.map((tr) => ({ title: `${a.artist} - ${tr.title}`, duration: tr.duration })), track: 0 })
}

function Cover({ album, size }) {
  return <img src={album.url} width={size} height={size} alt="" draggable={false} style={{ display: 'block' }} />
}

const shadow = (hover) =>
  hover
    ? '1.5px 1.5px 0 rgba(246,248,255,0.95), 0 0 0 1px rgba(120,170,240,0.85), 0 5px 8px rgba(40,70,130,0.35)'
    : '1.5px 1.5px 0 rgba(244,243,252,0.95), 0 0 0 0.6px rgba(190,198,222,0.7), 0 5px 7px rgba(50,70,110,0.2)'

const Thumb = memo(function Thumb({ album, x, y, s, hover }) {
  return (
    <div
      data-album={album.key}
      onPointerEnter={hoverOn(album.key)}
      onPointerLeave={hoverOff(album.key)}
      onClick={click(album)}
      onDoubleClick={play(album)}
      style={{
        position: 'absolute', left: x, top: y, width: s, height: s,
        boxShadow: shadow(hover), transform: hover ? 'translateY(-1px)' : undefined,
      }}
    >
      <Cover album={album} size={s} />
    </div>
  )
})

// selected tile pop, frames after the click: [rel, scale, rotateX, rotateY (deg)]
const POP = table([
  [0, 1, 0, 0],
  [0.5, 1.07, -6, 8],
  [1.5, 1.02, 4, -6],
  [2.5, 0.98, 8, 5],
  [3.5, 1.1, 2, -4],
  [4.5, 1.25, -2, 2],
  [5.5, 1.28, -1, 1],
  [6.5, 1.16, 0, 0],
  [7.5, 1.04, 0, 0],
  [8.5, 1, 0, 0],
])
const POP_END = 9

const SelectedBody = memo(function SelectedBody({ album, s }) {
  const f = s + 9 // frame: 58 px around a 49 px cover
  return (
    <div
      style={{
        position: 'absolute', left: -6 * (s / 49), top: -5 * (s / 49), width: f, height: f, boxSizing: 'border-box',
        borderRadius: 3, padding: 6 * (s / 49) || 6,
        background: 'linear-gradient(160deg, #e9f6ff 0%, #a9d4ff 35%, #c8e6ff 70%, #eef8ff 100%)',
        boxShadow: '0 0 0 1px rgba(150,190,235,0.9), 0 4px 8px rgba(40,80,160,0.35), inset 0 0 0 1px rgba(255,255,255,0.7)',
      }}
    >
      <div style={{ position: 'relative', width: s - 3, height: s - 3, overflow: 'hidden' }}>
        <Cover album={album} size={s - 3} />
        {/* blue glass over the cover (fitted on the reference: ~50% of rgb(30, 95, 170)) */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(30, 95, 170, 0.48)' }} />
      </div>
    </div>
  )
})

function SelectedThumb({ album, x, y, s, t, selT, hover }) {
  const rel = toRel(t, selT)
  const box = { position: 'absolute', left: x, top: y, width: s, height: s, transformOrigin: '50% 50%' }
  const handlers = { onPointerEnter: hoverOn(album.key), onPointerLeave: hoverOff(album.key), onClick: click(album), onDoubleClick: play(album) }
  if (rel >= POP_END || rel < 0) {
    return (
      <div {...handlers} style={{ ...box, transform: hover ? 'translateY(-1px)' : undefined }}>
        <SelectedBody album={album} s={s} />
      </div>
    )
  }
  const n = 6
  const layers = []
  for (let k = 0; k < n; k++) {
    const [sc, rx, ry] = POP(rel + 0.8 * ((k + 0.5) / n - 0.5))
    layers.push(
      <div key={k} style={{ ...box, transform: `perspective(260px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${sc})`, opacity: 1 / n, mixBlendMode: 'plus-lighter' }}>
        <SelectedBody album={album} s={s} />
      </div>,
    )
  }
  return (
    <div {...handlers} style={{ position: 'absolute', left: 0, top: 0, isolation: 'isolate' }}>
      {layers}
    </div>
  )
}

// tiles view: cover + title, artist, year
const TileRow = memo(function TileRow({ album, x, y, s, hover, selected }) {
  return (
    <div
      data-album={album.key}
      onPointerEnter={hoverOn(album.key)}
      onPointerLeave={hoverOff(album.key)}
      onClick={click(album)}
      onDoubleClick={play(album)}
      style={{
        position: 'absolute', left: x - 3, top: y - 3, width: s + 146, height: s + 6, borderRadius: 4,
        background: selected ? 'rgba(90,150,235,0.28)' : hover ? 'rgba(150,190,240,0.18)' : undefined,
        boxShadow: selected ? 'inset 0 0 0 1px rgba(80,140,225,0.6)' : undefined,
      }}
    >
      <div style={{ position: 'absolute', left: 3, top: 3, boxShadow: shadow(false) }}>
        <Cover album={album} size={s} />
      </div>
      <Txt x={s + 12} y={s / 2 - 4} size={11.5} w={400} f={HEAVY} sx={1} c="#3d63a6">
        {album.title.length > 22 ? album.title.slice(0, 21) + '…' : album.title}
      </Txt>
      <Txt x={s + 12} y={s / 2 + 10} size={10.5} c="#6d8db8">
        {album.artist}
      </Txt>
      <Txt x={s + 12} y={s / 2 + 23} size={10} c="#9aaccc">
        {`${album.year}  ${album.genre}`}
      </Txt>
    </div>
  )
})

// details view: a list with columns
const DCOLS = [['Name', 6], ['Artist', 0.42], ['Year', 0.7], ['Genre', 0.8]]
const DetailRow = memo(function DetailRow({ album, y, w, hover, selected }) {
  const xs = DCOLS.map(([, f], i) => (i === 0 ? f : Math.round(w * f)))
  return (
    <div
      data-album={album.key}
      onPointerEnter={hoverOn(album.key)}
      onPointerLeave={hoverOff(album.key)}
      onClick={click(album)}
      onDoubleClick={play(album)}
      style={{
        position: 'absolute', left: 0, top: y, width: w, height: 18,
        background: selected ? 'rgba(90,150,235,0.3)' : hover ? 'rgba(150,190,240,0.18)' : undefined,
      }}
    >
      <img src={album.url} width={14} height={14} alt="" draggable={false} style={{ position: 'absolute', left: xs[0], top: 2 }} />
      {[album.title, album.artist, String(album.year), album.genre].map((txt, i) => (
        <Txt key={i} x={(i === 0 ? xs[0] + 20 : xs[i])} y={13} size={11} c={selected ? '#1f3f78' : '#4d6690'}>
          {txt}
        </Txt>
      ))}
    </div>
  )
})
const DetailHeader = memo(function DetailHeader({ w }) {
  return (
    <div style={abs(0, 0, w, 20, { background: 'linear-gradient(180deg, #f4f8fe, #dde8f6)', boxShadow: 'inset 0 -1px 0 #b9cbe4' })}>
      {DCOLS.map(([label, f], i) => (
        <Txt key={label} x={(i === 0 ? f : Math.round(w * f)) + (i === 0 ? 20 : 0)} y={14} size={11} w={400} f={HEAVY} sx={1} c="#5a7bb0">
          {label}
        </Txt>
      ))}
    </div>
  )
})

// the album view: L = layout.gridLayout(...), sel = { key, t } | null, hover = album key | null
export function AlbumView({ win, t, L, sel, hover }) {
  const scroll = gridScroll(t, win, L)
  const v = L.view
  const lo = scroll - 80
  const hi = scroll + v.h + 20
  const onWheel = (e) => {
    const cur = gridScroll(now(), win, L)
    setValue(wid(win, 'grid.scroll'), Math.max(0, Math.min(L.contentH - v.h, cur + e.deltaY)))
  }
  const visible = L.items.filter((it) => it.y + it.s >= lo && it.y <= hi)
  return (
    <div style={abs(v.x, v.y, v.w, v.h, { overflow: 'hidden' })} onWheel={onWheel} onClick={() => emit('music.album', { id: null })}>
      <div style={{ position: 'absolute', left: 0, top: -scroll, width: v.w, height: L.contentH }}>
        {L.headers.map((g) => (
          <div key={g.label}>
            <Txt x={4} y={g.y + 15} size={12} w={400} f={HEAVY} sx={1} c="#5a84c4">
              {g.label}
            </Txt>
            <div style={abs(4, g.y + 20, v.w - 12, 1, { background: 'linear-gradient(90deg, #8fb3e6, rgba(143,179,230,0))' })} />
          </div>
        ))}
        {L.kind === 'details' && <DetailHeader w={v.w} />}
        {visible.map((it) => {
          const a = it.album
          const isSel = sel && sel.key === a.key
          if (L.kind === 'details') return <DetailRow key={a.key} album={a} y={it.y} w={v.w} hover={hover === a.key} selected={isSel} />
          if (L.kind === 'tiles') return <TileRow key={a.key} album={a} x={it.x} y={it.y} s={it.s} hover={hover === a.key} selected={isSel} />
          if (isSel && t >= sel.t) return <SelectedThumb key={a.key} album={a} x={it.x} y={it.y} s={it.s} t={t} selT={sel.t} hover={hover === a.key} />
          return <Thumb key={a.key} album={a} x={it.x} y={it.y} s={it.s} hover={hover === a.key} />
        })}
      </div>
    </div>
  )
}

// the window's scrollbar (pale track, white thumb with grip lines, outlined arrows) at x
export function GridScrollbar({ win, t, L, x }) {
  const v = L.view
  const trackTop = v.y
  const trackH = v.h - 30
  const scroll = gridScroll(t, win, L)
  const max = Math.max(1, L.contentH - v.h)
  const len = Math.max(24, Math.min(trackH, (trackH * v.h) / L.contentH))
  const top = trackTop + ((trackH - len) * scroll) / max
  const drag = useRef(null)
  const set = (px) => setValue(wid(win, 'grid.scroll'), Math.max(0, Math.min(max, px)))
  const step = (d) => (e) => {
    e.stopPropagation()
    set(gridScroll(now(), win, L) + d)
  }
  const onDown = (e) => {
    e.stopPropagation()
    const p = toStage(e.clientX, e.clientY)
    drag.current = { y0: p.y, s0: gridScroll(now(), win, L) }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e) => {
    if (!drag.current) return
    const p = toStage(e.clientX, e.clientY)
    set(drag.current.s0 + ((p.y - drag.current.y0) * max) / Math.max(1, trackH - len))
  }
  const onUp = () => (drag.current = null)
  const canScroll = L.contentH > v.h
  return (
    <>
      <svg width="16" height="300" style={{ position: 'absolute', left: x, top: trackTop - 20, overflow: 'visible' }}>
        <path d="M2 9.5 L8 3.5 L14 9.5 Z" fill="#f8fbff" stroke="#a9b8cc" strokeWidth="1" strokeLinejoin="round" />
        <path d={`M2 ${trackH + 24} L8 ${trackH + 30} L14 ${trackH + 24} Z`} fill="#f8fbff" stroke="#a9b8cc" strokeWidth="1" strokeLinejoin="round" />
      </svg>
      <div data-hit="scroll:up" style={abs(x, trackTop - 22, 16, 16)} onClick={step(-67.5)} />
      <div data-hit="scroll:down" style={abs(x, trackTop + trackH + 2, 16, 16)} onClick={step(67.5)} />
      <div
        data-hit="scroll:track"
        style={abs(x + 3, trackTop, 10, trackH, {
          borderRadius: 5,
          background: 'linear-gradient(90deg, rgba(200,214,236,0.55), rgba(246,250,255,0.85) 60%, rgba(220,230,246,0.6))',
        })}
        onClick={(e) => {
          const p = toStage(e.clientX, e.clientY)
          const r = e.currentTarget.getBoundingClientRect()
          const ty = toStage(r.left, r.top).y
          set(gridScroll(now(), win, L) + (p.y - ty < top - trackTop ? -v.h : v.h))
        }}
      />
      {canScroll && (
        <>
          <div
            data-hit="scroll:thumb"
            style={abs(x + 1.5, top, 14, len, {
              borderRadius: 4,
              background: 'linear-gradient(90deg, #f2f6fc, #ffffff 50%, #e8eef8)',
              boxShadow: 'inset 0 0 0 1px #b8c6da, 0 1px 2px rgba(60,90,140,0.2)',
            })}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onClick={(e) => e.stopPropagation()}
          />
          {[0, 4, 8, 12].map((d) => (
            <div key={d} style={abs(x + 5, top + len / 2 - 8 + d, 7, 1, { background: '#c8d3e2', pointerEvents: 'none' })} />
          ))}
        </>
      )}
    </>
  )
}
