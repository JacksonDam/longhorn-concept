// The Plex-style arrow cursor, drawn inside the stage so it scales with the UI.
// Interactive: follows the real pointer (the system cursor is hidden over the stage).
// Demo: follows the scripted path (demo/cursor.js) evaluated at the clock time.
import { useEffect, useState } from 'react'
import { toStage } from './Stage.jsx'
import { useTime } from './time.jsx'

let live = { x: -100, y: -100 }
export const pointer = () => live

export function Cursor({ path }) {
  const t = useTime()
  const [, force] = useState(0)
  useEffect(() => {
    if (path) return
    const on = (e) => {
      live = toStage(e.clientX, e.clientY)
      force((n) => n + 1)
    }
    addEventListener('pointermove', on)
    addEventListener('pointerdown', on)
    return () => {
      removeEventListener('pointermove', on)
      removeEventListener('pointerdown', on)
    }
  }, [path])
  const p = path ? path(t) : live
  if (!p || p.hidden) return null
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      style={{ position: 'absolute', left: p.x, top: p.y, pointerEvents: 'none', zIndex: 10000, overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="cur-body" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#3a63ff" />
          <stop offset="0.45" stopColor="#1530c8" />
          <stop offset="1" stopColor="#050a30" />
        </linearGradient>
        <linearGradient id="cur-top" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9d2ff" />
        </linearGradient>
      </defs>
      {/* hotspot at 0,0: a stubby 3D arrowhead pointing up-left */}
      <path d="M0 0 L8.5 18 L11 9.5 L21 5.5 Z" fill="url(#cur-body)" />
      <path d="M0 0 L21 5.5 L11 9.5 Z" fill="url(#cur-top)" opacity="0.9" />
    </svg>
  )
}
