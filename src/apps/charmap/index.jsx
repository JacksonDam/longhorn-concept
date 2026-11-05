// Character Map: a grid of characters in a chosen font; click one to enlarge it, Select adds it
// to "Characters to copy", Copy puts that text on the clipboard.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, valueOf, TextField, textOf, setText, Button, DropMenu, dropBelow, C, FONT } from '../../ui/index.js'
import { closeWin } from '../lib/common.js'

const FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New', 'Tahoma']
const CHARS = []
for (let c = 33; c < 256; c++) if (c < 127 || c > 160) CHARS.push(c)
const COLS = 20

const Grid = memo(function Grid({ font, sel }) {
  return CHARS.map((c, i) => (
    <div
      key={c}
      data-c={c}
      style={{ position: 'absolute', left: (i % COLS) * 19, top: Math.floor(i / COLS) * 19, width: 19, height: 19, boxSizing: 'border-box', border: '1px solid #c5d3e8', marginLeft: -1, marginTop: -1, textAlign: 'center', lineHeight: '17px', fontFamily: `'${font}'`, fontSize: 13, color: c === sel ? '#fff' : '#1d3557', background: c === sel ? '#3d7bd9' : '#fff' }}
    >
      {String.fromCharCode(c)}
    </div>
  ))
})

function CharMap({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const font = valueOf(t, id('font'), 'Arial')
  const sel = valueOf(t, id('sel'), 65)
  const fontItems = FONTS.map((f) => ({ label: f, radio: f === font, onClick: () => emit('ui.value', { id: id('font'), value: f }) }))
  const add = () => setText(id('copy'), textOf(now(), id('copy')) + String.fromCharCode(valueOf(now(), id('sel'), 65)))
  const rows = Math.ceil(CHARS.length / COLS)
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <div style={{ position: 'absolute', left: 12, top: 12, fontFamily: FONT, fontSize: 11, color: C.text }}>Font:</div>
      <div
        style={{ position: 'absolute', left: 48, top: 9, width: 200, height: 20, borderRadius: 3, background: '#fff', boxShadow: `inset 0 0 0 1px ${C.border}`, fontFamily: `'${font}'`, fontSize: 12, lineHeight: '20px', paddingLeft: 6, boxSizing: 'border-box' }}
        onPointerDown={(e) => e.button === 0 && dropBelow(id('dd'), e.currentTarget, fontItems)}
      >
        {font}
        <span style={{ position: 'absolute', right: 6, color: '#3d63a6' }}>{'▾'}</span>
      </div>
      <DropMenu id={id('dd')} items={fontItems} />
      <div
        style={{ position: 'absolute', left: 13, top: 40, width: COLS * 19 - 1, height: rows * 19 - 1 }}
        onPointerDown={(e) => {
          const c = +e.target.dataset?.c
          if (c) emit('ui.value', { id: id('sel'), value: c })
        }}
        onDoubleClick={add}
      >
        <Grid font={font} sel={sel} />
      </div>
      <div style={{ position: 'absolute', right: 12, top: 40, width: 0 }} />
      <div style={{ position: 'absolute', left: 13 + COLS * 19 + 8, top: 40, width: w - (13 + COLS * 19 + 8) - 12, height: 64, borderRadius: 4, background: '#fff', boxShadow: `inset 0 0 0 1px ${C.border}`, textAlign: 'center', lineHeight: '64px', fontFamily: `'${font}'`, fontSize: 40, color: '#1d3557' }}>{String.fromCharCode(sel)}</div>
      <div style={{ position: 'absolute', left: 13 + COLS * 19 + 8, top: 110, fontFamily: FONT, fontSize: 10, color: '#8b91a6', whiteSpace: 'nowrap' }}>U+{sel.toString(16).toUpperCase().padStart(4, '0')}</div>
      <div style={{ position: 'absolute', left: 12, top: h - 62, fontFamily: FONT, fontSize: 11, color: C.text }}>Characters to copy:</div>
      <TextField id={id('copy')} x={120} y={h - 65} w={w - 290} h={20} />
      <Button id={id('select')} label="Select" x={w - 162} y={h - 66} w={72} h={23} onClick={add} />
      <Button id={id('copyb')} label="Copy" x={w - 84} y={h - 66} w={72} h={23} onClick={() => navigator.clipboard?.writeText(textOf(now(), id('copy'))).catch(() => {})} />
      <Button id={id('close')} label="Close" x={w - 84} y={h - 36} w={72} h={23} onClick={() => closeWin(win.id)} />
    </div>
  )
}

export default {
  id: 'charmap',
  title: () => 'Character Map',
  taskbarLabel: () => 'Character Map',
  icon: null,
  size: { w: 480, h: 340 },
  position: { x: 240, y: 140 },
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(CharMap, {}),
}
