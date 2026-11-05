// The row of user tiles: layout (5 slots, or 4 after a selection), hover looks, the slide that
// closes the gap after a selection (motion blurred) and the drop-away exit on submit.
import { emit } from '../../core/events.js'
import { CAPTURE } from '../../core/clock.js'
import { clamp, ease, F } from '../../core/anim.js'
import { Tile } from './Tile.jsx'
import { USERS, hoverOf } from './state.js'
import { SLOTS5 } from './layout.js'

const HOVER_IN = F(2.2)
const HOVER_OUT = F(1.6)
const BIG = 0.27
const SMALL = 0.1

// hover look of a tile at t
export function hoverLook(t, id) {
  const h = hoverOf(t, id)
  const amp = h.big ? BIG : SMALL
  if (h.on) {
    const c = clamp((t - h.t) / HOVER_IN)
    const s = ease.outCubic(clamp((t - h.t) / F(3)))
    return { color: c, scale: 1 + amp * s, label: h.big ? s : 0 }
  }
  if (h.t === -Infinity) return { color: 0, scale: 1, label: 0 }
  const k = 1 - clamp((t - h.t) / HOVER_OUT)
  return { color: k, scale: 1 + amp * k, label: h.big ? k : 0 }
}

function hoverHandlers(id) {
  if (CAPTURE) return {}
  return {
    onPointerEnter: () => emit('login.hover', { id, on: true, big: true }),
    onPointerLeave: () => emit('login.hover', { id, on: false, big: true }),
    onPointerDown: (e) => {
      e.stopPropagation()
      emit('login.select', { id })
    },
  }
}

export function TileRow({ t }) {
  return (
    <>
      {USERS.map((u, i) => (
        <Tile key={u.id} user={u} x={SLOTS5[i]} look={hoverLook(t, u.id)} {...hoverHandlers(u.id)} />
      ))}
    </>
  )
}

void ease
