// One clock drives every animation, so a frame is a pure function of time.
// Real mode follows performance.now(); capture mode (?capture) is seeked by the
// capture tool through window.__lh.seek(t) and never advances on its own.

export const FPS = 30000 / 1001 // the reference video's frame rate
export const frameTime = (n) => ((n - 1) * 1001) / 30000 // 1-based video frame -> seconds

const params = new URLSearchParams(location.search)
export const CAPTURE = params.has('capture')

let virtualT = 0
let origin = performance.now()
let speed = 1

export function now() {
  return CAPTURE ? virtualT : ((performance.now() - origin) / 1000) * speed
}

const subs = new Set()
export function onFrame(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

function tick() {
  const t = now()
  for (const fn of subs) fn(t)
}

function loop() {
  if (!CAPTURE) tick()
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

// capture / debugging hooks
export function seek(t) {
  if (CAPTURE) virtualT = t
  else origin = performance.now() - (t / speed) * 1000
  tick()
}
export function setSpeed(s) {
  const t = now()
  speed = s
  origin = performance.now() - (t / speed) * 1000
}
