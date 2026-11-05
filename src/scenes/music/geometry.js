// Measured layout of the my Music window (reference frame 800, settled).
// Stage px; the window's own layout is authored in window-local px (stage - WIN.x/y).
export const WIN = { x: 45, y: 23, w: 777, h: 653, r: 8 }

// stage -> window-local helpers for authoring
export const lx = (x) => x - WIN.x
export const ly = (y) => y - WIN.y

// album grid (stage px): tile top-left corners, 50 px tiles
export const GRID = {
  xs: [246, 314.5, 381, 447.5, 514, 581, 649, 717],
  ys: [394, 462.5, 529.5, 597],
  size: 50,
}

// the header's 3D slab (device / album) centre and size in window-local px
export const SLAB = { cx: 321 - WIN.x, cy: 233 - WIN.y, size: 150 }

export const TWEET_INDEX = 10 // row 2, column 3
