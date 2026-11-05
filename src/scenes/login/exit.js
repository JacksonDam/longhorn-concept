// Element-wise exit after login.submit. k = seconds since submit. Fitted to frames 509-522.
import { clamp, ease, F } from '../../core/anim.js'

export const LOGIN_EXIT = F(16) // the login layer is gone 16 frames after submit

// flag: spins about its vertical axis and flies up-right, blurred
export function flagExit(k) {
  if (k <= 0) return {}
  const p = clamp(k / F(6))
  const e = ease.inCubic(p)
  return {
    transform: `translate(${e * 140}px, ${-e * 60}px) rotateY(${e * 160}deg)`,
    opacity: 1 - clamp((k - F(3)) / F(4)),
  }
}

export function wordsExit(k) {
  return { opacity: 1 - clamp((k - F(2)) / F(5)) }
}

// the whole layer dissolves to reveal the desktop
export function layerOpacity(k) {
  if (k <= 0) return 1
  return 1 - ease.inOut(clamp((k - F(2)) / F(11)))
}
