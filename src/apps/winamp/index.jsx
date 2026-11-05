// Winamp3 in the Plex style (not Winamp's own skin), bound to the shell's silent player
// (os/media.js): time, scrolling title, a visualiser that moves while playing, seek and volume,
// transport buttons and the playlist (double-click plays). No audio is ever produced.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { scoped, wid, valueOf, Slider, ListView, ToolButton, Tooltip, C, FONT, HEAVY } from '../../ui/index.js'
import { mediaState, formatTime } from '../../os/media.js'
import { AppTop, appTopHeight } from '../lib/chrome.jsx'
import { Ico } from '../lib/icons.jsx'
import { openWin, closeWin, messageBox } from '../lib/common.js'
import { openMusic } from '../lib/fs.js'

const BARS = 24
// a deterministic "spectrum": sums of sines per bar, a pure function of the play position
function level(i, pos) {
  const f = 0.6 + i * 0.37
  const v = 0.5 + 0.25 * Math.sin(pos * f * 3.1 + i) + 0.18 * Math.sin(pos * (7.3 - i * 0.11) + i * 2.1) + 0.12 * Math.sin(pos * 13.7 + i * 0.7)
  return Math.max(0.04, Math.min(1, v * (1.15 - i / BARS * 0.55)))
}

const Display = memo(function Display({ w }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 10,
        top: 0,
        width: w - 20,
        height: 92,
        borderRadius: 8,
        background: 'linear-gradient(180deg, #0d1e45 0, #142c5e 55%, #1b3a78 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(120,170,240,0.55), inset 0 2px 6px rgba(0,0,20,0.6), 0 1px 0 rgba(255,255,255,0.5)',
      }}
    >
      <div style={{ position: 'absolute', left: 1, top: 1, right: 1, height: 34, borderRadius: '7px 7px 40% 40% / 7px 7px 10px 10px', background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0))' }} />
    </div>
  )
})

function Viz({ x, y, w, h, pos, playing, t, pausedAt, peaks }) {
  const bw = w / BARS
  const decay = playing ? 1 : Math.max(0, 1 - (t - pausedAt) * 3)
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h }}>
      {Array.from({ length: BARS }, (_, i) => {
        const v = level(i, pos) * decay
        return <div key={i} style={{ position: 'absolute', left: i * bw + (peaks ? bw / 2 - 1 : 1), bottom: 0, width: peaks ? 2 : bw - 2, height: Math.max(1, v * h), background: 'linear-gradient(0deg, #2f8cf5, #8fd4ff 70%, #e6f7ff)', opacity: 0.9 }} />
      })}
    </div>
  )
}

function Marquee({ x, y, w, text, t, playing }) {
  const full = `${text}  ***  `
  const cw = 6.2
  const tw = full.length * cw
  const off = playing ? ((t * 28) % tw) : 0
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: 16, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: -off, top: 0, whiteSpace: 'pre', fontFamily: HEAVY, fontSize: 12, color: '#bfe6ff' }}>
        {full}
        {full}
      </div>
    </div>
  )
}

function Winamp({ win, t, w, h, active }) {
  const id = (n) => wid(win, n)
  const m = mediaState(t)
  const tr = m.track
  const vol = valueOf(t, id('vol'), 0.8)
  const remain = valueOf(t, id('remain'), false)
  const viz = valueOf(t, id('viz'), 0) // bars, thin bars, off
  const showList = valueOf(t, id('list'), true)
  const top = appTopHeight()
  const ctl = (k, icon, tip, fn, x, on) => (
    <span key={k}>
      <ToolButton id={id('b.' + k)} x={x} y={top + 128} w={34} h={30} icon={<Ico kind={icon} size={20} />} onClick={fn} active={on} />
      <Tooltip forId={id('b.' + k)} text={tip} />
    </span>
  )
  const items = m.playlist.map((p, i) => ({ key: 'p' + i, cells: [`${i + 1}. ${p.title}`, formatTime(p.duration)], bold: i === m.index }))
  const menus = [
    { key: 'file', label: 'File', items: [{ label: 'Play File...', onClick: () => openMusic() }, { label: 'Open my Music', onClick: () => openMusic() }, '-', { label: 'Exit', onClick: () => closeWin(win.id) }] },
    {
      key: 'play',
      label: 'Play',
      items: [
        { label: 'Play', onClick: () => emit('media.play'), disabled: m.playing },
        { label: 'Pause', onClick: () => emit('media.pause'), disabled: !m.playing },
        { label: 'Stop', onClick: () => emit('media.stop') },
        '-',
        { label: 'Previous', onClick: () => emit('media.prev') },
        { label: 'Next', onClick: () => emit('media.next') },
      ],
    },
    { key: 'view', label: 'View', items: [{ label: 'Playlist Editor', checked: showList, onClick: () => emit('ui.value', { id: id('list'), value: !showList }) }] },
    { key: 'help', label: 'Help', items: [{ label: 'About Winamp3...', onClick: () => messageBox({ title: 'About Winamp3', icon: 'info', text: 'Winamp3 (version 3.0)\nCopyright © 1997-2003 Nullsoft, Inc.' }) }] },
  ]
  const pausedAt = m.changedAt
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #4f8ad9 0, #3f78c4 40%, #2f62ad 100%)' }}>
      <AppTop id={id('m')} w={w} menus={menus} toolbar={null} />
      <div style={{ position: 'absolute', left: 0, top: top + 8, width: w }}>
        <Display w={w} />
      </div>
      <div onPointerDown={(e) => e.button === 0 && emit('ui.value', { id: id('remain'), value: !remain })} style={{ position: 'absolute', left: 24, top: top + 16, fontFamily: HEAVY, fontSize: 30, color: '#9fdcff', letterSpacing: 1, textShadow: '0 0 6px rgba(80,170,255,0.6)' }}>
        {remain ? '-' + formatTime(tr.duration - m.position) : formatTime(m.position)}
      </div>
      <div style={{ position: 'absolute', left: 26, top: top + 56, fontFamily: FONT, fontSize: 10, color: '#7fa8e0' }}>{m.playing ? '▶ playing' : m.position > 0 ? '❙❙ paused' : '■ stopped'}</div>
      <Marquee x={124} y={top + 16} w={w - 150} text={`${m.index + 1}. ${tr.display || tr.title} (${formatTime(tr.duration)})`} t={t} playing={m.playing} />
      <div style={{ position: 'absolute', left: 124, top: top + 34, fontFamily: FONT, fontSize: 9.5, color: '#7fa8e0', whiteSpace: 'nowrap' }}>128 kbps  44 kHz  stereo</div>
      <div onPointerDown={(e) => e.button === 0 && emit('ui.value', { id: id('viz'), value: (viz + 1) % 3 })}>
        {viz < 2 && <Viz x={124} y={top + 50} w={w - 150} h={40} pos={m.position} playing={m.playing} t={t} pausedAt={pausedAt} peaks={viz === 1} />}
        {viz === 2 && <div style={{ position: 'absolute', left: 124, top: top + 50, width: w - 150, height: 40 }} />}
      </div>
      <div style={{ position: 'absolute', left: 14, top: top + 104, fontFamily: FONT, fontSize: 10, color: '#cfe6ff' }}>{formatTime(m.position)}</div>
      <Slider id={id('seek')} x={50} y={top + 104} w={w - 110} variant="chrome" value={m.position / tr.duration} onChange={(v) => emit('media.seek', { pos: v * tr.duration })} />
      <div style={{ position: 'absolute', right: 14, top: top + 104, fontFamily: FONT, fontSize: 10, color: '#cfe6ff' }}>{formatTime(tr.duration)}</div>
      {ctl('prev', 'prev', 'Previous', () => emit('media.prev'), 14)}
      {ctl('play', 'play', 'Play', () => emit('media.play'), 52, m.playing)}
      {ctl('pause', 'pause', 'Pause', () => emit('media.pause'), 90, !m.playing && m.position > 0)}
      {ctl('stop', 'stopm', 'Stop', () => emit('media.stop'), 128)}
      {ctl('next', 'next', 'Next', () => emit('media.next'), 166)}
      {ctl('eject', 'eject', 'Open my Music', () => openMusic(), 212)}
      <div style={{ position: 'absolute', left: w - 140, top: top + 135 }}>
        <Ico kind="volume" size={18} />
      </div>
      <Slider id={id('vol')} x={w - 116} y={top + 137} w={100} variant="chrome" def={0.8} />
      <Tooltip forId={id('vol')} text={`Volume ${Math.round(vol * 100)}%`} />
      {showList && (
        <>
          <div style={{ position: 'absolute', left: 10, top: top + 170, width: w - 20, height: h - top - 180, borderRadius: 6, background: 'linear-gradient(180deg, #eef5ff, #dbe7f8)', boxShadow: 'inset 0 0 0 1px #7da2d8' }} />
          <ListView
            id={id('pl')}
            x={14}
            y={top + 174}
            w={w - 28}
            h={h - top - 188}
            items={items}
            columns={[{ label: 'Title', w: w - 100 }, { label: 'Time', w: 52, align: 'right' }]}
            header={false}
            multi={false}
            active={active}
            onOpen={(it) => emit('media.play', { track: +it.key.slice(1) })}
            selected={[`p${m.index}`]}
          />
        </>
      )}
    </div>
  )
}

function playing(t) {
  const m = mediaState(t)
  return m.playing || t - m.changedAt < 0.5
}

export default {
  id: 'winamp',
  title: () => 'Winamp3',
  taskbarLabel: () => 'Winamp3',
  icon: null,
  size: { w: 380, h: 420 },
  position: { x: 300, y: 120 },
  minSize: { w: 340, h: 260 },
  explorer: false,
  background: '#3f78c4',
  // the time, title and visualiser move while the player plays (and the bars settle after a pause)
  Content: scoped(Winamp, { watch: ['media'], alive: (win, t) => playing(t) }),
  liveTime: (win, t, base) => (win.state === 'open' && playing(t) ? t : base),
}
