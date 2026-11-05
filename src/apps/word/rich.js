// Rich text model for Word: plain text + formatting runs + per-paragraph attributes.
//   doc = { text, runs: [{ len, b, i, u, size, font, color }], paras: [{ align, bullet }] }
// Edits arrive as a new plain text from the hidden textarea; diff() maps them onto the runs.
export const BASE = { b: false, i: false, u: false, size: 12, font: 'Times New Roman', color: '#000000' }
export const PARA = { align: 'left', bullet: false }
const KEYS = ['b', 'i', 'u', 'size', 'font', 'color']
const same = (x, y) => KEYS.every((k) => x[k] === y[k])
const fmtOf = (r) => {
  const o = {}
  for (const k of KEYS) o[k] = r[k]
  return o
}

export function makeDoc(paragraphs) {
  // paragraphs: [{ text, ...fmt, align, bullet }]
  let text = ''
  const runs = []
  const paras = []
  paragraphs.forEach((p, i) => {
    const t = p.text + (i < paragraphs.length - 1 ? '\n' : '')
    text += t
    runs.push({ len: t.length, ...BASE, ...pick(p) })
    paras.push({ ...PARA, align: p.align || 'left', bullet: !!p.bullet })
  })
  return { text, runs: normalize(runs), paras }
}
const pick = (p) => {
  const o = {}
  for (const k of KEYS) if (p[k] !== undefined) o[k] = p[k]
  return o
}

export function normalize(runs) {
  const out = []
  for (const r of runs) {
    if (r.len <= 0) continue
    const l = out[out.length - 1]
    if (l && same(l, r)) l.len += r.len
    else out.push({ ...r })
  }
  return out
}

// split so that a run starts at pos; returns [runs, index of the run starting at pos]
function splitAt(runs, pos) {
  const out = []
  let o = 0
  let idx = -1
  for (const r of runs) {
    if (pos > o && pos < o + r.len) {
      out.push({ ...r, len: pos - o })
      idx = out.length
      out.push({ ...r, len: o + r.len - pos })
    } else {
      if (o === pos && idx < 0) idx = out.length
      out.push({ ...r })
    }
    o += r.len
  }
  if (idx < 0) idx = out.length
  return [out, idx]
}

export function fmtAt(runs, pos) {
  let o = 0
  let last = BASE
  for (const r of runs) {
    if (pos > o && pos <= o + r.len) return fmtOf(r)
    if (pos === 0 && r.len) return fmtOf(r)
    o += r.len
    last = r
  }
  return fmtOf(last)
}

export function applyRange(runs, a, b, patch) {
  if (b <= a) return runs
  let [r1] = splitAt(runs, a)
  ;[r1] = splitAt(r1, b)
  let o = 0
  const out = r1.map((r) => {
    const s = o
    o += r.len
    return s >= a && s + r.len <= b ? { ...r, ...patch } : r
  })
  return normalize(out)
}

// does every character in [a, b) have fmt[k] === v?
export function allHave(runs, a, b, k, v) {
  let o = 0
  for (const r of runs) {
    const s = o
    o += r.len
    if (o <= a || s >= b) continue
    if (r[k] !== v) return false
  }
  return true
}

// new text from the textarea -> new doc (inserted characters take `insFmt`, or the format before them)
export function edit(doc, text, insFmt) {
  const old = doc.text
  let p = 0
  const maxP = Math.min(old.length, text.length)
  while (p < maxP && old[p] === text[p]) p++
  let s = 0
  while (s < old.length - p && s < text.length - p && old[old.length - 1 - s] === text[text.length - 1 - s]) s++
  const removed = old.slice(p, old.length - s)
  const inserted = text.slice(p, text.length - s)
  const f = insFmt || fmtAt(doc.runs, p)
  // runs: keep [0, p), insert `inserted`, keep [p + removed, end)
  const [rA, iA] = splitAt(doc.runs, p)
  const [rB, iB] = splitAt(doc.runs, p + removed.length)
  const runs = normalize([...rA.slice(0, iA), ...(inserted.length ? [{ len: inserted.length, ...f }] : []), ...rB.slice(iB)])
  // paragraphs
  const k = (old.slice(0, p).match(/\n/g) || []).length
  const nr = (removed.match(/\n/g) || []).length
  const ni = (inserted.match(/\n/g) || []).length
  const P = doc.paras
  const base = P[k] || PARA
  const paras = [...P.slice(0, k), ...Array.from({ length: ni + 1 }, () => ({ ...base })), ...P.slice(k + nr + 1)]
  return { text, runs, paras }
}

// paragraph index of a text position, and the [start, end) of each paragraph
export function paraRanges(text) {
  const out = []
  let s = 0
  for (let i = 0; i <= text.length; i++) {
    if (i === text.length || text[i] === '\n') {
      out.push([s, i])
      s = i + 1
    }
  }
  return out
}
export const paraIndex = (text, pos) => (text.slice(0, pos).match(/\n/g) || []).length

export function setParas(doc, a, b, patch) {
  const pa = paraIndex(doc.text, a)
  const pb = paraIndex(doc.text, b)
  return { ...doc, paras: doc.paras.map((p, i) => (i >= pa && i <= pb ? { ...p, ...patch } : p)) }
}
