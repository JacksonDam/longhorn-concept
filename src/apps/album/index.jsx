// Create an album (ref2 f01640): "1. Find >" (words, keywords, Refine By Date, file type),
// "2. Choose images >" (check boxes on date-grouped thumbnails), "3. Your list >" (album name and
// the numbered list); Preview runs it as a slide show, Create this album saves it ('pics.album').
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { scoped, wid, valueOf, TextField, textOf, Button, Scrollbar, hoverKeys, pt, focusField, C, FONT, HEAVY } from '../../ui/index.js'
import { photoById, TAGS } from '../lib/pictures.jsx'
import { visibleGroups, CAL0 } from '../pictures/state.js'
import { Calendar } from '../pictures/Calendar.jsx'
import { AppTop, appTopHeight } from '../lib/chrome.jsx'
import { closeWin, openWin } from '../lib/common.js'

const colHead = (x, y, n, a) => (
  <div style={{ position: 'absolute', left: x, top: y, fontFamily: FONT, fontSize: 12.5, color: '#3b7cc6', whiteSpace: 'nowrap' }}>
    {n}. {a} <span style={{ color: '#8ebbe9' }}>&gt;</span>
  </div>
)
const small = { position: 'absolute', fontFamily: FONT, fontSize: 10.5, color: '#8b91a6', whiteSpace: 'nowrap' }

const Check = memo(function Check({ on }) {
  return (
    <svg width="13" height="13" style={{ position: 'absolute', left: 2, top: 2 }}>
      <rect x="0.5" y="0.5" width="12" height="12" rx="2" fill={on ? '#ffffff' : 'rgba(255,255,255,0.85)'} stroke="#6f8fbf" />
      {on && <path d="M3 6.6 L5.4 9 L10 3.6" fill="none" stroke="#1f5fbf" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
})
const Pick = memo(function Pick({ p, on, lit }) {
  return (
    <div style={{ position: 'relative', width: 50, height: 38, boxShadow: on ? '0 0 0 2px #5a9ef0' : lit > 0.5 ? '0 0 0 1px #78a8f0' : '0 0 0 0.6px rgba(160,175,205,0.8), 0 2px 4px rgba(50,70,110,0.2)' }}>
      <img src={p.url} alt="" draggable={false} style={{ width: 50, height: 38, objectFit: 'cover', display: 'block' }} />
      <Check on={on} />
    </div>
  )
})

function Album({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const top = appTopHeight({ toolbar: false })
  const st = {
    words: textOf(t, id('words')).trim().toLowerCase(),
    tag: valueOf(t, id('tag'), null),
    type: valueOf(t, id('type'), 'all'),
    cal: valueOf(t, id('cal'), CAL0),
    range: 'time',
  }
  const groups = visibleGroups({ ...st, type: st.type === 'album' ? 'all' : st.type })
  const chosen = valueOf(t, id('chosen'), [])
  const set = new Set(chosen)
  const toggle = (pid) => emit('ui.value', { id: id('chosen'), value: set.has(pid) ? chosen.filter((x) => x !== pid) : [...chosen, pid] })
  const name = textOf(t, id('name')).trim()
  const lit = hoverKeys(t, id('pick'))
  // column 2 layout
  const c2 = { x: 186, y: top + 30, w: 300, h: h - top - 80 }
  let gy = 0
  const blocks = groups.map((g) => {
    const rows = Math.ceil(g.photos.length / 5)
    const b = { g, y: gy }
    gy += 22 + rows * 46 + 8
    return b
  })
  const max = Math.max(0, gy - c2.h)
  const pos = Math.min(max, valueOf(t, id('s2'), 0))
  const listMax = Math.max(0, chosen.length * 46 - (h - top - 120))
  const lpos = Math.min(listMax, valueOf(t, id('s3'), 0))
  const L = (k, y, label, on, fn) => (
    <div key={k} style={{ ...small, left: 16, top: y, color: on ? C.link : C.textDark, fontWeight: on ? 560 : 400, fontSize: 11 }} onPointerDown={(e) => e.button === 0 && fn()}>
      {label}
    </div>
  )
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <AppTop id={id('top')} w={w} menus={[{ key: 'tools', label: 'Tools', items: [{ label: 'Select All Shown', onClick: () => emit('ui.value', { id: id('chosen'), value: [...new Set([...chosen, ...groups.flatMap((g) => g.photos.map((p) => p.id))])] }) }, { label: 'Clear My List', onClick: () => emit('ui.value', { id: id('chosen'), value: [] }) }, '-', { label: 'Open my Pictures & Videos', onClick: () => openWin('pictures', 'pictures') }] }]}>
        <div style={{ position: 'absolute', left: 70, top: 6, fontFamily: HEAVY, fontSize: 11, color: '#e4f4ff', whiteSpace: 'nowrap' }}>
          my Stuff {'▸'} my Pictures &amp; Videos {'▸'} Create an Album
        </div>
      </AppTop>
      {/* 1. Find */}
      {colHead(14, top + 8, 1, 'Find')}
      <div style={{ ...small, left: 16, top: top + 32 }} onPointerDown={(e) => e.button === 0 && focusField(id('words'))}>Containing the words:</div>
      <TextField id={id('words')} x={16} y={top + 46} w={150} h={17} size={10.5} pad={4} />
      <div style={{ ...small, left: 16, top: top + 70 }} onPointerDown={(e) => e.button === 0 && emit('ui.value', { id: id('tag'), value: null })}>Show all files by:</div>
      {TAGS.slice(0, 4).map((tg, i) => L(tg, top + 86 + i * 16, tg, st.tag === tg, () => emit('ui.value', { id: id('tag'), value: st.tag === tg ? null : tg })))}
      <div style={{ ...small, left: 16, top: top + 154 }} onPointerDown={(e) => e.button === 0 && emit('ui.value', { id: id('cal'), value: { ...st.cal, sel: null } })}>Refine By Date:</div>
      <Calendar id={id('cal')} x={16} y={top + 168} w={150} />
      <div style={{ ...small, left: 16, top: top + 318 }} onPointerDown={(e) => e.button === 0 && emit('ui.value', { id: id('type'), value: 'all' })}>Of this file type:</div>
      {L('tp', top + 334, 'Pictures', st.type === 'picture', () => emit('ui.value', { id: id('type'), value: st.type === 'picture' ? 'all' : 'picture' }))}
      <div style={{ position: 'absolute', left: 70, top: 0 }}>{L('tv', top + 334, 'Videos', st.type === 'video', () => emit('ui.value', { id: id('type'), value: st.type === 'video' ? 'all' : 'video' }))}</div>
      {/* 2. Choose images */}
      {colHead(c2.x, top + 8, 2, 'Choose images')}
      <div style={{ position: 'absolute', left: c2.x, top: c2.y, width: c2.w, height: c2.h, borderRadius: 4, background: 'rgba(255,255,255,0.75)', boxShadow: `inset 0 0 0 1px ${C.borderLight}` }} onWheel={(e) => max > 0 && emit('ui.value', { id: id('s2'), value: Math.round(Math.min(max, Math.max(0, pos + e.deltaY * 0.6))) })}>
        <div style={{ position: 'absolute', inset: 1, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 6, top: 4, transform: pos ? `translateY(${-pos}px)` : undefined }}>
            {blocks.map(({ g, y }) => (
              <div key={g.id} style={{ position: 'absolute', left: 0, top: y, width: c2.w - 30 }}>
                <div style={{ fontFamily: FONT, fontSize: 10.5, whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#3b6fc0', fontWeight: 500 }}>{g.title}</span>
                  <span style={{ color: '#8cb0e0' }}> | {g.caption}</span>
                </div>
                {g.photos.map((p, i) => (
                  <div
                    key={p.id}
                    style={{ position: 'absolute', left: (i % 5) * 54, top: 20 + Math.floor(i / 5) * 46 }}
                    onPointerEnter={(e) => emit('hover', { id: id('pick'), key: p.id, on: true, ...pt(e) })}
                    onPointerLeave={() => emit('hover', { id: id('pick'), key: p.id, on: false })}
                    onPointerDown={(e) => e.button === 0 && toggle(p.id)}
                  >
                    <Pick p={p} on={set.has(p.id)} lit={lit.get(p.id) || 0} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        {max > 0 && <Scrollbar id={id('s2bar')} x={c2.w - 17} y={1} h={c2.h - 2} viewH={c2.h} contentH={gy} pos={pos} onScroll={(v) => emit('ui.value', { id: id('s2'), value: Math.round(Math.min(max, Math.max(0, v))) })} t={t} />}
      </div>
      {/* 3. Your list */}
      {colHead(500, top + 8, 3, 'Your list')}
      <TextField id={id('name')} x={500} y={top + 32} w={w - 516} h={19} placeholder="Name this album" />
      <div style={{ position: 'absolute', left: 500, top: top + 58, width: w - 516, height: h - top - 108, overflow: 'hidden' }} onWheel={(e) => listMax > 0 && emit('ui.value', { id: id('s3'), value: Math.round(Math.min(listMax, Math.max(0, lpos + e.deltaY * 0.6))) })}>
        <div style={{ transform: lpos ? `translateY(${-lpos}px)` : undefined }}>
          {chosen.map((pid, i) => {
            const p = photoById(pid)
            if (!p) return null
            return (
              <div key={pid} style={{ position: 'relative', height: 46, display: 'flex', alignItems: 'center', gap: 8 }} onDoubleClick={() => toggle(pid)}>
                <div style={{ width: 14, fontFamily: HEAVY, fontSize: 11, color: '#5b7299', textAlign: 'right' }}>{i + 1}</div>
                <img src={p.url} alt="" draggable={false} style={{ width: 48, height: 36, objectFit: 'cover', boxShadow: '0 0 0 1px #c5d3e8' }} />
                <div style={{ fontFamily: FONT, fontSize: 11, color: '#2c6cc4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: w - 600 }}>
                  {p.name}
                  <div style={{ fontSize: 9.5, color: '#8b91a6' }}>{p.kind === 'video' ? 'wmv' : 'jpg'}</div>
                </div>
              </div>
            )
          })}
          {!chosen.length && <div style={{ fontFamily: FONT, fontSize: 10.5, color: C.textDim, lineHeight: '15px', marginTop: 6 }}>Check pictures in column 2 to add them here.</div>}
        </div>
      </div>
      {/* footer */}
      <div style={{ ...small, left: c2.x, top: h - 40, fontSize: 11, color: '#3b7cc6' }} onPointerDown={(e) => e.button === 0 && openWin('pictures', 'pictures')}>File Location:</div>
      <div style={{ position: 'absolute', left: c2.x + 76, top: h - 43, width: 210, height: 19, borderRadius: 3, background: '#fff', boxShadow: `inset 0 0 0 1px ${C.border}`, fontFamily: FONT, fontSize: 10.5, lineHeight: '19px', paddingLeft: 6, color: C.text, whiteSpace: 'nowrap' }}>
        my Pictures &amp; Videos\Albums
      </div>
      <Button id={id('preview')} label="Preview" x={w - 304} y={h - 30} w={80} h={23} disabled={!chosen.length} onClick={() => openWin('slideshow', 'slideshow', { photo: chosen[0], auto: true, album: chosen })} />
      <Button id={id('create')} label="Create this album" isDefault x={w - 218} y={h - 30} w={116} h={23} disabled={!chosen.length} onClick={() => {
        emit('pics.album', { name: name || 'New Album', photos: chosen })
        closeWin(win.id)
        openWin('pictures', 'pictures')
      }} />
      <Button id={id('cancel')} label="Cancel" x={w - 96} y={h - 30} w={80} h={23} onClick={() => closeWin(win.id)} />
    </div>
  )
}

export default {
  id: 'album',
  title: () => 'Create an album',
  taskbarLabel: () => 'Create an album',
  icon: null,
  size: { w: 690, h: 560 },
  position: { x: 95, y: 40 },
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(Album, { watch: ['pics'] }),
}
