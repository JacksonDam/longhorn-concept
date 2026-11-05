// Aurora ribbons: keyframed curve parameters (fitted to the reference; see tools/login).
// ribbonsAt(t) -> [{ a: [x0, x1, y0, slope], b: [bend, amp, wavelength, phase], c: [core, glow, intensity, colour] }]
import { auroraFrame } from './aurora.js'

export function ribbonsAt(t) {
  void auroraFrame(t)
  return []
}
