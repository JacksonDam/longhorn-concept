// The selected user's glass slab: born in the bar from the tile, launched with a spin to its
// resting place left of the panel, then idling. A user that is deselected (or swapped for
// another) flies back the same way, reversed. All slabs share one full-stage Slab3D canvas.
import { Slab3D } from '../../gl/Slab3D.jsx'
import { loadTexture } from '../../gl/slab.js'
import { clamp, F } from '../../core/anim.js'
import { FPS } from '../../core/clock.js'
import { pic } from './Tile.jsx'
import { USERS } from './state.js'
import { slabPose, LAUNCH, RETURN_FRAMES } from './select.js'
import { slabExit } from './exit.js'

// warm the textures so the first click renders at once (and capture waits for them)
for (const u of USERS) loadTexture(pic(u.id))

const BASE = 150 // slab model size (px at s = 1)

// local tuning aid: ?slab={"sat":0.4,...} overrides material params in captures
let OVERRIDE = {}
try {
  OVERRIDE = JSON.parse(new URLSearchParams(location.search).get('slab') || '{}')
} catch {
  OVERRIDE = {}
}

export const slabMaterial = (id) => ({
  w: BASE,
  h: BASE,
  d: 30,
  radius: 13,
  map: pic(id),
  edgeColor: [0.72, 0.84, 1.0],
  edgeMix: 0.35,
  spec: 0.18,
  bandPos: -0.3,
  bandWidth: 0.16,
  rim: 0.3,
  sat: 0.5,
  contrast: 1.15,
  lift: [0.08, 0.05, 0.13],
  brightness: 0.95,
  vignette: 0.6,
  seeThrough: true,
  vigColor: [0.14, 0.1, 0.2],
  ...OVERRIDE,
})

// pose(tt) for one slab record { id, index, t0 (select time), back (deselect time | null) }
function poseFor(rec, submitT) {
  return (tt) => {
    let k = (tt - rec.t0) * FPS
    if (rec.back != null) {
      // fly back: replay the flight backwards from wherever it was
      const kb = Math.min(k, (rec.back - rec.t0) * FPS)
      const r = (tt - rec.back) * FPS
      k = Math.max(LAUNCH - 0.5, Math.min(kb, LAUNCH + RETURN_FRAMES) - r)
      if (r > RETURN_FRAMES + 2) return { visible: false }
    }
    const p = slabPose(k, rec.index, tt, rec.from)
    const s = p.size / BASE
    let pose = { x: p.x, y: p.y, z: 0, ry: p.ry, rx: p.rx, rz: p.rz ?? 0, s, faceBand: p.faceBand, brightness: p.brightness, opacity: rec.back != null ? 1 : clamp((k - 1.5) / 1) }
    if (submitT != null && rec.back == null) pose = slabExit(tt - submitT, pose)
    return pose
  }
}

// soft white halo behind the resting slab
function Halo({ t, rec, submitT }) {
  const k = (t - rec.t0) * FPS
  let a = clamp((k - 26) / 8)
  if (rec.back != null) a *= 1 - clamp(((t - rec.back) * FPS) / 3)
  if (submitT != null) a *= 1 - clamp(((t - submitT) * FPS - 0.5) / 1.5)
  if (a <= 0) return null
  const p = slabPose(k, rec.index, t, rec.from)
  const w = p.size * Math.abs(Math.cos(p.ry)) + 30 * (p.size / BASE) * Math.abs(Math.sin(p.ry)) - 8
  const h = p.size - 8
  return (
    <div
      style={{
        position: 'absolute',
        left: p.x - w / 2,
        top: p.y - h / 2,
        width: w,
        height: h,
        borderRadius: 18,
        transform: `rotate(${((p.rz ?? 0) * 180) / Math.PI}deg)`,
        boxShadow: '0 0 14px 6px rgba(210,228,255,0.75), 0 0 34px 12px rgba(160,195,255,0.35)',
        opacity: a,
        pointerEvents: 'none',
      }}
    />
  )
}

export function Selected({ t, records, submitT }) {
  const items = records.map((rec) => ({ slab: slabMaterial(rec.id), pose: poseFor(rec, submitT) }))
  if (!items.length) return null
  // motion blur while anything flies (launch, return or exit)
  const moving = records.some((rec) => {
    const k = (t - rec.t0) * FPS
    return rec.back != null || (k > LAUNCH - 1 && k < 31)
  }) || (submitT != null && t - submitT < F(12))
  return (
    <>
      {records.map((rec) => (
        <Halo key={rec.id + rec.t0} t={t} rec={rec} submitT={submitT} />
      ))}
    <Slab3D
      width={960}
      height={720}
      items={items}
      moving={moving}
      samples={12}
      shutter={1 / FPS}
      phase={-0.5}
      P={1100}
      style={{ left: 0, top: 0 }}
    />
    </>
  )
}
