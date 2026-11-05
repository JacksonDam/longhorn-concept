// my Music state from the event log (window session = since it opened): selection, hover, the
// album page shown in the header and its transition, the selected track.
import { lastOfTypes, allOfTypes, typesKey } from '../../os/logIndex.js'
import { FPS } from '../../core/clock.js'
import { PAGE_DELAY } from './timeline.js'
import { albumOf, albumKey } from './library.js'

// Clicking an album selects it and, PAGE_DELAY frames later, turns the header to its page (the
// video: Tweet at 945.5, page from 968). 'music.home' (Back) returns to the device header at once.
// -> { album | null, t, prev | null, prevSince } of the latest started page, or null
const PAGE_TYPES = ['music.album', 'music.home', 'explorer.nav']
export function pageAt(t, t0) {
  let cur = null
  let nextOnly = null
  // Back returns to the device header; Forward goes to the page Back left
  const isHome = (e) => e.type === 'music.home' || (e.type === 'explorer.nav' && e.id === 'music' && e.dir === 'back')
  const isFwd = (e) => e.type === 'explorer.nav' && e.id === 'music' && e.dir === 'forward'
  let leftByBack = null
  for (const e of allOfTypes(t, PAGE_TYPES, (e) => e.type === 'music.album' || isHome(e) || isFwd(e), t0)) {
    if (e.type === 'music.album' && e.id == null) continue
    if (isFwd(e) && !leftByBack) continue
    if (isHome(e) && cur && cur.album) leftByBack = cur.album
    const album = isHome(e) ? null : isFwd(e) ? leftByBack : albumOf(e.id)
    if (isFwd(e)) leftByBack = null
    const start = e.t + (isHome(e) || isFwd(e) ? 0 : PAGE_DELAY / FPS)
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

// cached per (t, t0) while no event of the types it reads is added (other events, e.g. window
// moves, leave it valid): the live layer, overlays and copy keys ask for the same times
const VIEW_TYPES = ['music.album', 'music.home', 'explorer.nav', 'hover', 'music.track']
const vcache = new Map()
let vver = ''
export function viewState(t, t0) {
  const v = typesKey(VIEW_TYPES)
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
  const s = lastOfTypes(t, ['music.album'], null, t0)
  const h = lastOfTypes(t, ['hover'], (e) => String(e.id).startsWith('music.album.'), t0)
  const th = lastOfTypes(t, ['hover'], (e) => String(e.id).startsWith('music.track.'), t0)
  const pa = pageAt(t, t0)
  const page = pa && !pa.none ? pa : null
  const tr = page && page.album ? lastOfTypes(t, ['music.track'], (e) => e.album == null || e.album === page.album.key, Math.max(t0, page.t - PAGE_DELAY / FPS)) : null
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
