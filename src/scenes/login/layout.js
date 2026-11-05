// Login scene geometry, measured on the reference frames (stage px). See docs/login-spec.md.

// "Microsoft Windows" lockup: the derived XP stacked logo (535 x 356.2 units) split at y=257
// into the flag (flag.svg) and the words (wordmark.svg).
const LS = 142.1 / 535
export const LOGO = {
  x: 706.6,
  y: 48.6,
  w: 535 * LS,
  cut: 257 * LS,
  h: 356.207 * LS,
  vaio: { left: 763.2, top: 169.2, width: 76.5, height: 17.62 },
}

// Bottom bar
export const BAR = { top: 573.5 }

// User tiles
export const TILE = { size: 54.5, top: 607.2, labelY: 678 }
// centres for 5 tiles (nothing selected) and for the 4 left in the bar after a selection
export const SLOTS5 = [363.2, 463.2, 563.2, 663.2, 763.2]
export const SLOTS4 = [341.5, 438.3, 535, 631.7]

export const SHUTDOWN = { cx: 65.5, cy: 641.5, r: 15, labelY: 677 }
export const CLOCK = { left: 825, top: 632, width: 103, height: 27 }

// Selected user: slab resting place and the password panel
export const SLAB = { cx: 380, cy: 342, w: 158, h: 160, d: 26 }
export const PANEL = { left: 517, top: 297 }
