// my Pictures & Videos state, all from the log:
//   'ui.value' (scoped to the window): view ('browse' | 'detail'), photo (id), sel, words, tag, type,
//   cal { level, y, m, sel }, size, range, viewby
//   'pics.album' { name, photos }      an album made in Create an Album (any window)
//   'pics.edit'  { photo, rot, adjust } edits saved from Edit Pictures
import { valueOf, wid } from '../../ui/index.js'
import { allOfTypes, countOfTypes, typesKey } from '../../os/logIndex.js'
import { GROUPS, PHOTOS, importedGroup } from '../lib/pictures.jsx'

export const CAL0 = { level: 'days', y: 2002, m: 4, sel: null }

export function picState(t, win) {
  const v = (n, d) => valueOf(t, wid(win, n), d)
  return {
    view: v('view', 'browse'),
    photo: v('photo', null),
    words: (v('words', null)?.text ?? '').trim().toLowerCase(),
    tag: v('tag', null),
    type: v('type', 'all'),
    cal: v('cal', CAL0),
    size: v('size', 0.45),
    range: v('range', 'time'),
    viewby: v('viewby', 'thumbnail'),
    moreTags: v('moretags', false),
    imports: library(t).imports,
  }
}

// albums and edits from every window (they are files). Cached on the events it reads (not on t
// or the log version): from frame to frame the same result keeps its identity, so the views
// memoised on it don't redraw, and a long session's log isn't scanned per frame
const LIB_TYPES = ['pics.album', 'pics.edit', 'pics.import', 'login.submit']
let cache = { key: null, albums: [], edits: new Map(), imports: [] }
export function library(t) {
  const key = typesKey(LIB_TYPES) + '|' + countOfTypes(t, LIB_TYPES)
  if (cache.key === key) return cache
  const albums = []
  const edits = new Map()
  const imports = new Map()
  for (const e of allOfTypes(t, LIB_TYPES)) {
    if (e.type === 'pics.album') albums.push({ id: 'album-' + albums.length, name: e.name, photos: e.photos, at: e.t })
    else if (e.type === 'pics.edit') edits.set(e.photo, { rot: e.rot || 0, adjust: !!e.adjust })
    else if (e.type === 'pics.import') for (const ev of e.events || []) imports.set(ev.id, importedGroup(ev))
    else if (e.type === 'login.submit') imports.clear()
  }
  cache = { key, albums, edits, imports: [...imports.values()].filter(Boolean) }
  return cache
}
export const editStyle = (ed) =>
  ed ? { transform: ed.rot ? `rotate(${ed.rot}deg)` : undefined, filter: ed.adjust ? 'brightness(1.08) contrast(1.12) saturate(1.15)' : undefined } : undefined

export function dateMatch(p, sel) {
  if (!sel) return true
  if (sel.y != null && p.date.y !== sel.y) return false
  if (sel.m != null && p.date.m !== sel.m) return false
  if (sel.d != null && p.date.d !== sel.d) return false
  return true
}

// the groups shown (filtered), each { id, title, caption, photos }; the same filter on the same
// library gives the same (shared, unmodified) array
const shown = new WeakMap() // imports -> Map(filter key -> groups)
const NO_IMPORTS = []
export function visibleGroups(st) {
  const imports = st.imports || NO_IMPORTS
  let m = shown.get(imports)
  if (!m) shown.set(imports, (m = new Map()))
  const key = [st.type, st.tag, st.words, st.range, JSON.stringify(st.cal.sel)].join('|')
  let r = m.get(key)
  if (!r) {
    if (m.size > 16) m.clear()
    m.set(key, (r = filterGroups(st)))
  }
  return r
}
function filterGroups(st) {
  const ok = (p) =>
    (st.type === 'all' || st.type === p.kind) &&
    (!st.tag || p.keywords.includes(st.tag)) &&
    dateMatch(p, st.cal.sel) &&
    (!st.words || p.name.toLowerCase().includes(st.words) || p.keywords.some((k) => k.toLowerCase().includes(st.words)) || p.location.toLowerCase().includes(st.words) || p.comment.toLowerCase().includes(st.words))
  if (st.range === 'name') {
    const photos = [...PHOTOS, ...(st.imports || []).flatMap((g) => g.photos)].filter(ok).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    return photos.length ? [{ id: 'byname', title: 'All pictures and videos', caption: 'by name', photos }] : []
  }
  if (st.range === 'type') {
    const out = []
    for (const [k, title] of [['picture', 'Pictures'], ['video', 'Videos']]) {
      const photos = [...PHOTOS, ...(st.imports || []).flatMap((g) => g.photos)].filter((p) => p.kind === k && ok(p))
      if (photos.length) out.push({ id: k, title, caption: `${photos.length} items`, photos })
    }
    return out
  }
  const sorted = [...GROUPS, ...(st.imports || [])].sort((a, b) => b.y - a.y || b.m - a.m || b.d - a.d)
  return sorted.map((g) => ({ id: g.id, title: g.title, caption: g.caption, photos: g.photos.filter(ok) })).filter((g) => g.photos.length)
}

// days / months / years that have pictures
export const DAYS_WITH = new Set(PHOTOS.map((p) => `${p.date.y}-${p.date.m}-${p.date.d}`))
export const MONTHS_WITH = new Set(PHOTOS.map((p) => `${p.date.y}-${p.date.m}`))
export const YEARS_WITH = new Set(PHOTOS.map((p) => p.date.y))
