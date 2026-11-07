// The Plex-style arrow cursor, drawn inside the stage so it scales with the UI.
// Demo: follows the scripted path (demo/cursor.js) evaluated at the clock time, with the
// same multi-sample motion blur as the video (fast moves show as a streak).
// Interactive: follows the real pointer (the system cursor is hidden over the stage) with the
// same blur: the pointer's recent reports (every coalesced one, at the mouse's own rate) with
// their times, and SAMPLES copies at the positions it had over the SHUTTER up to its newest
// report. A still pointer is one crisp arrow. It never renders through React: its copies are
// mounted once and moved by a per-frame callback that writes their transforms.
import { memo, useEffect, useRef } from 'react'
import { toStage, FIT, seam } from './Stage.jsx'
import { useTime, nextFrame } from './time.jsx'
import { FPS, onFrame } from './clock.js'
import { emit } from './events.js'
import { lastOfType } from '../os/logIndex.js'

let live = { x: -100, y: -100 }
export const pointer = () => live

// The pointer as input to visuals that follow it (my Music's slabs turn toward it): 'ptr' events
// { x, y } (stage px) or { hidden }, logged from the real pointer's moves while something wants
// them (wantPointer), one a frame at the frame's time. Never under ?demo / ?capture (the cursor
// follows a path there and nothing is logged): those draw the video's input only.
let wanted = 0
export function wantPointer() {
  wanted++
  return () => wanted--
}
let queued = false
function logPointer(p) {
  if (!wanted || queued) return
  queued = true
  nextFrame((t) => {
    queued = false
    const last = lastOfType(t, 'ptr')
    if (p.hidden ? last && !last.hidden : !last || last.hidden || last.x !== live.x || last.y !== live.y)
      emit('ptr', p.hidden ? { hidden: true } : { x: Math.round(live.x * 10) / 10, y: Math.round(live.y * 10) / 10 }, t)
  })
}

const Arrow = memo(function Arrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        <linearGradient id="cur-body" x1="0.55" y1="0.1" x2="0.3" y2="1">
          <stop offset="0" stopColor="#5b86ff" />
          <stop offset="0.3" stopColor="#2346ec" />
          <stop offset="0.62" stopColor="#10208c" />
          <stop offset="1" stopColor="#01030c" />
        </linearGradient>
        <linearGradient id="cur-top" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#e6efff" />
          <stop offset="1" stopColor="#9fbcff" />
        </linearGradient>
      </defs>
      {/* hotspot at 0,0: a stubby 3D arrowhead pointing up-left */}
      <path d="M0 0 L20.5 5.2 L12.2 9.6 L9.2 19.5 Z" fill="url(#cur-body)" />
      <path d="M0.6 0.5 L20.5 5.2 L18.6 6.4 L2.8 2.6 Z" fill="url(#cur-top)" />
      <path d="M0 0 L9.2 19.5" stroke="#000a40" strokeWidth="1" opacity="0.55" />
    </svg>
  )
})

const SAMPLES = 12
const SHUTTER = 0.75 / FPS

// ?demo&fit: the video's cursor path is drawn for the frame, not the screen's shape: hidden
const HIDDEN = () => ({ hidden: true })
const base = { position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 10000 }

export function Cursor({ path }) {
  if (FIT && path) path = HIDDEN
  return path ? <DemoCursor path={path} /> : <LiveCursor />
}

// ---- interactive -----------------------------------------------------------------------------
// The pointer's reports: a ring of stage positions and times (ms, performance.now()'s clock: the
// events' timeStamp, LiveCursor's on), every coalesced report of a move (a 1000 Hz mouse sends
// several a frame).
// 512 reports hold the shutter at an 8 kHz rate.
const RING = 512
const rx = new Float64Array(RING)
const ry = new Float64Array(RING)
const rt = new Float64Array(RING)
let count = 0 // reports so far (the newest at (count - 1) % RING)
function report(x, y, t) {
  if (count) {
    const j = (count - 1) % RING
    if (t < rt[j]) t = rt[j]
  }
  const i = count % RING
  rx[i] = x
  ry[i] = y
  rt[i] = t
  count++
}
// the copies' positions at the shutter's sample times, oldest first: linear between reports,
// held before the oldest kept and after the newest
const cx = new Float64Array(SAMPLES)
const cy = new Float64Array(SAMPLES)
function shutterPositions(tEnd) {
  const lo = Math.max(0, count - RING)
  let j = count - 1
  for (let k = SAMPLES - 1; k >= 0; k--) {
    const tk = tEnd - SHUTTER * 1000 * (1 - (k + 0.5) / SAMPLES)
    while (j > lo && rt[j % RING] > tk) j--
    const a = j % RING
    if (rt[a] >= tk || j === count - 1) {
      cx[k] = rx[a]
      cy[k] = ry[a]
    } else {
      const b = (j + 1) % RING
      const f = (tk - rt[a]) / (rt[b] - rt[a])
      cx[k] = rx[a] + (rx[b] - rx[a]) * f
      cy[k] = ry[a] + (ry[b] - ry[a]) * f
    }
  }
}

// The streak: each copy is its own small compositing layer (will-change), so moving it is a
// compositor transform, not a repaint (and a layerisation) of whatever it passes over; hidden
// ones are visibility: hidden. A copy's 1 / SAMPLES opacity is painted into its layer (an inner
// element): WebKit drew plus-lighter layers at full strength with the opacity on the layer. The
// still arrow is painted, not a layer: Chrome rasterises a will-change layer under the stage's
// scale soft (the arrow measured blurred at 1920 x 1080).
const LAYER = { position: 'absolute', left: 0, top: 0, willChange: 'transform', mixBlendMode: 'plus-lighter', transform: 'translate(-100px, -100px)', visibility: 'hidden' }
const FAINT = { position: 'absolute', left: 0, top: 0, opacity: 1 / SAMPLES }
const STILL = { position: 'absolute', left: 0, top: 0, transform: 'translate(-100px, -100px)' }
const GROUP = { position: 'absolute', left: 0, top: 0, width: 0, height: 0, isolation: 'isolate' }
const KEYS = Array.from({ length: SAMPLES }, (_, k) => k)

const LiveCursor = memo(function LiveCursor() {
  const els = useRef([]) // the copies, then the still arrow (els[SAMPLES])
  useEffect(() => {
    const on = (e) => {
      // (WebKit stamps events on another clock, a system one: there an event counts as handled
      // now, and its coalesced reports keep their spacing)
      const now = performance.now()
      const off = Math.abs(now - e.timeStamp) > 1000 ? now - e.timeStamp : 0
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null
      if (list && list.length) for (const c of list) add(c, off)
      else add(e, off)
      const i = (count - 1) % RING
      live = { x: rx[i], y: ry[i] }
      // (not while a button is down: a drag or a resize carries the pointer with the window, the
      // slabs it feeds don't turn, and a log event a frame would cost the drag)
      if (!e.buttons) logPointer(live)
    }
    const out = () => logPointer({ hidden: true })
    addEventListener('pointermove', on)
    addEventListener('pointerdown', on)
    document.documentElement.addEventListener('pointerleave', out)
    // what each element shows now: [transform, visible]; written only when it changes
    const shown = [...KEYS.map(() => ['translate(-100px, -100px)', false]), ['translate(-100px, -100px)', true]]
    const set = (k, tr, vis) => {
      const el = els.current[k]
      const s = shown[k]
      if (!el) return
      if (vis !== s[1]) el.style.visibility = (s[1] = vis) ? 'visible' : 'hidden'
      if (vis && tr !== s[0]) el.style.transform = s[0] = tr
    }
    // The shutter ends at the newest report: a report reaches the page some ms after the mouse
    // sent it, so a shutter ending at the frame's time would hold its newest copies on the newest
    // report (a bright head). lag: how old the newest report was on the frame that first drew it;
    // once the pointer stops, the shutter runs on from there and the streak closes into one arrow.
    let drawn = 0
    let lag = 0
    // (on whole device pixels: a layer at a fractional offset is composited resampled)
    const at = (k) => `translate(${seam(cx[k])}px, ${seam(cy[k])}px)`
    const draw = () => {
      if (!count) return
      const now = performance.now()
      if (count !== drawn) {
        drawn = count
        lag = Math.min(50, Math.max(0, now - rt[(count - 1) % RING]))
      }
      shutterPositions(now - lag)
      const moving = Math.hypot(cx[0] - cx[SAMPLES - 1], cy[0] - cy[SAMPLES - 1]) > 1
      for (let k = 0; k < SAMPLES; k++) set(k, moving ? at(k) : null, moving)
      set(SAMPLES, moving ? null : at(SAMPLES - 1), !moving)
    }
    const stop = onFrame(draw)
    return () => {
      stop()
      removeEventListener('pointermove', on)
      removeEventListener('pointerdown', on)
      document.documentElement.removeEventListener('pointerleave', out)
    }
  }, [])
  return (
    <div style={{ ...base, width: 0, height: 0 }}>
      <div style={GROUP}>
        {KEYS.map((k) => (
          <div key={k} ref={(e) => (els.current[k] = e)} style={LAYER}>
            <div style={FAINT}>
              <Arrow />
            </div>
          </div>
        ))}
      </div>
      <div ref={(e) => (els.current[SAMPLES] = e)} style={STILL}>
        <Arrow />
      </div>
    </div>
  )
})
const add = (e, off) => {
  const p = toStage(e.clientX, e.clientY)
  report(p.x, p.y, e.timeStamp + off)
}

// ---- demo ------------------------------------------------------------------------------------
function DemoCursor({ path }) {
  const t = useTime()
  const samples = []
  for (let k = 0; k < SAMPLES; k++) samples.push(path(t + SHUTTER * ((k + 0.5) / SAMPLES - 0.5)))
  const vis = samples.filter((p) => p && !p.hidden)
  if (!vis.length) return null
  const moving = vis.length > 1 && Math.hypot(vis[0].x - vis[vis.length - 1].x, vis[0].y - vis[vis.length - 1].y) > 1
  if (!moving) {
    const p = path(t)
    if (!p || p.hidden) return null
    return (
      <div style={{ ...base, transform: `translate(${p.x}px, ${p.y}px)` }}>
        <Arrow />
      </div>
    )
  }
  return (
    <div style={{ ...base, width: 0, height: 0, isolation: 'isolate' }}>
      {vis.map((p, k) => (
        <div
          key={k}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${p.x}px, ${p.y}px)`,
            opacity: 1 / SAMPLES,
            mixBlendMode: 'plus-lighter',
          }}
        >
          <Arrow />
        </div>
      ))}
    </div>
  )
}
