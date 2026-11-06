// WebKit's composited layers at a state: every layer with its backing memory and WebKit's
// compositing reasons (Web Inspector's LayerTree domain, reached through Playwright WebKit's
// in-process server: an internal API, so a Playwright update may move it), grouped by size and
// reason, with the element that owns each. For finding what a phone's memory goes to: a layer
// costs its size before any CSS transform x devicePixelRatio^2 x 4 bytes, double-buffered while
// it changes, whatever it shows (docs/briefs/perf.md, Memory). "overlap" layers are composited
// only because they paint above another composited layer and overlap it; a full-stage wrapper
// (inset: 0) around small content is then backed at the full stage.
//
// usage: node tools/layers.mjs [--url http://127.0.0.1:5311/longhorn-concept/] [--query rehearse=none]
//          [--at 3] [--emit "js"] [--wait 1500] [--device iphone|land|ipad] [--all]
//   --at s:      app time (seconds of the OS clock) to wait for after the boot (the real OS by
//                default; add demo&scenario=... to --query for a scripted session)
//   --emit js:   run in the page after that (e.g. "__lh.emit('login.select',{id:'sondra'})"),
//                then wait --wait ms
//   --all:       every layer over 0.5 MB, not just the groups
import { webkit } from 'playwright'

const args = process.argv.slice(2)
const opt = (n, d) => {
  const i = args.indexOf(n)
  return i < 0 ? d : args[i + 1]
}
const base = opt('--url', 'http://127.0.0.1:5311/longhorn-concept/')
const query = opt('--query', 'rehearse=none')
const at = +opt('--at', 3)
const emit = opt('--emit', null)
const wait = +opt('--wait', 1500)
const all = args.includes('--all')
const DEV = { iphone: [390, 844, 3], land: [844, 390, 3], ipad: [834, 1194, 2] }[opt('--device', 'iphone')]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const b = await webkit.launch({ headless: true })
const ctx = await b.newContext({ viewport: { width: DEV[0], height: DEV[1] }, deviceScaleFactor: DEV[2], isMobile: true, hasTouch: true })
const page = await ctx.newPage()
await page.goto(base + (base.includes('?') ? '&' : '?') + query)
for (let i = 0; i < 300 && !(await page.evaluate(() => !!(window.__lh && window.__lh.booted)).catch(() => false)); i++) await sleep(100)
for (let i = 0; i < 1200 && (await page.evaluate(() => window.__lh.now())) < at; i++) await sleep(50)
if (emit) await page.evaluate(emit), await sleep(wait)

const server = page._connection?.toImpl?.(page)
const session = server?.delegate?._session
if (!session) throw new Error("no access to Playwright WebKit's inspector session (an internal API: has Playwright changed?)")
const send = (m, p = {}) => session.send(m, p)
await send('LayerTree.enable')
const doc = await send('DOM.getDocument')
const { layers } = await send('LayerTree.layersForNode', { nodeId: doc.root.nodeId })
const DESCRIBE = `function () {
  const e = this, at = []
  for (let y = e; y && y.id !== 'stage' && y.parentElement; y = y.parentElement) at.unshift([...y.parentElement.children].indexOf(y))
  const c = e.firstElementChild, text = (e.textContent || '').replace(/\\s+/g, ' ').slice(0, 40)
  return 'stage child ' + at.join('.') + ' <' + e.tagName.toLowerCase() + (e.getAttribute('src') ? ' src=' + e.getAttribute('src').split('/').pop() : '') + '> opacity ' + getComputedStyle(e).opacity +
    ', ' + e.children.length + ' children' + (text ? ', text "' + text + '"' : '') + (c ? ', first child <' + c.tagName.toLowerCase() + ' style="' + (c.getAttribute('style') || '').slice(0, 70) + '">' : '') +
    ', style "' + (e.getAttribute('style') || '').slice(0, 110) + '"'
}`
const rows = []
for (const l of layers) {
  const r = await send('LayerTree.reasonsForCompositingLayer', { layerId: l.layerId }).catch(() => ({ compositingReasons: {} }))
  const why = Object.keys(r.compositingReasons || {}).filter((k) => r.compositingReasons[k]).join(',') || '-'
  let desc = l.isGeneratedContent ? 'pseudo-element' : 'the page (root)'
  if (l.nodeId)
    try {
      const { object } = await send('DOM.resolveNode', { nodeId: l.nodeId })
      desc = (await send('Runtime.callFunctionOn', { objectId: object.objectId, functionDeclaration: DESCRIBE, returnByValue: true })).result.value ?? desc
    } catch { /* gone */ }
  rows.push({ mb: (l.memory || 0) / 1048576, size: `${Math.round(l.bounds.width)}x${Math.round(l.bounds.height)}`, why, desc })
}
const now = await page.evaluate(() => window.__lh.now())
console.log(`layers at app time ${now.toFixed(2)} s (${page.url().replace(/^https?:\/\/[^/]+/, '')}): ${rows.length} layers, ${rows.reduce((a, r) => a + r.mb, 0).toFixed(0)} MB of backing stores (one buffer each; sizes in screen points)`)
const groups = {}
for (const r of rows) {
  const g = (groups[r.size + ' ' + r.why] ??= { n: 0, mb: 0, ex: r.desc })
  g.n++, (g.mb += r.mb)
}
for (const [k, g] of Object.entries(groups).sort((a, b) => b[1].mb - a[1].mb).slice(0, 30)) console.log(`${String(g.n).padStart(4)} ${g.mb.toFixed(1).padStart(7)} MB  ${k.padEnd(44)} e.g. ${g.ex}`)
if (all) {
  console.log('layers over 0.5 MB:')
  for (const r of rows.filter((r) => r.mb > 0.5).sort((a, b) => b.mb - a.mb)) console.log(`  ${r.mb.toFixed(1).padStart(5)} MB  ${r.size.padEnd(9)} ${r.why.padEnd(20)} ${r.desc}`)
}
await b.close()
