// Silent media player shared by the sidebar's media strip, the my Music flyout and window,
// and the Winamp3 window. Pure function of (time, event log); no audio is ever played, only
// the position, current track and playing state move.
//
// Events:
//   'media.play'  { track?, playlist? }  play. `playlist` (array of tracks) replaces the
//                 playlist; `track` is an index into it (or a track object, which is looked up
//                 by title and appended if missing). Without `track`, resumes the current one.
//   'media.pause'                        pause (keeps the position)
//   'media.stop'                         pause and rewind to 0
//   'media.next' / 'media.prev'          next / previous track (prev rewinds first when > 3 s in)
//   'media.seek'  { pos }                position in seconds within the current track
// A track is { title, duration (s), display? (longer label for the sidebar strip) }.
// Playback advances to the next track at the end and stops after the last one.
import { getLog, getVersion } from '../core/events.js'

const mmss = (s) => {
  const [m, x] = s.split(':').map(Number)
  return m * 60 + x
}

// the my Music flyout's list (the video's text, verbatim); the sidebar strip shows track 1. The
// video's strip is cut off after "U2 - One more Voice Wi": the rest is unknown, so it isn't invented
export const DEFAULT_PLAYLIST = [
  ['Gomez - Bring it on', '4:34'],
  ['U2 - One More Voice', '3:10', 'U2 - One more Voice'],
  ['Alicia Keys - Just another', '7:31'],
  ['Evergreen - Small sound', '5:09'],
  ['Gomez - Bring it on', '4:34'],
  ['Goo Goo Dolls - Safe', '3:10'],
  ['Areosmith - Somtiimes', '5:31'],
  ['Wilco - Small sound', '5:09'],
  ['Rush - Bring it on', '4:34'],
].map(([title, d, display]) => ({ title, duration: mmss(d), display: display || title }))
export const DEFAULT_INDEX = 1

export const formatTime = (s) => {
  s = Math.max(0, Math.floor(s))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const TYPES = new Set(['media.play', 'media.pause', 'media.stop', 'media.next', 'media.prev', 'media.seek', 'login.submit'])

// advance a playing state from time s.t to t (track ends move to the next track)
function advance(s, t) {
  if (!s.playing) return { ...s, t }
  let { index, pos } = s
  pos += t - s.t
  let playing = true
  while (pos >= s.playlist[index].duration) {
    pos -= s.playlist[index].duration
    if (index + 1 >= s.playlist.length) {
      playing = false
      pos = 0
      index = 0
      break
    }
    index++
  }
  return { ...s, index, pos, playing, t }
}

function initial(t) {
  return { playlist: DEFAULT_PLAYLIST, index: DEFAULT_INDEX, pos: 0, playing: false, t, changedAt: -Infinity }
}

function reduce(events, t) {
  let s = initial(-Infinity)
  for (const e of events) {
    if (!TYPES.has(e.type)) continue
    if (e.type === 'login.submit') {
      s = initial(e.t)
      continue
    }
    s = advance(s, e.t)
    s.changedAt = e.t
    switch (e.type) {
      case 'media.play': {
        let playlist = Array.isArray(e.playlist) && e.playlist.length ? e.playlist : s.playlist
        let index = s.index
        if (typeof e.track === 'number') index = Math.max(0, Math.min(playlist.length - 1, e.track))
        else if (e.track && typeof e.track === 'object') {
          const i = playlist.findIndex((x) => x.title === e.track.title)
          if (i >= 0) index = i
          else {
            playlist = [...playlist, { duration: 240, ...e.track, display: e.track.display || e.track.title }]
            index = playlist.length - 1
          }
        }
        const same = playlist === s.playlist && index === s.index
        s = { ...s, playlist, index, pos: same ? s.pos : 0, playing: true }
        break
      }
      case 'media.pause':
        s = { ...s, playing: false }
        break
      case 'media.stop':
        s = { ...s, playing: false, pos: 0 }
        break
      case 'media.next':
        s = { ...s, index: (s.index + 1) % s.playlist.length, pos: 0 }
        break
      case 'media.prev':
        s = s.pos > 3 ? { ...s, pos: 0 } : { ...s, index: (s.index - 1 + s.playlist.length) % s.playlist.length, pos: 0 }
        break
      case 'media.seek':
        s = { ...s, pos: Math.max(0, Math.min(s.playlist[s.index].duration - 0.01, +e.pos || 0)) }
        break
    }
  }
  return advance(s, t)
}

// cached on the events at or before t (the state between events is a cheap advance)
let cache = { version: -1, n: -1, base: null }
export function mediaState(t) {
  const log = getLog()
  let lo = 0, hi = log.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (log[mid].t <= t) lo = mid + 1
    else hi = mid
  }
  const v = getVersion()
  if (!(cache.version === v && cache.n === lo)) {
    const evs = log.slice(0, lo)
    const lastT = evs.length ? evs[evs.length - 1].t : -Infinity
    cache = { version: v, n: lo, base: reduce(evs, lastT) }
  }
  const s = advance(cache.base, t)
  const track = s.playlist[s.index]
  return { playlist: s.playlist, index: s.index, track, position: s.pos, playing: s.playing, changedAt: s.changedAt }
}
