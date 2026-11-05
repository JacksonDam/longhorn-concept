// Edit Pictures (ref2 f01190): Original / Edited tabs over the photo, a tool bar (rotate, auto
// adjust, red-eye, voice note), the photo's details, "Identify person" (click the photo to place
// a box, type a name with Recent Contacts completion), OK saves ('pics.edit'), Cancel discards.
//   win.open { id: 'picedit', app: 'picedit', props: { photo } }
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, valueOf, Tabs, Button, ToolButton, Tooltip, TextField, textOf, setText, focusField, hoverKeys, pt, stageRect, C, FONT, HEAVY } from '../../ui/index.js'
import { photoById, PHOTOS } from '../lib/pictures.jsx'
import { library, editStyle } from '../pictures/state.js'
import { Ico } from '../lib/icons.jsx'
import { closeWin, openWin } from '../lib/common.js'

const CONTACTS = ['Kate Lee', 'Kathrine Schneider', 'Kobe Jacobsen', 'Kujo Johnson', 'Kwon Joon', 'Anthony', 'Harold', 'Kathy', 'Hank', 'Justin']
const PH = { x: 34, y: 48, w: 420, h: 300 }

const lbl = { fontFamily: FONT, fontSize: 10.5, color: '#8b91a6', whiteSpace: 'nowrap', width: 70, flex: 'none' }
const val = { fontFamily: FONT, fontSize: 10.5, color: '#4a5068', lineHeight: '14px' }

const Info = memo(function Info({ p }) {
  const row = (label, value, blue) => (
    <div key={label} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
      <div style={lbl}>{label}</div>
      <div style={{ ...val, color: blue ? '#4a7fd0' : val.color }}>{value}</div>
    </div>
  )
  return (
    <div style={{ position: 'absolute', left: 476, top: 48, width: 240 }}>
      {row('Comments:', `< ${p.comment} >`, true)}
      {row('Keywords ▾', `< ${p.keywords.join(', ')} >`, true)}
      {row('Location:', p.location)}
      <div style={{ height: 18 }} />
      {row('Stored in:', 'Family Computer')}
      {row('Creator', 'Sondra')}
      {row('Size:', p.size)}
      {row('Date Created:', p.created)}
    </div>
  )
})

function PicEdit({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const p = photoById(win.props?.photo) || PHOTOS[0]
  const saved = library(t).edits.get(p.id) || { rot: 0, adjust: false }
  const ed = valueOf(t, id('ed'), saved)
  const tab = valueOf(t, id('tab'), 'edited')
  const mode = valueOf(t, id('mode'), null) // 'identify' | 'name' | null
  const box = valueOf(t, id('box'), null)
  const tags = valueOf(t, id('tags'), [])
  const redeye = valueOf(t, id('redeye'), false)
  const setEd = (v) => emit('ui.value', { id: id('ed'), value: { ...ed, ...v } })
  const shown = tab === 'edited' ? ed : null
  const typed = textOf(t, id('name')).trim().toLowerCase()
  const matches = typed ? CONTACTS.filter((c) => c.toLowerCase().startsWith(typed) || c.toLowerCase().split(' ').some((x) => x.startsWith(typed))) : CONTACTS.slice(0, 5)
  const lit = hoverKeys(t, id('ac'))
  const choose = (name) => {
    emit('ui.value', { id: id('tags'), value: [...tags, { ...box, name }] })
    emit('ui.value', { id: id('mode'), value: null })
    setText(id('name'), '')
  }
  const elapsed = valueOf(t, id('voice'), null)
  const voice = elapsed ? Math.min(62, Math.floor(t - elapsed)) : 62
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <div style={{ position: 'absolute', left: PH.x, top: 8, fontFamily: HEAVY, fontSize: 16, color: '#2c6cc4' }}>{p.name}</div>
      <Tabs id={id('tab')} tabs={[{ key: 'original', label: 'Original' }, { key: 'edited', label: 'Edited' }]} x={PH.x - 6} y={PH.y - 22} w={200} def="edited" />
      <div
        style={{ position: 'absolute', left: PH.x, top: PH.y, width: PH.w, height: PH.h, overflow: 'hidden', background: '#000', boxShadow: '0 0 0 1px #9cb2d0, 0 5px 12px rgba(40,70,130,0.3)' }}
        onPointerDown={(e) => {
          if (mode !== 'identify' || e.button !== 0) return
          const r = stageRect(e.currentTarget)
          const q = pt(e)
          emit('ui.value', { id: id('box'), value: { x: Math.round(Math.min(PH.w - 50, Math.max(0, q.x - r.x - 25))), y: Math.round(Math.min(PH.h - 60, Math.max(0, q.y - r.y - 30))) } })
          emit('ui.value', { id: id('mode'), value: 'name' })
          setTimeoutFocus(id('name'))
        }}
      >
        <img src={p.url} alt="" draggable={false} style={{ width: PH.w, height: PH.h, objectFit: 'cover', display: 'block', ...editStyle(shown), filter: [editStyle(shown)?.filter, redeye && tab === 'edited' ? 'saturate(0.95)' : null].filter(Boolean).join(' ') || undefined }} />
        {tags.map((tg, i) => (
          <div key={i} style={{ position: 'absolute', left: tg.x, top: tg.y, width: 50, height: 60, boxShadow: 'inset 0 0 0 1.5px #ffe14a' }}>
            <div style={{ position: 'absolute', left: 0, top: 62, padding: '1px 4px', background: 'rgba(255,225,74,0.9)', fontFamily: FONT, fontSize: 10, color: '#3a2a00', whiteSpace: 'nowrap' }}>{tg.name}</div>
          </div>
        ))}
        {box && mode === 'name' && <div style={{ position: 'absolute', left: box.x, top: box.y, width: 50, height: 60, boxShadow: 'inset 0 0 0 1.5px #ffe14a' }} />}
        {mode === 'identify' && <div style={{ position: 'absolute', left: 0, right: 0, top: 8, textAlign: 'center', fontFamily: FONT, fontSize: 11, color: '#fff', textShadow: '0 1px 2px #000' }}>Click the person in the picture</div>}
      </div>
      {/* tool and annotation bar */}
      <div style={{ position: 'absolute', left: PH.x, top: PH.y + PH.h + 4, width: PH.w, height: 28, borderRadius: '0 0 6px 6px', background: 'linear-gradient(180deg, #5b98e6, #3f78c4)' }} />
      {[
        ['rl', 'undo', 'Rotate counterclockwise', () => setEd({ rot: (ed.rot - 90) % 360 })],
        ['rr', 'redo', 'Rotate clockwise', () => setEd({ rot: (ed.rot + 90) % 360 })],
        ['adj', 'refresh', 'Auto adjust', () => setEd({ adjust: !ed.adjust })],
        ['eye', 'emoticon', 'Fix red eye', () => emit('ui.value', { id: id('redeye'), value: !redeye })],
      ].map(([k, icon, tip, fn], i) => (
        <div key={k}>
          <ToolButton id={id('tb.' + k)} x={PH.x + 6 + i * 30} y={PH.y + PH.h + 6} w={26} h={24} icon={<Ico kind={icon} size={18} />} onClick={fn} active={(k === 'adj' && ed.adjust) || (k === 'eye' && redeye)} />
          <Tooltip forId={id('tb.' + k)} text={tip} />
        </div>
      ))}
      <ToolButton id={id('tb.voice')} x={PH.x + PH.w - 96} y={PH.y + PH.h + 6} w={26} h={24} icon={<Ico kind="volume" size={18} />} onClick={() => emit('ui.value', { id: id('voice'), value: now() })} />
      <Tooltip forId={id('tb.voice')} text="Play voice annotation" />
      <div style={{ position: 'absolute', left: PH.x + PH.w - 64, top: PH.y + PH.h + 11, fontFamily: HEAVY, fontSize: 11, color: '#7dff7a' }}>00:{String(Math.floor(voice / 60)).padStart(2, '0')}:{String(voice % 60).padStart(2, '0')}</div>
      <Info p={p} />
      <Button id={id('ident')} x={476} y={226} w={110} h={21} onClick={() => emit('ui.value', { id: id('mode'), value: mode ? null : 'identify' })} active={!!mode}>
        Identify person
      </Button>
      {mode === 'name' && (
        <>
          <div style={{ position: 'absolute', left: 476, top: 256, fontFamily: FONT, fontSize: 10.5, color: '#8b91a6' }}>Enter name:</div>
          <TextField id={id('name')} x={476} y={272} w={150} h={18} onEnter={(v) => v.trim() && choose(matches[0] && typed ? matches[0] : v.trim())} />
          <div style={{ position: 'absolute', left: 476, top: 292, width: 168, padding: '3px 0', borderRadius: 4, background: '#fff', boxShadow: '0 0 0 1px #8fa9cf, 2px 3px 6px rgba(20,50,100,0.3)', zIndex: 2 }}>
            <div style={{ padding: '0 8px', fontFamily: FONT, fontSize: 10, color: '#8b91a6', lineHeight: '15px' }}>Recent Contacts:</div>
            {matches.slice(0, 5).map((c) => (
              <div
                key={c}
                style={{ padding: '0 8px', lineHeight: '17px', fontFamily: HEAVY, fontSize: 11, color: '#1d3f78', background: (lit.get(c) || 0) > 0.5 ? C.rowHover : 'transparent' }}
                onPointerEnter={(e) => emit('hover', { id: id('ac'), key: c, on: true, ...pt(e) })}
                onPointerLeave={() => emit('hover', { id: id('ac'), key: c, on: false })}
                onPointerDown={(e) => e.button === 0 && choose(c)}
              >
                {c}
              </div>
            ))}
            <div style={{ height: 1, background: C.borderLight, margin: '3px 0' }} />
            <div style={{ padding: '0 8px', lineHeight: '17px', fontFamily: HEAVY, fontSize: 11, color: '#2c6cc4' }} onPointerDown={() => openWin('search', 'search')}>
              Find Other People...
            </div>
          </div>
        </>
      )}
      <Button id={id('ok')} label="OK" isDefault x={w - 186} y={h - 34} w={80} h={23} onClick={() => {
        emit('pics.edit', { photo: p.id, rot: ed.rot, adjust: ed.adjust })
        closeWin(win.id)
      }} />
      <Button id={id('cancel')} label="Cancel" x={w - 98} y={h - 34} w={80} h={23} onClick={() => closeWin(win.id)} />
    </div>
  )
}
function voicePlaying(win, t) {
  const e = valueOf(t, wid(win, 'voice'), null)
  return e != null && t - e < 63
}
// move the keyboard into the name field once it has mounted (input handling, not a visual)
function setTimeoutFocus(fid) {
  requestAnimationFrame(() => requestAnimationFrame(() => focusField(fid)))
}

export default {
  id: 'picedit',
  title: () => 'Edit Pictures',
  taskbarLabel: () => 'Edit Pictures',
  icon: null,
  size: { w: 740, h: 440 },
  position: { x: 70, y: 70 },
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(PicEdit, { watch: ['pics'], alive: (win, t) => voicePlaying(win, t) }),
  liveTime: (win, t, base) => (voicePlaying(win, t) ? t : base),
}
