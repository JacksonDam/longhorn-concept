// Create Playlist (my Music): name the playlist and tick the tracks; Create saves it
// ('music.playlist' { name, tracks }) and, if asked, plays it through the shell's silent player
// ('media.play' { playlist, track: 0 }).
import { emit } from '../../core/events.js'
import { scoped, wid, valueOf, TextField, textOf, Button, Checkbox, ListView, select, C, FONT } from '../../ui/index.js'
import { DEFAULT_PLAYLIST, formatTime } from '../../os/media.js'
import { closeWin } from '../lib/common.js'

// the library: the flyout's tracks (verbatim) without the repeat
const TRACKS = DEFAULT_PLAYLIST.filter((tr, i, a) => a.findIndex((x) => x.title === tr.title) === i)

function Playlist({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const picked = valueOf(t, id('picked'), TRACKS.map((tr) => tr.title))
  const set = new Set(picked)
  const toggle = (title) => emit('ui.value', { id: id('picked'), value: set.has(title) ? picked.filter((x) => x !== title) : [...picked, title] })
  const create = () => {
    const name = textOf(t, id('name'), 'My Playlist 1').trim() || 'My Playlist 1'
    const tracks = TRACKS.filter((tr) => set.has(tr.title))
    emit('music.playlist', { name, tracks: tracks.map((tr) => tr.title) })
    if (valueOf(t, id('play'), true)) emit('media.play', { playlist: tracks, track: 0 })
    closeWin(win.id)
  }
  const total = TRACKS.filter((tr) => set.has(tr.title)).reduce((s, tr) => s + tr.duration, 0)
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <div style={{ position: 'absolute', left: 16, top: 12, fontFamily: FONT, fontSize: 19, fontWeight: 300, color: C.headingLight, whiteSpace: 'nowrap' }}>
        create <span style={{ fontWeight: 500, color: C.heading }}>playlist</span>
      </div>
      <div style={{ position: 'absolute', left: 16, top: 46, fontFamily: FONT, fontSize: 11, color: C.text }}>Playlist name:</div>
      <TextField id={id('name')} def="My Playlist 1" x={100} y={43} w={w - 116} h={20} />
      <div style={{ position: 'absolute', left: 16, top: 74, fontFamily: FONT, fontSize: 11, color: C.text }}>Tracks:</div>
      <ListView
        id={id('list')}
        x={16}
        y={92}
        w={w - 32}
        h={h - 170}
        multi={false}
        columns={[{ label: '', w: 26 }, { label: 'Title', w: w - 120 }, { label: 'Length', w: 60, align: 'right' }]}
        items={TRACKS.map((tr) => ({ key: tr.title, cells: [<Tick key="c" on={set.has(tr.title)} />, tr.title, formatTime(tr.duration)] }))}
        onSelect={(keys) => {
          if (!keys[0]) return
          toggle(keys[0])
          select(id('list'), [])
        }}
        onOpen={(it) => toggle(it.key)}
      />
      <div style={{ position: 'absolute', left: 16, top: h - 72, fontFamily: FONT, fontSize: 10.5, color: '#8b91a6' }}>
        {set.size} tracks, {formatTime(total)}
      </div>
      <Checkbox id={id('play')} label="Play the playlist now" x={16} y={h - 54} def />
      <Button id={id('all')} label="Select All" x={w - 278} y={h - 36} w={82} h={23} onClick={() => emit('ui.value', { id: id('picked'), value: TRACKS.map((tr) => tr.title) })} />
      <Button id={id('ok')} label="Create" isDefault x={w - 188} y={h - 36} w={82} h={23} disabled={!set.size} onClick={create} />
      <Button id={id('cancel')} label="Cancel" x={w - 98} y={h - 36} w={82} h={23} onClick={() => closeWin(win.id)} />
    </div>
  )
}

const Tick = ({ on }) => (
  <svg width="13" height="13" style={{ verticalAlign: 'middle' }}>
    <rect x="0.5" y="0.5" width="12" height="12" rx="2" fill="#fff" stroke="#6f8fbf" />
    {on && <path d="M3 6.6 L5.4 9 L10 3.6" fill="none" stroke="#1f5fbf" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>
)

export default {
  id: 'playlist',
  title: () => 'Create Playlist',
  taskbarLabel: () => 'Create Playlist',
  icon: null,
  size: { w: 420, h: 400 },
  position: { x: 270, y: 150 },
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(Playlist, { watch: ['media'] }),
}
