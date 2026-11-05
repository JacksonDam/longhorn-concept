// One clock drives every animation, so a frame is a pure function of time.
// Real mode follows performance.now() from the moment the boot (core/boot.js) starts it; until
// then it is held, and the boot's warm-up seeks it like capture does. Capture mode (?capture) is
// seeked by the capture tool through window.__lh.seek(t) and never advances on its own.

export const FPS = 30000 / 1001 // the reference video's frame rate
export const frameTime = (n) => ((n - 1) * 1001) / 30000 // 1-based video frame -> seconds

const params = new URLSearchParams(location.search)
// ?bench: capture mode whose clock steps one video frame per animation frame, as fast as the
// browser renders (tools/bench.mjs measures the frame intervals). Same rendering path as capture.
export const BENCH = params.has('bench')
export const CAPTURE = params.has('capture') || BENCH

let virtualT = 0
let origin = performance.now()
let speed = 1
// real mode: held (at virtualT) until startClock()
let running = false

export function now() {
  return CAPTURE || !running ? virtualT : ((performance.now() - origin) / 1000) * speed
}

// real mode: the boot is done, time starts now at t = 0
export function startClock() {
  if (CAPTURE || running) return
  virtualT = 0
  origin = performance.now()
  running = true
  tick()
}
export const clockRunning = () => running
// the boot's warm-up: show time t while the clock is held (capture: the same as seek)
export function holdAt(t) {
  if (running) return
  virtualT = t
  tick()
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

let bench = null // { frames: [n...], i, out: [[n, dt]], last, resolve }
let damage = null
function loop() {
  if (bench) {
    const now = performance.now()
    if (bench.i > 0) bench.out.push([bench.frames[bench.i - 1], now - bench.last])
    bench.last = now
    if (bench.i < bench.frames.length) {
      virtualT = frameTime(bench.frames[bench.i++])
      // a 1 px change every frame, so the browser never idles down to the display rate
      damage.style.background = bench.i % 2 ? '#010101' : '#020202'
      tick()
    } else {
      const done = bench
      bench = null
      done.resolve(done.out)
    }
  } else if (!CAPTURE) tick()
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

// ?bench: render `frames` back to back; resolves to [[frame, ms until the next frame], ...]
export function runBench(frames) {
  if (!damage) {
    damage = document.createElement('div')
    damage.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;z-index:99999;pointer-events:none'
    document.body.appendChild(damage)
  }
  return new Promise((resolve) => {
    bench = { frames, i: 0, out: [], last: performance.now(), resolve }
  })
}

// capture / debugging hooks
export function seek(t) {
  if (CAPTURE || !running) virtualT = t
  else origin = performance.now() - (t / speed) * 1000
  tick()
}
export function setSpeed(s) {
  const t = now()
  speed = s
  origin = performance.now() - (t / speed) * 1000
}
