// The glass slab of an explorer header, shared by my Music (the music device and its album pages)
// and my Pictures & Videos (the photo frame): the slab and its floor reflection drawn by a slab
// view (gl/slab.js SlabView: its own visible GL canvas), my Music's fitted spin-in on open, the
// settled pose that hands over to the pointer (tilt.js), the window's rect for the tilt, and when
// the slab renders at the display's rate. The app draws it from its window's Overlay, once over all
// of the window's layers (os/PlexWindow.jsx): one render a frame, drawn on every shown layer.
import { useLayoutEffect, useRef } from 'react'
import { acquireSlabView, releaseSlabView, textureReady } from '../../gl/slab.js'
import { useStageScale, deviceScale } from '../../core/Stage.jsx'
import { slabTilt, applyTilt } from './tilt.js'
import { toRel, devicePoseRel, DEVICE_REST } from './timeline.js'
import { FPS, frameTime } from '../../core/clock.js'
import { normalRect } from '../../os/PlexWindow.jsx'
import { eventsOf } from '../../os/logIndex.js'

// spec: { box: { x, y, w, h } the canvases' window-local box (the slab's poses are in its px),
//   hw, hh: the slab's half size (its pointer tilt's reach), floor: the reflection's plane (box px),
//   fade: how far below the floor the reflection fades out (px),
//   pointer (optional): { x, y, s } where the slab stands, and its scale, once the pointer drives
//   it (box px; it moves there with the takeover): clear of what its turns would cover }

// the open's spin-in (rel frames from the app's open reference, music/actions.js openT): the slab
// shows from DEVICE_IN and spins (fast, blurred) until SPIN_END; it has settled at DEVICE_REST
export const DEVICE_IN = 5.5
export const SPIN_END = 24
export { DEVICE_REST }

// the start of the video frame that t falls in (t itself on a frame time)
export const onFrameGrid = (t) => frameTime(Math.floor(t * FPS + 1e-6) + 1)

// the window's rect at a time (stage px): its moves from the log, so a slab's tilt follows a
// dragged window
export function rectAt(win, app) {
  const r = normalRect(win, app)
  const ms = eventsOf('win.move', win.id)
  return (at) => {
    let lo = 0, hi = ms.length
    while (lo < hi) {
      const m = (lo + hi) >> 1
      if (ms[m].t <= at) lo = m + 1
      else hi = m
    }
    return lo > 0 && ms[lo - 1].t > win.openedAt ? { ...r, x: ms[lo - 1].x, y: ms[lo - 1].y } : r
  }
}

// The pose at tt of a slab that plays poseAt(rel, drift) from t0 and settles `rest` frames in:
// the table's pose (the video's idle drift when the log plays it: drift), handing over to the
// pointer once that is over the window (tilt.js; rect: the window's rect at a time, none: no tilt):
// its orientation, and with spec.pointer its place and size too, so it turns about the centre it
// moves to
export function settledPose(spec, poseAt, tt, t0, rest, rect, drift) {
  const from = t0 + rest / FPS
  const at = spec.pointer || poseAt(rest)
  const s = spec.pointer ? spec.pointer.s : 1
  const tilt = rect ? slabTilt(tt, from, { x: spec.box.x + at.x, y: spec.box.y + at.y }, spec.hw * s, spec.hh * s, rect) : null
  const p = applyTilt(poseAt(toRel(tt, t0), drift ? (tilt ? tilt.drift : 1) : 0), tilt)
  if (!tilt || !spec.pointer) return p
  const k = tilt.k
  return { ...p, x: p.x + (at.x - p.x) * k, y: p.y + (at.y - p.y) * k, s: (p.s ?? 1) + (s - (p.s ?? 1)) * k }
}

// my Music's device spin-in (devicePoseRel), moved to settle at `to` ({ x, y, z, rx, ry, rz } in
// another header's box): another header's slab spinning in the same way into its own pose
export function devicePoseTo(to) {
  const r = devicePoseRel(DEVICE_REST)
  const d = {}
  for (const k of ['x', 'y', 'z', 'rx', 'ry', 'rz']) d[k] = (to[k] ?? 0) - r[k]
  return (rel, drift) => {
    const p = devicePoseRel(rel, drift)
    return { x: p.x + d.x, y: p.y + d.y, z: p.z + d.z, rx: p.rx + d.rx, ry: p.ry + d.ry, rz: p.rz + d.rz }
  }
}

// Which time the canvases show at t. The fast motions (spin: the open's spin-in, a page's spin)
// play at the display's rate with a multi-sample blur, and so does a turning slab (pose(tt): its
// pose, given while it can tilt); at rest a slab holds still (its canvases don't re-render), its
// slow settle stepping on the video's frame grid (the grid holds the capture frames themselves:
// ?capture draws the same).
export function slabClock(t, spin, pose) {
  let fast = spin
  if (!fast && pose) {
    const a = pose(t), b = pose(t - 0.5 / FPS)
    fast = Math.abs(a.ry - b.ry) + Math.abs(a.rx - b.rx) + Math.abs((a.rz ?? 0) - (b.rz ?? 0)) > 1e-5
  }
  return { fast, slabT: fast ? t : onFrameGrid(t) }
}

// What the image shows is a function of its slabs, their poses at the sample times and the view:
// an image whose key hasn't changed isn't rendered again (a drag, a re-render, a frame between two
// slab updates), and a view whose layers haven't moved isn't drawn again (it keeps its pixels).
const slabIds = new WeakMap()
let nextSlabId = 1
const slabId = (slab) => {
  let id = slabIds.get(slab)
  if (!id) slabIds.set(slab, (id = nextSlabId++))
  return id
}
function imageKey(items, times, w, h, scale, refl) {
  let key = `${w}x${h}@${scale}:${refl}`
  for (const it of items) {
    key += `|${slabId(it.slab)}.${it.slab.face ? it.slab.face.key : it.slab.canvasVersion ?? 0}${textureReady(it.slab.map) ? '' : '?'}`
    for (const tt of times) key += ':' + JSON.stringify(it.pose(tt))
  }
  return key
}

// The slab and its floor reflection (the pose mirrored in the plane y = floor, at REFL_OP under a
// mask fading it out below the floor) for items [{ slab, pose(tt) }] (a pose may set opacity) at
// t, drawn on every shown layer of the window (gl/slab.js SlabView: one render, then the image
// once per layer with that layer's transform; the app's Overlay, os/PlexWindow.jsx, passes them).
// spin: blurred with my Music's spin's samples; copy: one sample.
// layers: [{ left, top, w, h, transform, ox, oy, op, shade }] (the window group's px: os/PlexWindow
// overlayLayers), frame: the stage's rect in the group's px, motion: the window's copies are
// mounted (the view covers the stage meanwhile; at rest it is the slab's box)
const REFL_OP = 0.22
const COARSE = typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600)
export function Slabs({ spec, t, items, spin = false, copy = false, reflection = true, layers = [], frame, motion = false, shade }) {
  const { box, floor, fade } = spec
  const host = useRef(null)
  const view = useRef(null)
  const drawn = useRef({ image: null, draw: null })
  const { s } = useStageScale()
  const scale = deviceScale(s)
  const samples = copy ? 1 : spin ? 8 : 3
  const shutter = (spin ? 0.9 : 0.5) / FPS
  useLayoutEffect(() => {
    const v = acquireSlabView()
    host.current.appendChild(v.canvas)
    view.current = v
    return () => {
      view.current = null
      releaseSlabView(v)
    }
  }, [])
  useLayoutEffect(() => {
    const v = view.current
    if (!v) return
    const times = []
    for (let k = 0; k < samples; k++) times.push(samples === 1 ? t : t + shutter * ((k + 0.5) / samples - 0.5))
    const ik = imageKey(items, times, box.w, box.h, scale, reflection)
    const fresh = ik !== drawn.current.image
    if (fresh && items.length) {
      const mirror = (p) => ({ ...p, y: 2 * floor - p.y, rx: -(p.rx || 0), rz: -(p.rz || 0), sy: -(p.sy ?? 1) })
      const refl = reflection ? { items: items.map((it) => ({ slab: it.slab, pose: (tt) => mirror(it.pose(tt)) })), op: REFL_OP, mask: [floor - 4, floor + 6, floor + fade] } : null
      v.image(items, times, { cw: box.w, ch: box.h, scale, P: 900 }, refl)
      drawn.current.image = ik
    }
    // where the canvas lies (group px): on the box of the only, untransformed layer, or (copies
    // mounted, or a layer transformed) over the stage, each layer drawn with its transform
    // (on a desktop it covers the stage all the time: resizing a GL canvas reallocates its
    // buffers, hundreds of ms behind a busy GPU; a phone keeps the box at rest, memory first)
    const L0 = layers[0]
    const still = COARSE && !motion && layers.length === 1 && !L0.transform && L0.op === 1 && !L0.shade
    const at = still ? { x: L0.left + box.x, y: L0.top + box.y, w: box.w, h: box.h } : frame
    const dk = `${at.x},${at.y},${at.w},${at.h}|${layers.map((L) => `${L.left},${L.top},${L.transform},${L.ox},${L.oy},${L.op},${L.shade}`).join(';')}`
    if (!fresh && dk === drawn.current.draw) return
    drawn.current.draw = dk
    const c = v.canvas.style
    c.left = at.x + 'px'
    c.top = at.y + 'px'
    c.width = at.w + 'px'
    c.height = at.h + 'px'
    const ms = layers.map((L) => {
      // box px -> the canvas's px: the box in the layer, the layer's transform about its origin,
      // the layer's place in the group, the canvas's place
      const m = new DOMMatrix().translate(L.left + L.ox - at.x, L.top + L.oy - at.y)
      if (L.transform) m.multiplySelf(new DOMMatrix(L.transform))
      m.translateSelf(box.x - L.ox, box.y - L.oy)
      return { m, op: L.op, shade: L.shade }
    })
    v.draw(items.length ? ms : [], at.w, at.h, scale, box, shade && { ...shade, at: { x: box.x, y: box.y } })
  })
  return <div ref={host} style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, pointerEvents: 'none' }} />
}
