// Login scene geometry, measured on the reference frames (stage px). See docs/login-spec.md.
import { seam } from '../../core/Stage.jsx'

// On a stage wider or taller than the video's 960x720 frame (core/Stage.jsx: dw, dh past it) the
// login keeps the frame's relations: the Windows logo stays on the top right (+dw), Shut Down on
// the bottom left (+dh), the clock on the bottom right (+dw, +dh), the bar's band runs the full
// width on the bottom (+dh), and the frame's middle (the user tiles, the selected slab with its
// halo and the password panel, and the aurora's fitted field behind them) sits centred across on
// the bottom edge (+dw / 2, +dh). Offsets land on whole device pixels (seam), like the stage's
// corner, so what is placed in them rasterises the same as in the frame. At the frame's own size
// (?capture, ?bench, ?demo) they are 0.
export const frameOffset = ({ dw, dh }) => ({ x: seam(dw / 2), y: seam(dh) })
export const rightOffset = ({ dw }) => seam(dw)
export const bottomOffset = ({ dh }) => seam(dh)
// the screen's centre (the power screens, the shutting-down message): +dw / 2, +dh / 2
export const centreOffset = ({ dw, dh }) => ({ x: seam(dw / 2), y: seam(dh / 2) })

// "Microsoft Windows" lockup: the derived XP stacked logo (535 x 356.2 units) split into the
// pastel flag (flag.svg) and the two white words (wordmark.svg), both on the full canvas.
const LS = 142.1 / 535
export const LOGO = {
  x: 706.25,
  y: 48.4,
  w: 535 * LS,
  h: 356.207 * LS,
  flagOrigin: '78% 36%', // flag centre, for the exit spin
  vaio: { left: 762.75, top: 168.75, width: 76.5, height: 17.62 },
}

// Bottom bar
export const BAR = { top: 572 }

// User tiles
export const TILE = { size: 55.2, top: 607.2, labelY: 679 }
// centres for 5 tiles (nothing selected) and for the 4 left in the bar after a selection
export const SLOTS5 = [363.2, 463.2, 563.2, 663.2, 763.2]
export const SLOTS4 = [341.5, 438.3, 535, 631.7]

export const SHUTDOWN = { cx: 65.2, cy: 641.8, r: 14.7, labelY: 678 }
export const CLOCK = { left: 825.5, top: 632, width: 101.5, height: 27.5 }

// Selected user: slab resting place and the password panel
export const SLAB = { cx: 380, cy: 342, w: 158, h: 160, d: 26 }
export const PANEL = { left: 517, top: 297 }
