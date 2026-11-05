// The album grid: 32 cover tiles (8 x 4). Hover and selection come from the event log.
// The selected tile becomes a blue glass frame that pops (tilt, grow, settle) when clicked.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { ALBUMS } from './albums.js'
import { GRID, WIN } from './geometry.js'
import { table, toRel } from './timeline.js'

export const tilePos = (i) => ({ x: GRID.xs[i % 8] - WIN.x, y: GRID.ys[Math.floor(i / 8)] - WIN.y })

const hoverOn = (i) => () => emit('hover', { id: 'music.album.' + i, on: true })
const hoverOff = (i) => () => emit('hover', { id: 'music.album.' + i, on: false })
const click = (i) => (e) => {
  e.stopPropagation()
  emit('music.album', { id: i })
}

function Cover({ album, size }) {
  return <img src={album.url} width={size} height={size} alt="" draggable={false} style={{ display: 'block' }} />
}

export const Tile = memo(function Tile({ album, hover }) {
  const { x, y } = tilePos(album.index)
  const s = GRID.size
  return (
    <div
      data-album={album.index}
      onPointerEnter={hoverOn(album.index)}
      onPointerLeave={hoverOff(album.index)}
      onClick={click(album.index)}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: s,
        height: s,
        boxSizing: 'border-box',
        border: '2px solid rgba(250,252,255,0.95)',
        boxShadow: hover
          ? '0 0 0 1px rgba(120,170,240,0.85), 0 4px 7px rgba(40,70,130,0.35)'
          : '0 0 0 1px rgba(170,185,210,0.45), 0 3px 5px rgba(40,70,130,0.22)',
        transform: hover ? 'translateY(-1px)' : undefined,
        background: '#fff',
      }}
    >
      <Cover album={album} size={s - 4} />
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

const SelectedBody = memo(function SelectedBody({ album }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: -3,
        top: -3,
        width: 56,
        height: 56,
        boxSizing: 'border-box',
        borderRadius: 3,
        padding: 5,
        background: 'linear-gradient(160deg, #e9f6ff 0%, #a9d4ff 35%, #c8e6ff 70%, #eef8ff 100%)',
        boxShadow: '0 0 0 1px rgba(150,190,235,0.9), 0 4px 8px rgba(40,80,160,0.35), inset 0 0 0 1px rgba(255,255,255,0.7)',
      }}
    >
      <div style={{ position: 'relative', width: 46, height: 46, overflow: 'hidden' }}>
        <Cover album={album} size={46} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgb(40, 90, 235)', mixBlendMode: 'color', opacity: 0.55 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgb(30, 70, 200)', mixBlendMode: 'screen', opacity: 0.35 }} />
      </div>
    </div>
  )
})

function SelectedTile({ album, t, selT, hover }) {
  const { x, y } = tilePos(album.index)
  const rel = toRel(t, selT)
  const pose = (r) => {
    const [s, rx, ry] = POP(r)
    return { transform: `perspective(260px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})` }
  }
  const box = {
    position: 'absolute',
    left: x,
    top: y,
    width: GRID.size,
    height: GRID.size,
    transformOrigin: '50% 50%',
  }
  const handlers = {
    onPointerEnter: hoverOn(album.index),
    onPointerLeave: hoverOff(album.index),
    onClick: click(album.index),
  }
  if (rel >= POP_END || rel < 0) {
    return (
      <div {...handlers} style={{ ...box, transform: hover ? 'translateY(-1px)' : undefined }}>
        <SelectedBody album={album} />
      </div>
    )
  }
  // motion blur: average a few sub-frame poses
  const n = 6
  const layers = []
  for (let k = 0; k < n; k++) {
    const r = rel + 0.8 * ((k + 0.5) / n - 0.5)
    layers.push(
      <div key={k} style={{ ...box, ...pose(r), opacity: 1 / n, mixBlendMode: 'plus-lighter' }}>
        <SelectedBody album={album} />
      </div>,
    )
  }
  return (
    <div {...handlers} style={{ position: 'absolute', left: 0, top: 0, isolation: 'isolate' }}>
      {layers}
    </div>
  )
}

// hover: index of the hovered tile (-1 none); sel: { id, t } of the selection, or null
export function AlbumGrid({ t, hover = -1, sel }) {
  return (
    <>
      {ALBUMS.map((a) =>
        sel && a.index === sel.id ? null : <Tile key={a.index} album={a} hover={hover === a.index} />,
      )}
      {sel && <SelectedTile album={ALBUMS[sel.id]} t={t} selT={sel.t} hover={hover === sel.id} />}
    </>
  )
}
