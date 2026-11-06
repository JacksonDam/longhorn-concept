// Text widths, for laying out text-plus-arrow controls (drop-down labels, breadcrumbs) and for
// sizing boxes to their text. A canvas 2D context measures with the browser's own shaping: the
// widths equal SVGTextContentElement.getComputedTextLength and the HTML layout of the same text.
// A width is cached once its face has loaded (document.fonts.check on the first family of the
// list); until then the fallback face's width is returned and not kept (the boot loads every
// face before a window draws, and ?capture waits for the fonts).
//   textWidth(text, { size, w, f, ls, sx })   w: weight, f: font-family list, ls: letter spacing,
//                                              sx: horizontal scale (Txt's sx)
//   runsWidth([[text, { w, f, size, ls }], ...], base)   consecutive runs (Txt parts)
//   wrapLines(text, maxW, opts)   the lines a white-space: pre-wrap box of width maxW breaks into
import { FONT } from './theme.js'

let ctx = null
const cache = new Map()
const loaded = new Map()

function faceLoaded(w, size, f) {
  if (typeof document === 'undefined' || !document.fonts) return true
  const first = f.split(',')[0].trim()
  const k = `${w} ${size}px ${first}`
  if (loaded.get(k)) return true
  const ok = document.fonts.check(k)
  if (ok) loaded.set(k, true)
  return ok
}

export function textWidth(text, { size = 12, w = 400, f = FONT, ls = 0, sx = 1 } = {}) {
  const s = String(text ?? '')
  const font = `${w} ${size}px ${f}`
  const key = font + '\u0001' + s
  let v = cache.get(key)
  if (v == null) {
    if (typeof document === 'undefined') return s.length * size * 0.52 * sx
    ctx ??= document.createElement('canvas').getContext('2d')
    ctx.font = font
    v = ctx.measureText(s).width
    if (faceLoaded(w, size, f)) {
      if (cache.size > 4000) cache.clear()
      cache.set(key, v)
    }
  }
  return (v + ls * s.length) * sx
}

export function runsWidth(runs, { size = 12, w = 400, f = FONT, ls = 0, sx = 1 } = {}) {
  let sum = 0
  for (const [t, st = {}] of runs) sum += textWidth(t, { size: st.size ?? size, w: st.w ?? w, f: st.f ?? f, ls: st.ls ?? ls })
  return sum * sx
}

// greedy word wrap on spaces, as the browser wraps normal text; '\n' breaks a line
export function wrapLines(text, maxW, opts) {
  const out = []
  for (const para of String(text ?? '').split('\n')) {
    const words = para.split(' ')
    let line = ''
    for (const wd of words) {
      const next = line ? line + ' ' + wd : wd
      if (line && textWidth(next, opts) > maxW) {
        out.push(line)
        line = wd
      } else line = next
    }
    out.push(line)
  }
  return out
}
