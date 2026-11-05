// View model of the my Music window: settings from the event log and the album grid layout.
// Window-local px. The defaults reproduce the video's frame exactly (thumbnails of 49 px, the
// view scrolled to the library's rows 4-7, task pane and preview header shown).
import { valueOf, wid } from '../../ui/index.js'
import { LIBRARY } from './library.js'
import { GRID, WIN } from './geometry.js'

export const DEFAULTS = {
  size: 49, // thumbnail size (Size slider)
  view: 'thumbnail', // 'thumbnail' | 'tiles' | 'details'
  group: 'date', // 'date' | 'artist' | 'genre' | 'none'
  arrange: 'date', // 'date' | 'name' | 'artist'
  tasks: true, // Hide Music Tasks toggles
  folders: false, // Folders pane instead of the task pane
  preview: true, // the header (device / album page)
  search: '',
}
export const SIZE_MIN = 24
export const SIZE_MAX = 76.5

// per-window settings (ui.value events on wid(win, name))
export function settings(t, win) {
  const v = (k) => valueOf(t, wid(win, 'mv.' + k), DEFAULTS[k])
  return {
    size: v('size'), view: v('view'), group: v('group'), arrange: v('arrange'),
    tasks: v('tasks'), folders: v('folders'), preview: v('preview'),
  }
}

const VIDEO_XS = GRID.xs.map((x) => x - WIN.x) // 203, 270, 336, 403, 469, 536, 604, 672
const VIDEO_PITCH = 67.5
const PAD_TOP = 30.5 // the video's row 4 sits at content y 233 with the view scrolled 223 px
export const VIDEO_SCROLL = 223
const VIDEO_FIX = { 4: 0.5, 5: -0.5 } // the measured rows 440 / 506.5 vs a uniform 67.5 pitch

// the album list in the current order, filtered by the search text
export function albumList(s, search) {
  let list = LIBRARY
  const q = (search || '').trim().toLowerCase()
  if (q) list = list.filter((a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q) || a.genre.toLowerCase().includes(q))
  const key = { date: null, name: (a) => a.title, artist: (a) => a.artist + ' ' + a.title }[s.arrange]
  if (key) list = [...list].sort((a, b) => key(a).localeCompare(key(b)))
  if (s.group === 'artist' || s.group === 'genre') {
    const g = (a) => (s.group === 'artist' ? a.artist : a.genre)
    list = [...list].sort((a, b) => g(a).localeCompare(g(b)))
  }
  return list
}

// grid geometry for a window of w x h: the view rect, items with positions, group headers
// -> { view: {x, y, w, h}, items: [{ album, x, y, s }], headers: [{ label, y }], contentH, defaultScroll }
export function gridLayout(s, w, h, search) {
  const x0 = s.tasks || s.folders ? 200 : 18
  const top = s.preview ? 362 : 146
  const view = { x: x0, y: top, w: w - x0 - 22, h: h - 22 - top }
  const list = albumList(s, search)
  const items = []
  const headers = []
  const isVideo = s.view === 'thumbnail' && s.size === DEFAULTS.size && w === WIN.w && x0 === 200 && s.group === 'date' && s.arrange === 'date' && !search
  if (s.view === 'details') {
    const rowH = 18
    let y = 24
    list.forEach((a) => {
      items.push({ album: a, x: 0, y, s: rowH })
      y += rowH
    })
    return { view, items, headers, contentH: y + 8, defaultScroll: 0, rowH, kind: 'details' }
  }
  const tiles = s.view === 'tiles'
  const size = tiles ? Math.max(40, s.size) : s.size
  const pitchX = tiles ? size + 150 : isVideo ? 67 : size + 18
  const pitchY = tiles ? size + 14 : isVideo ? VIDEO_PITCH : size + 18.5
  const cols = Math.max(1, Math.floor((view.w + 18 - 3) / pitchX))
  const grouped = s.group === 'artist' || s.group === 'genre'
  const groupOf = (a) => (s.group === 'artist' ? a.artist : a.genre)
  let y = isVideo ? PAD_TOP : 10
  let col = 0
  let row = 0
  let curGroup = null
  for (const a of list) {
    if (grouped && groupOf(a) !== curGroup) {
      if (col > 0) {
        y += pitchY
        col = 0
      }
      curGroup = groupOf(a)
      headers.push({ label: curGroup, y })
      y += 26
    }
    const x = isVideo ? VIDEO_XS[col] : 3 + col * pitchX
    const fix = isVideo ? VIDEO_FIX[row] || 0 : 0
    items.push({ album: a, x: x0 === 200 && isVideo ? x - 200 : x, y: y + fix, s: size })
    col++
    if (col >= cols) {
      col = 0
      row++
      y += pitchY
    }
  }
  if (col > 0) y += pitchY
  const contentH = isVideo ? 852 : y + 12
  return { view, items, headers, contentH, defaultScroll: isVideo ? VIDEO_SCROLL : 0, kind: tiles ? 'tiles' : 'thumbnail' }
}

// the scroll offset of the grid (ui.value on wid(win, 'grid'), clamped)
export function gridScroll(t, win, L) {
  const max = Math.max(0, L.contentH - L.view.h)
  const v = valueOf(t, wid(win, 'grid.scroll'), null)
  return Math.max(0, Math.min(max, v == null ? L.defaultScroll : v))
}
