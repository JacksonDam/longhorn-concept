// The selected user's glass slab: born in the bar from the tile, launched with a spin to its
// resting place left of the panel, then idling. A user that is deselected (or swapped for
// another) flies back the same way, reversed. All slabs share one full-stage Slab3D canvas.
import { Slab3D } from '../../gl/Slab3D.jsx'
import { loadTexture, renderSlabs, SlabScene, texturesReady } from '../../gl/slab.js'
import { useEffect } from 'react'
import { clamp, F } from '../../core/anim.js'
import { FPS } from '../../core/clock.js'
import { pic } from './Tile.jsx'
import { USERS } from './state.js'
import { slabPose, LAUNCH, RETURN_FRAMES } from './select.js'
import { slabExit } from './exit.js'
import { blur } from './blur.js'

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
  d: 24,
  radius: 11,
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
    const p = slabPose(k, rec.index, tt, rec.xAt ? rec.xAt(tt) : rec.from)
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
  const p = slabPose(k, rec.index, t, rec.xAt ? rec.xAt(t) : rec.from)
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

// Draw into a canvas cropped to the slabs (sizes rounded up to 64 px so the GL render targets are
// reused) instead of a full-stage canvas: ~8x fewer pixels per accumulation sample.
const Q = 64
function cropBox(items, times) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const it of items)
    for (const tt of times) {
      const p = it.pose(tt)
      if (p.visible === false || (p.opacity ?? 1) <= 0.001) continue
      const r = (BASE * 0.75 + 16) * (p.s ?? 1) + 12 // half-diagonal incl. depth + rim margin
      x0 = Math.min(x0, p.x - r)
      y0 = Math.min(y0, p.y - r)
      x1 = Math.max(x1, p.x + r)
      y1 = Math.max(y1, p.y + r)
    }
  if (x0 === Infinity) return null
  const w = Math.min(960 + 2 * Q, Math.ceil((x1 - x0) / Q) * Q)
  const h = Math.min(720 + 2 * Q, Math.ceil((y1 - y0) / Q) * Q)
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  return { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h }
}

// compile the slab shader and upload the pictures at load, so the first click doesn't stall
let warmed = false
function warmUp() {
  if (warmed) return
  warmed = true
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  const scene = new SlabScene()
  const items = USERS.map((u) => ({ slab: slabMaterial(u.id), pose: () => ({ x: 8, y: 8, s: 0.05 }) }))
  const go = () => renderSlabs(ctx, scene, items, [0, 0.01], { cw: 16, ch: 16, scale: 1, P: 1100 })
  texturesReady().then(() => requestAnimationFrame(go))
}

export function Selected({ t, records, submitT }) {
  useEffect(warmUp, [])
  const items = records.map((rec) => ({ slab: slabMaterial(rec.id), pose: poseFor(rec, submitT) }))
  if (!items.length) return null
  // motion blur while anything flies (launch, return or exit)
  const moving = records.some((rec) => {
    const k = (t - rec.t0) * FPS
    return rec.back != null || (k > LAUNCH - 1 && k < 31)
  }) || (submitT != null && t - submitT < F(12))
  const mb = blur('slab')
  const n = moving ? mb.samples : 1
  const times = []
  for (let k = 0; k < n; k++) times.push(n === 1 ? t : t + mb.shutter * ((k + 0.5) / n + mb.phase))
  const b = cropBox(items, times)
  if (!b) return null
  const canvas = {
    width: b.w,
    height: b.h,
    origin: [480 - b.x, 360 - b.y],
    style: { left: b.x, top: b.y },
    items: items.map((it) => ({ slab: it.slab, pose: (tt) => { const p = it.pose(tt); return { ...p, x: p.x - b.x, y: p.y - b.y } } })),
  }
  return (
    <>
      {records.map((rec) => (
        <Halo key={rec.id + rec.t0} t={t} rec={rec} submitT={submitT} />
      ))}
      <Slab3D
        width={canvas.width}
        height={canvas.height}
        items={canvas.items}
        moving={moving}
        {...mb}
        P={1100}
        origin={canvas.origin}
        style={canvas.style}
      />
    </>
  )
}
