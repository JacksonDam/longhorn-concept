// my Music state from the event log (window session = since it opened): selection, hover, the
// album page shown in the header and its transition, the selected track.
import { last, all, getVersion } from '../../core/events.js'
import { FPS } from '../../core/clock.js'
import { PAGE_DELAY } from './timeline.js'
import { albumOf, albumKey } from './library.js'

// Clicking an album selects it and, PAGE_DELAY frames later, turns the header to its page (the
// video: Tweet at 945.5, page from 968). 'music.home' (Back) returns to the device header at once.
// -> { album | null, t, prev | null, prevSince } of the latest started page, or null
export function pageAt(t, t0) {
  let cur = null
  let nextOnly = null
  const isHome = (e) => e.type === 'music.home' || (e.type === 'explorer.nav' && e.id === 'music' && e.dir === 'back')
  for (const e of all(t, (e) => (e.type === 'music.album' || isHome(e)) && e.t >= t0)) {
    if (e.type === 'music.album' && e.id == null) continue
    const album = isHome(e) ? null : albumOf(e.id)
    const start = e.t + (isHome(e) ? 0 : PAGE_DELAY / FPS)
    const curAlbum = cur ? cur.album : null
    if (album === curAlbum && (cur || album == null)) continue
    if (start > t) {
      // clicked, not started yet: its list mounts ahead (Header pre-mounts the next page)
      if (cur) cur = { ...cur, next: album ? { album, t: start } : null }
      else nextOnly = album ? { album, t: start } : null
      break
    }
    cur = { album, t: start, prev: curAlbum, prevSince: cur ? cur.t : null }
  }
  if (!cur && nextOnly) return { none: true, next: nextOnly }
  return cur
}

// cached per (t, t0, log version): the live layer, overlays and copy keys ask for the same times
const vcache = new Map()
let vver = -1
export function viewState(t, t0) {
  const v = getVersion()
  if (v !== vver) {
    vcache.clear()
    vver = v
  }
  const k = t + '|' + t0
  let r = vcache.get(k)
  if (!r) {
    if (vcache.size > 64) vcache.clear()
    r = computeViewState(t, t0)
    vcache.set(k, r)
  }
  return r
}
function computeViewState(t, t0) {
  const after = (e) => e.t >= t0
  const s = last(t, (e) => e.type === 'music.album' && after(e))
  const h = last(t, (e) => e.type === 'hover' && after(e) && String(e.id).startsWith('music.album.'))
  const th = last(t, (e) => e.type === 'hover' && after(e) && String(e.id).startsWith('music.track.'))
  const pa = pageAt(t, t0)
  const page = pa && !pa.none ? pa : null
  const tr = page && page.album ? last(t, (e) => e.type === 'music.track' && after(e) && e.t >= page.t - PAGE_DELAY / FPS && (e.album == null || e.album === page.album.key)) : null
  const isTweet = page && page.album && page.album.artist === 'Tweet'
  return {
    sel: s && s.id != null ? { key: albumKey(s.id), t: s.t } : null,
    deselected: !!(s && s.id == null),
    hover: h && h.on ? String(h.id).slice('music.album.'.length) : null,
    // the video's page: "Smoking Cigarettes" highlighted, track 4's number blue
    track: tr ? tr.n : isTweet ? 2 : -1,
    trackHover: th && th.on ? +String(th.id).slice('music.track.'.length) : -1,
    page,
    next: pa ? pa.next || null : null,
  }
}
