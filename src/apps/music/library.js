// The my Music library: the video's 32 tiles (rows 4-7 of the default "by date" order; the
// video shows the view scrolled there) plus fictional albums above and below. Everything the
// video doesn't show is fictional and neutral (docs/briefs/os.md): album names, artists, years,
// genres and track lists. Tweet - Southern Hummingbird and its tracks are the video's text.
import { asset, preload } from '../../core/preload.js'
import { loadTexture } from '../../gl/slab.js'
import { ALBUMS as VIDEO_TILES, TWEET, coverUrl } from './albums.js'

// deterministic pseudo-random choices
const pick = (arr, n) => arr[((n % arr.length) + arr.length) % arr.length]
const hash = (s) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

const ARTISTS = [
  'The Harbor Lights', 'Mara Quinn', 'Northbound', 'Ellis Gray', 'Velvet Static', 'June Avenue', 'The Paper Kites Club',
  'Sol & Ivy', 'Daniel Rourke', 'Blue Meridian', 'The Long Weekends', 'Ada Moreno', 'Copper Fields', 'Nina Holt',
  'The Quiet Hours', 'Silverline', 'Tom Ashby', 'Lantern Season', 'Rosa Vale', 'Night Ferry', 'The Driftwoods',
  'Kara West', 'Tidewater', 'Sam Okafor', 'The Small Hours', 'Hollow Pines', 'Leo Marsh', 'Glasshouse', 'Iris Lane',
  'Orchard Street',
]
const TITLE_A = ['Late', 'Bright', 'Paper', 'Silver', 'Quiet', 'Open', 'Second', 'Northern', 'Golden', 'Slow', 'Blue', 'Common', 'Wide', 'Little', 'Last']
const TITLE_B = ['Rooms', 'Harbor', 'Weather', 'Lights', 'Roads', 'Season', 'Signals', 'Gardens', 'Letters', 'Rivers', 'Hours', 'Avenue', 'Maps', 'Echoes', 'Fields']
const GENRES = ['Pop', 'Rock', 'R&B', 'Jazz', 'Electronic', 'Folk', 'Soul', 'Alternative', 'Classical', 'Soundtrack']
const TRACK_A = ['Morning', 'Paper', 'Silver', 'Northern', 'Open', 'Closer', 'Falling', 'Runaway', 'Summer', 'Window', 'Highway', 'Quiet', 'Golden', 'Second', 'Midnight', 'Harbor', 'Little', 'Holding']
const TRACK_B = ['Light', 'Hearts', 'Lines', 'Song', 'Water', 'Days', 'Steps', 'Weather', 'Rain', 'Town', 'Sky', 'Hands', 'Home', 'Story', 'Shore', 'Wire', 'Signal', 'Avenue']
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function tracksFor(key, n) {
  const h = hash(key)
  return Array.from({ length: n }, (_, i) => {
    const a = pick(TRACK_A, (h >> 3) + i * 7)
    const b = pick(TRACK_B, (h >> 9) + i * 11 + 3)
    const d = 150 + ((h >> (i % 13)) + i * 37) % 170
    return { title: i % 4 === 3 ? `${a} ${b} (Reprise)` : `${a} ${b}`, duration: d, time: mmss(d) }
  })
}

function fictional(key, cover, year) {
  const h = hash(key)
  const title = `${pick(TITLE_A, h)} ${pick(TITLE_B, h >> 5)}`
  return {
    key,
    cover,
    url: coverUrl(cover),
    title,
    artist: pick(ARTISTS, h >> 11),
    year,
    genre: pick(GENRES, h >> 17),
    tracks: tracksFor(key, 8 + (h % 5)),
  }
}

const TWEET_TRACK_TIMES = [74, 239, 233, 266, 264, 199, 233, 227, 238, 232]

// the video's tiles: Tweet as shown; the stand-ins fictional (repeated covers get their own albums)
const video = VIDEO_TILES.map((t) => {
  if (t.tweet) {
    return {
      key: 'v' + t.index,
      cover: t.cover,
      url: t.url,
      title: TWEET.title,
      artist: TWEET.artist,
      year: 2002,
      genre: 'R&B',
      tracks: TWEET.tracks.map((title, i) => ({ title, duration: TWEET_TRACK_TIMES[i], time: mmss(TWEET_TRACK_TIMES[i]) })),
      video: t.index,
    }
  }
  return { ...fictional('v' + t.index, t.cover, 2002 - Math.floor(t.index / 16)), video: t.index }
})
const extra = (i, year) => fictional('x' + i, 'x' + String(i).padStart(2, '0'), year)
const above = Array.from({ length: 24 }, (_, i) => extra(i, 2003))
const below = Array.from({ length: 40 }, (_, i) => extra(24 + i, 2000 - Math.floor(i / 16)))

// default order ("Arrange by date"): newest first, the video's rows in the middle
export const LIBRARY = [...above, ...video, ...below]
export const BY_KEY = new Map(LIBRARY.map((a) => [a.key, a]))
export const albumKey = (id) => (typeof id === 'number' ? 'v' + id : id)
export const albumOf = (id) => BY_KEY.get(albumKey(id)) || null

preload(above.concat(below).map((a) => a.url))
// every album can become the header's 3D slab: load their textures up front (128 px each)
for (const a of LIBRARY) if (a.artist !== 'Tweet') loadTexture(a.url)
