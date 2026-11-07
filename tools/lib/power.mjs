// The power button (src/scenes/session/powerButton.js): in real use the OS opens on it and boots
// only when it is pressed, so a tool that loads the real app presses it, with real input, the way
// a user does: a click at its centre. Pages without it (?capture, ?bench, ?demo, ?scenario=...,
// ?nopower) are left alone. Call right after the navigation; it returns once the press is done
// (true) or the page has no button (false).
//
//   CDP:        await pressPower(send, evaluate)        (send: Input.dispatchMouseEvent)
//   Playwright: await pressPowerPage(page, { touch })   (touch: a tap, for phone contexts)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// the button's centre in input px, 'none' once the app is up without it, null while loading (on a
// phone the page is laid out at the stage's width and zoomed to the screen, index.html: input
// coordinates are the visual viewport's, the layout's scaled by its zoom)
const FIND = `(() => {
  const e = document.querySelector('#lh-power .b')
  if (!e) return window.__lh ? 'none' : null
  const r = e.getBoundingClientRect(), v = window.visualViewport || { scale: 1, offsetLeft: 0, offsetTop: 0 }
  return r.width ? { x: (r.x + r.width / 2 - v.offsetLeft) * v.scale, y: (r.y + r.height / 2 - v.offsetTop) * v.scale } : null
})()`

async function find(evaluate, timeout) {
  const t0 = Date.now()
  for (;;) {
    const b = await evaluate(FIND).catch(() => null)
    if (b) return b === 'none' ? null : b
    if (Date.now() - t0 > timeout) throw new Error('tools/lib/power.mjs: neither the power button nor the app showed up')
    await sleep(50)
  }
}

export async function pressPower(send, evaluate, { timeout = 30000 } = {}) {
  const b = await find(evaluate, timeout)
  if (!b) return false
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y })
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', buttons: 1, clickCount: 1 })
  await sleep(50)
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', buttons: 0, clickCount: 1 })
  return true
}

export async function pressPowerPage(page, { touch = false, timeout = 30000 } = {}) {
  const b = await find((x) => page.evaluate(x), timeout)
  if (!b) return false
  if (touch) await page.touchscreen.tap(b.x, b.y)
  else await page.mouse.click(b.x, b.y, { delay: 50 })
  return true
}
