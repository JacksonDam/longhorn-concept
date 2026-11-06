// ?report=<url>: a test harness's sink (tools/memory.mjs). Every half second the page posts its
// clock (null until the boot is done), the boot's timings, its animation frames since the last
// post (how many, the longest, how many over 50 and 100 ms) and any errors (uncaught, unhandled
// rejections, console.error: what an error boundary logs) and its layout (CSS px, page zoom,
// device px per CSS px, the stage's scale), so a browser that can't be scripted
// (Mobile Safari on the iOS Simulator) reports them too. Imported first (main.jsx), so its
// listeners are up before the app's modules run. It draws nothing and changes nothing else.
const sink = new URLSearchParams(location.search).get('report')
if (sink) {
  const errors = []
  const err = (s) => errors.length < 50 && errors.push(String(s).slice(0, 600))
  addEventListener('error', (e) => err(e.error?.stack || e.message || 'error'))
  addEventListener('unhandledrejection', (e) => err('unhandled rejection: ' + (e.reason?.stack || e.reason)))
  const ce = console.error
  console.error = (...a) => {
    err('console.error: ' + a.map(String).join(' '))
    ce.apply(console, a)
  }
  let n = 0, max = 0, over50 = 0, over100 = 0, prev = 0
  const tick = (ts) => {
    if (prev) {
      const dt = ts - prev
      n++
      if (dt > max) max = dt
      if (dt > 50) over50++
      if (dt > 100) over100++
    }
    prev = ts
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  let seq = 0
  setInterval(() => {
    const lh = window.__lh
    const on = !!(lh && lh.booted)
    const st = document.getElementById('stage')
    // the page's layout: CSS px, the page zoom, device px per CSS px, the stage's scale
    const view = { w: innerWidth, h: innerHeight, zoom: window.visualViewport ? visualViewport.scale : null, dpr: devicePixelRatio, stage: st ? st.getBoundingClientRect().width / 960 : null, screen: screen.width + 'x' + screen.height, meta: document.querySelector('meta[name=viewport]')?.content }
    const body = { seq: seq++, app: on ? lh.now() : null, boot: on ? { ...lh.bootStats, trace: undefined } : null, frames: { n, max: Math.round(max), over50, over100 }, errors: errors.splice(0), view, ua: seq === 1 ? navigator.userAgent : undefined }
    n = max = over50 = over100 = 0
    try {
      navigator.sendBeacon(sink, JSON.stringify(body))
    } catch {
      /* no beacon */
    }
  }, 500)
}
