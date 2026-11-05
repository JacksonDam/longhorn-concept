// The selection sequence, as pure functions of k = frames since 'login.select'
// (measured on the reference, select at video frame 168; see docs/login-spec.md):
//   k 0-3    the neighbours spread 5 px; the tile turns into the glass slab (k 1.5-2.5) and pops
//   k 4-15   it settles back, a white glow pools under it, then it swells again
//   k 16-23  it launches: rises out of the bar, growing, and spins about its vertical axis
//   k 18-29  the remaining tiles slide together (ease-out, motion blurred)
//   k 25-31  the password panel sweeps in from behind the slab (streaky motion blur)
//   k 30+    idle: slow sway, moving reflection, soft halo
import { clamp, lerp } from '../../core/anim.js'
import { FPS } from '../../core/clock.js'
import { SLOTS5, SLOTS4, TILE, SLAB } from './layout.js'
import { USERS, selections } from './state.js'

export const kOf = (t, t0) => (t - t0) * FPS

// piecewise-linear / Catmull-Rom keyframe helpers on frame numbers
function lin(keys, k) {
  if (k <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    if (k <= keys[i][0]) {
      const [k0, v0] = keys[i - 1]
      const [k1, v1] = keys[i]
      return lerp(v0, v1, (k - k0) / (k1 - k0))
    }
  }
  return keys[keys.length - 1][1]
}
function cr(keys, k) {
  // Catmull-Rom through the keys (k must be increasing), clamped at the ends
  const n = keys.length
  if (k <= keys[0][0]) return keys[0][1]
  if (k >= keys[n - 1][0]) return keys[n - 1][1]
  let i = 1
  while (keys[i][0] < k) i++
  const p0 = keys[Math.max(0, i - 2)], p1 = keys[i - 1], p2 = keys[i], p3 = keys[Math.min(n - 1, i + 1)]
  const u = (k - p1[0]) / (p2[0] - p1[0])
  const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0] || 1)) * (p2[0] - p1[0])
  const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0] || 1)) * (p2[0] - p1[0])
  const u2 = u * u, u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * p1[1] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[1] + (u3 - u2) * m2
}

// ------------------------------------------------------------------ bar tiles
// x of every tile (by index in USERS) at k frames after selecting index `sel` (prevSel: the
// tile selected before, or -1). The spread opens a 5 px gap around the selected tile.
const SPREAD = [[0, 0.3], [1, 0.75], [2, 0.85], [3, 1]]
export const SLIDE_START = 18.6
export const SLIDE_FRAMES = 8.5
export function slideK(k) {
  const u = clamp((k - SLIDE_START) / SLIDE_FRAMES)
  return 1 - (1 - u) * (1 - u)
}

// slot centre of tile i when `sel` is selected (null: none)
export function slotX(i, sel) {
  if (sel == null || sel < 0) return SLOTS5[i]
  if (i === sel) return SLOTS5[i]
  return SLOTS4[i < sel ? i : i - 1]
}

export function spreadX(i, sel, k) {
  if (sel == null || sel < 0 || i === sel) return 0
  return (i < sel ? -5 : 5) * lin(SPREAD, k)
}

// ------------------------------------------------------------------ selected tile / slab
// scale of the tile-sized slab in the bar, relative to the tile (55.2 px)
const BAR_SCALE = [[0, 1], [1.5, 1], [2, 1.1], [3, 1.22], [4, 1.18], [5, 1.07], [6, 0.97], [8, 0.97], [9, 1.03], [10, 1.1], [11, 1.14], [12, 1.2], [14, 1.21], [15.5, 1.28]]
export const LAUNCH = 16
// flight keys: [k, x, y, size (px), ry (deg), face brightness, light band u, band strength]
// (k = frames since select; 184 = k 16). The face darkens as it turns away (186-188, 192-193)
// and catches a white glint while it comes round (194-197).
const FLIGHT = [
  [15.5, null, null, 0, 0, 1, 0.3, 0],
  [16, 465, 622, 80, 0, 1, 0.3, 0],
  [17, 457, 572, 100, 18, 1, 0.3, 0],
  [18, 447, 497, 122, 35, 0.72, 0.2, 0.55],
  [19, 432, 432, 142, 60, 0.35, 0.1, 0.3],
  [20, 417, 367, 158, 92, 0.3, 0.1, 0],
  [21, 392, 339, 165, 126, 0.9, 0.15, 0.2],
  [22, 384, 340, 168, 162, 1, 0.3, 0],
  [23, 380, 342, 170, 194, 0.95, 0.3, 0],
  [24, 381, 344, 170, 228, 0.45, 0.3, 0],
  [25, 378, 345, 170, 262, 0.45, 0.35, 0.4],
  [26, 375, 345, 170, 292, 1, 0.42, 1.5],
  [27, 376, 345, 170, 320, 1, 0.27, 1.3],
  [28, 379, 346, 170, 340, 1, 0.2, 0.7],
  [29, 380, 347, 170, 352, 1, 0.15, 0.3],
  [30, 380, 347, 170, 360, 1, 0.15, 0],
]
const col = (j) => FLIGHT.map((r) => [r[0], r[j]])
const FX = col(1), FY = col(2), FS = col(3), FR = col(4), FB = col(5), FU = col(6), FA = col(7)

export function slabPose(k, i, t, from) {
  const tileY = TILE.top + TILE.size / 2
  const x0 = from ?? SLOTS5[i], y0 = tileY
  const tileSize = TILE.size
  if (k < LAUNCH - 0.5) {
    const s = cr(BAR_SCALE, k) * tileSize
    return { x: x0, y: y0, size: s, ry: 0, rx: 0, inBar: true }
  }
  // blend from the bar pose into the flight keys
  const s15 = cr(BAR_SCALE, 15.5) * tileSize
  FX[0][1] = x0
  FY[0][1] = y0
  FS[0][1] = s15
  const x = cr(FX, k), y = cr(FY, k), size = cr(FS, k)
  let ry = cr(FR, k)
  const idle = idlePose(t, k)
  const rz = REST_RZ * clamp((k - LAUNCH) / 8)
  // flight lighting until it lands, then the idle sway lighting
  let light = swayLight(idle.sway)
  if (k < 30) light = { brightness: lin(FB, k), faceBand: { u: lin(FU, k), w: 0.13, a: lin(FA, k) } }
  return {
    x: x + idle.x,
    y: y + idle.y,
    size,
    ry: ((ry + idle.ry) * Math.PI) / 180,
    rx: (idle.rx * Math.PI) / 180,
    rz: (rz * Math.PI) / 180,
    ...light,
    inBar: false,
  }
}

// sway after landing, measured from the slab's apparent width and which glass edge shows
// (deg, + = right side toward the viewer), keyed in frames since select (video frames
// 198-418); after that it rests for ~4 s, then repeats the k 172-250 turn, every 200 frames.
const SWAY = [
  [30, 0], [36, 20], [42, 38], [48, 40], [54, 32], [60, 12], [66, 3], [72, 1],
  [82, -20], [88, -26], [94, -26], [102, -23], [112, -24], [120, -10], [128, 2],
  [172, 2], [180, -12], [188, -28], [198, -36], [210, -39], [222, -35], [230, -22],
  [238, -6], [250, 2],
]
export const REST_RZ = -4 // deg, the slab rests slightly tilted (top right raised)
function idlePose(t, k) {
  if (k < 29) return { x: 0, y: 0, ry: 0, rx: 0, sway: 0 }
  let kk = k
  if (k > 250) {
    const c = (k - 250) % 200
    kk = c < 122 ? 128 : 172 + (c - 122)
  }
  const sway = cr(SWAY, kk)
  return { x: 0, y: 0, ry: -sway, rx: 0, sway }
}

// light on the glass: turned right-side-away, a white band catches the left of the face;
// turned the other way the face falls into shade and the right glass edge lights up
export function swayLight(sway) {
  const a = clamp((-sway - 14) / 10)
  return {
    faceBand: { u: 0.27, w: 0.13, a: 0.95 * a },
    brightness: 1 - 0.5 * clamp((sway - 10) / 20),
  }
}

export const SLAB_REST = SLAB

// ------------------------------------------------------------------ row state over time
// Replays the selection changes up to t: per tile x (and whether its DOM tile is replaced by a
// slab), plus the slab records for Selected.jsx.
export const RETURN_FRAMES = 14
const indexOf = (id) => USERS.findIndex((u) => u.id === id)

export function rowState(t) {
  const n = USERS.length
  const sels = selections(t)
  let pos = USERS.map((_, i) => SLOTS5[i]) // settled positions before the change being replayed
  let sel = -1
  let change = null // { t, from: [x], to: [x], sel, prev }
  for (const s of sels) {
    const next = s.id ? indexOf(s.id) : -1
    // positions at the moment of this change (the previous change may still be sliding)
    if (change) pos = USERS.map((_, i) => tileX(change, i, s.t))
    const to = USERS.map((_, i) => slotX(i, next < 0 ? null : next))
    if (next >= 0) to[next] = pos[next]
    change = { t: s.t, from: pos, to, sel: next, prev: sel }
    sel = next
  }
  const records = []
  sels.forEach((s, j) => {
    if (!s.id) return
    const back = j + 1 < sels.length ? sels[j + 1].t : null
    if (back != null && (t - back) * FPS > RETURN_FRAMES + 3) return
    const index = indexOf(s.id)
    const at = sels[j]
    // launch from where the tile was; fly back to its slot in the next layout
    let from
    if (back == null) from = change && change.t === at.t ? change.from[index] : SLOTS5[index]
    else {
      const nextSel = sels[j + 1].id ? indexOf(sels[j + 1].id) : -1
      from = slotX(index, nextSel < 0 ? null : nextSel)
    }
    records.push({ id: s.id, index, t0: at.t, back, from })
  })
  const tiles = USERS.map((u, i) => {
    if (!change) return { x: SLOTS5[i], k: Infinity, sliding: false, slab: false }
    const k = (t - change.t) * FPS
    const x = tileX(change, i, t)
    const slab = records.some((r) => r.index === i && (r.back == null ? k > 2.5 : (t - r.back) * FPS < RETURN_FRAMES))
    const sliding = change.from[i] !== change.to[i] && k > slideStart(change) && k < slideStart(change) + SLIDE_FRAMES + 1
    return { x, k, sliding, slab, labelFade: sliding ? labelFade(change, k) : 1 }
  })
  return { tiles, records, sel, change }
}

const slideStart = (change) => (change.sel >= 0 ? SLIDE_START : 4)

function tileX(change, i, t) {
  const k = (t - change.t) * FPS
  const st = slideStart(change)
  const u = clamp((k - st) / SLIDE_FRAMES)
  const e = 1 - (1 - u) * (1 - u)
  const spread = change.sel >= 0 ? spreadX(i, change.sel, k) : 0
  return lerp(change.from[i] + spread, change.to[i], e)
}

// labels of sliding tiles fade out at once and come back as they settle
function labelFade(change, k) {
  const st = slideStart(change)
  return Math.max(1 - clamp((k - st) / 1.2), clamp((k - st - 5.5) / 3))
}
