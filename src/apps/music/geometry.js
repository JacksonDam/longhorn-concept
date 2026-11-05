// Measured layout of the my Music window (reference frame 800, settled).
// Stage px; the window's own layout is authored in window-local px (stage - WIN.x/y).
export const WIN = { x: 45, y: 23, w: 777, h: 654, r: 8 }

// stage -> window-local helpers for authoring
export const lx = (x) => x - WIN.x
export const ly = (y) => y - WIN.y

// album grid (stage px): cover top-left corners, 49 px covers
export const GRID = {
  xs: [248, 315, 381, 448, 514, 581, 649, 717],
  ys: [395, 463, 529.5, 597.5],
  size: 49,
}

// the header's 3D slab (device / album) centre and size in window-local px
export const SLAB = { cx: 321 - WIN.x, cy: 233 - WIN.y, size: 150 }

export const TWEET_INDEX = 10 // row 2, column 3
