// The Plex-style arrow cursor, drawn inside the stage so it scales with the UI.
// Interactive: follows the real pointer (the system cursor is hidden over the stage).
// Demo: follows the scripted path (demo/cursor.js) evaluated at the clock time, with the
// same multi-sample motion blur as the video (fast moves show as a streak).
import { memo, useEffect, useState } from 'react'
import { toStage } from './Stage.jsx'
import { useTime, nextFrame } from './time.jsx'
import { FPS } from './clock.js'
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

export function Cursor({ path }) {
  const t = useTime()
  const [, force] = useState(0)
  useEffect(() => {
    if (path) return
    const on = (e) => {
      live = toStage(e.clientX, e.clientY)
      force((n) => n + 1)
      logPointer(live)
    }
    const out = () => logPointer({ hidden: true })
    addEventListener('pointermove', on)
    addEventListener('pointerdown', on)
    document.documentElement.addEventListener('pointerleave', out)
    return () => {
      removeEventListener('pointermove', on)
      removeEventListener('pointerdown', on)
      document.documentElement.removeEventListener('pointerleave', out)
    }
  }, [path])
  const base = { position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 10000 }
  if (!path) {
    return (
      <div style={{ ...base, transform: `translate(${live.x}px, ${live.y}px)` }}>
        <Arrow />
      </div>
    )
  }
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
