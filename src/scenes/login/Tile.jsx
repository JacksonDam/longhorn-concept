// One user tile in the bar: the picture as a blue duotone in a white glass frame, full colour
// when hovered. `look` = { color 0..1, scale, label 0..1 (emphasis), glow 0..1, labelOpacity }.
import { memo } from 'react'
import { asset, preload } from '../../core/preload.js'
import { TILE } from './layout.js'
import { USERS } from './state.js'

export const pic = (id) => asset(`img/login/users/${id}.webp`)
export const duo = (id) => asset(`img/login/users/${id}-duo.webp`)
preload(USERS.flatMap((u) => [pic(u.id), duo(u.id)]))

const S = TILE.size
const imgStyle = { position: 'absolute', left: 0, top: 0, width: S, height: S, borderRadius: 4, display: 'block' }

// Static picture + frame (memoised; the per-frame look is applied by the parent transform)
export const TileFace = memo(function TileFace({ id, color, glass }) {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: S, height: S }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 4.5,
          boxShadow: '-1px 1.5px 1.5px rgba(0,25,110,0.55), 0 0 3px rgba(0,30,120,0.25)',
        }}
      />
      <img src={duo(id)} alt="" draggable={false} style={imgStyle} />
      {color > 0 && <img src={pic(id)} alt="" draggable={false} style={{ ...imgStyle, opacity: color }} />}
      {/* glass frame: white rim + a vertical sheen near the right edge */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 4,
          boxShadow: glass
            ? 'inset 0 0 0 1px rgba(235,245,255,0.7)'
            : `inset 0 0 0 2.2px rgba(255,255,255,${0.97 - 0.35 * color}), inset 0 0 0 3px rgba(255,255,255,0.35)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: S * 0.8,
          top: 2,
          width: S * 0.11,
          height: S - 4,
          background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.45) 45%, rgba(255,255,255,0.1))',
        }}
      />
    </div>
  )
})

export function Tile({ user, x, y = 0, look, onPointerEnter, onPointerLeave, onPointerDown }) {
  const { color = 0, scale = 1, label = 0, labelOpacity = 1, opacity = 1 } = look
  const cx = x
  return (
    <>
      <div
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        style={{
          position: 'absolute',
          left: cx - S / 2,
          top: TILE.top + y,
          width: S,
          height: S,
          transform: `scale(${scale})`,
          transformOrigin: '50% 52%',
          opacity,
          cursor: 'pointer',
        }}
      >
        <TileFace id={user.id} color={Math.round(color * 24) / 24} glass={user.id === 'sondra'} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: cx - 50,
          width: 100,
          top: TILE.labelY - 7 + label * 5 + y,
          textAlign: 'center',
          fontFamily: 'Plex',
          fontSize: 11.5 + label * 1.5,
          fontWeight: label > 0.5 ? 650 : 450,
          lineHeight: '14px',
          color: 'rgb(214,232,255)',
          opacity: labelOpacity * opacity,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          textShadow: '0 1px 1px rgba(10,40,140,0.3)',
        }}
      >
        {user.name}
      </div>
    </>
  )
}
