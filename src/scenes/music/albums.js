// Album tiles of the my Music grid, in the reference video's order (4 rows x 8 columns).
// Covers are original stand-ins (tools/music/covers.py, docs/SUBSTITUTIONS.md).
import { asset, preload } from '../../core/preload.js'

const ORDER = [
  'a_white', 'b_suit', 'c_lights', 'd_sky', 'e_four', 'f_cream', 'g_quads', 'h_ghost',
  'i_wheel', 'j_navy', 'k_tweet', 'l_tan', 'm_black', 'n_graffiti', 'o_dark', 'p_legend',
  'q_mono', 'r_amber', 's_eye', 't_sketch', 'u_olive', 'l_tan', 'v_blue', 'a_white',
  'v_blue', 'a_white', 'b_suit', 'c_lights', 'd_sky', 'e_four', 'f_cream', 'g_quads',
]

export const coverUrl = (id) => asset(`img/music/covers/${id}.webp`)
export const TWEET_COVER = asset('img/music/covers/tweet-lg.webp')

export const ALBUMS = ORDER.map((cover, i) => ({ index: i, cover, url: coverUrl(cover), tweet: cover === 'k_tweet' }))

export const TWEET = {
  artist: 'Tweet',
  title: 'Southern Hummingbird',
  tracks: [
    'So Much To Say (Intro)',
    'My Place',
    'Smoking Cigarettes',
    'Best Friend feat. Bilal',
    'Always Will',
    'Boogie 2nite',
    'Oops (Oh My) feat. Missy "Misdemeanor" Elliott',
    'Make Ur Move',
    'Motel',
    'Beautiful',
  ],
}

preload([...new Set(ALBUMS.map((a) => a.url)), TWEET_COVER, asset('img/music/folder.png'), asset('img/music/find.png')])
