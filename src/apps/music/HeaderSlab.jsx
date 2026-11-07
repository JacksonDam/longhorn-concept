// The glass slab of an explorer header, shared by my Music (the music device and its album pages)
// and my Pictures & Videos (the photo frame): the slab and its floor reflection drawn by the one
// shared slab renderer (SlabCanvas, gl/slab.js), my Music's fitted spin-in on open, the settled
// pose that hands over to the pointer (tilt.js), the window's rect for the tilt, and when the
// canvases render at the display's rate. The app draws it from its window's Overlay (above the
// content, on every motion-blur copy; the copies share one render, `cache`).
import { SlabCanvas } from './SlabCanvas.jsx'
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

// The slab canvases (the slab and its floor reflection: the pose mirrored in the plane y = floor)
// for items [{ slab, pose(tt) }] (a pose may set opacity) at t. spin: blurred with my Music's
// spin's samples; copy: one sample (a copy that never shows motion). cache: an id under which
// canvases rendering the same image share one render (the window's blur copies). skip: the
// canvases keep their pixels (they draw once if they have none); hidden: they draw but stay hidden
export function Slabs({ spec, t, items, spin = false, copy = false, reflection = true, cache, skip, hidden }) {
  const { box, floor, fade } = spec
  const hide = hidden ? { visibility: 'hidden' } : null
  const samples = copy ? 1 : spin ? 8 : 3
  const shutter = (spin ? 0.9 : 0.5) / FPS
  const mirror = (p) => ({ ...p, y: 2 * floor - p.y, rx: -(p.rx || 0), rz: -(p.rz || 0), sy: -(p.sy ?? 1) })
  const mask = `linear-gradient(180deg, transparent ${floor - 4}px, #000 ${floor + 6}px, transparent ${floor + fade}px)`
  return (
    <>
      {reflection && (
        <SlabCanvas
          t={t}
          width={box.w}
          height={box.h}
          items={items.map((it) => ({ slab: it.slab, pose: (tt) => mirror(it.pose(tt)) }))}
          samples={samples}
          shutter={shutter}
          P={900}
          style={{ left: box.x, top: box.y, opacity: 0.22, WebkitMaskImage: mask, maskImage: mask, ...hide }}
          cacheKey={cache && cache + '.refl'}
          skip={skip}
        />
      )}
      <SlabCanvas t={t} width={box.w} height={box.h} items={items} samples={samples} shutter={shutter} P={900} style={{ left: box.x, top: box.y, ...hide }} cacheKey={cache && cache + '.main'} skip={skip} />
    </>
  )
}
