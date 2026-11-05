// The album grid: 32 cover tiles (8 x 4). Hover and selection come from the event log.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { ALBUMS } from './albums.js'
import { GRID, WIN } from './geometry.js'

export const tilePos = (i) => ({ x: GRID.xs[i % 8] - WIN.x, y: GRID.ys[Math.floor(i / 8)] - WIN.y })

export const Tile = memo(function Tile({ album, hover }) {
  const { x, y } = tilePos(album.index)
  const s = GRID.size
  return (
    <div
      data-album={album.index}
      onPointerEnter={() => emit('hover', { id: 'music.album.' + album.index, on: true })}
      onPointerLeave={() => emit('hover', { id: 'music.album.' + album.index, on: false })}
      onClick={() => emit('music.album', { id: album.index })}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: s,
        height: s,
        boxSizing: 'border-box',
        border: '2px solid rgba(250,252,255,0.95)',
        boxShadow: hover
          ? '0 0 0 1px rgba(120,170,240,0.8), 0 3px 6px rgba(40,70,130,0.35)'
          : '0 0 0 1px rgba(170,185,210,0.45), 0 3px 5px rgba(40,70,130,0.22)',
        background: '#fff',
      }}
    >
      <img src={album.url} width={s - 4} height={s - 4} alt="" draggable={false} style={{ display: 'block' }} />
    </div>
  )
})

export function AlbumGrid({ hover = -1, selected = -1 }) {
  return (
    <>
      {ALBUMS.map((a) => (a.index === selected ? null : <Tile key={a.index} album={a} hover={hover === a.index} />))}
    </>
  )
}
