// A wrapper for content placed by left / top in stage px: a point at the stage's origin rather
// than a full-stage box (`inset: 0`). Content renders the same; what changes is the box WebKit
// backs. WebKit composites any layer that paints above a composited one and overlaps it (the
// glass of the sidebar and the taskbar, a window, a canvas) and backs it at its own box plus its
// content's: a full-stage wrapper around a clock or a flag got a stage-sized backing store
// (~4 MB a buffer on a phone), a point gets one the size of its content. Don't use it where the
// box itself matters: hit areas spanning the stage, right / bottom / % placement inside it,
// overflow or clip on it, a background on it.
export const POINT = { position: 'absolute', left: 0, top: 0, width: 0, height: 0 }
