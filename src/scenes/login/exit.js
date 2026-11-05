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

// bar tiles flip about their vertical axis and drop away, left to right, 2 frames apart
export function tileExit(k, i, sel) {
  if (k <= 0) return null
  const order = sel >= 0 && i > sel ? i - 1 : i
  const kk = k - F(1 + 2 * order)
  if (kk <= 0) return { transform: '', opacity: 1, moving: false }
  const p = clamp(kk / F(5))
  return {
    transform: ` translateY(${ease.inCubic(p) * 70}px) perspective(300px) rotateY(${p * 90}deg)`,
    opacity: 1 - clamp((kk - F(2)) / F(3)),
    moving: p < 1,
  }
}

// the slab flies up and away to the top right, blurred
export function slabExit(k, pose) {
  if (k <= 0) return pose
  const p = clamp(k / F(9))
  const e = ease.inCubic(p)
  return {
    ...pose,
    x: pose.x + e * 420,
    y: pose.y - e * 330,
    s: pose.s * (1 - 0.5 * e),
    ry: pose.ry + e * 1.5,
    opacity: (pose.opacity ?? 1) * (1 - clamp((k - F(5)) / F(5))),
  }
}

export function panelExit(k) {
  return { opacity: 1 - clamp((k - F(2)) / F(4)) }
}
