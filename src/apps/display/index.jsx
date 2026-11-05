// Display Properties (desktop context menu > Properties, sidebar thumbnail, Control Panel >
// Display): pick the desktop background, the Stonehenge photo or a plain colour, with a
// preview monitor. Apply / OK emit 'desk.wallpaper' (os/session.js wallpaper()).
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { asset } from '../../core/preload.js'
import { scoped, Button, ListView, Tabs, TabPanel, wid, valueOf, selectionOf, C, FONT } from '../../ui/index.js'
import { WALLPAPERS, wallpaper } from '../../os/session.js'

const keyOf = (w) => (w.kind === 'photo' ? 'photo' : w.color)
const ITEMS = WALLPAPERS.map((w) => ({ key: keyOf(w), cells: [w.name] }))
const byKey = Object.fromEntries(WALLPAPERS.map((w) => [keyOf(w), w]))

const Monitor = memo(function Monitor({ x, y, choice }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 170, height: 150 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 170, height: 124, borderRadius: 8, background: 'linear-gradient(180deg, #e9edf3, #b9c2cf)', boxShadow: 'inset 0 0 0 1px #8794a8, 2px 3px 6px rgba(20,40,80,0.25)' }} />
      <div style={{ position: 'absolute', left: 12, top: 11, width: 146, height: 102, overflow: 'hidden', background: choice.kind === 'color' ? choice.color : '#000', boxShadow: 'inset 0 0 0 1px #4d5a70' }}>
        {choice.kind === 'photo' && <img src={asset('img/desktop/wallpaper.webp')} alt="" draggable={false} style={{ width: 146, height: 102, objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', right: 0, top: 0, width: 16, height: 98, background: 'rgba(120,150,200,0.55)' }} />
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: 146, height: 5, background: 'rgba(60,110,190,0.85)' }} />
      </div>
      <div style={{ position: 'absolute', left: 70, top: 124, width: 30, height: 14, background: 'linear-gradient(180deg, #c3cbd8, #9ea9ba)' }} />
      <div style={{ position: 'absolute', left: 45, top: 138, width: 80, height: 8, borderRadius: 3, background: 'linear-gradient(180deg, #c9d0dc, #8f9aac)' }} />
    </div>
  )
})

function Display({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const current = keyOf(wallpaper(t))
  const sel = selectionOf(t, id('list'))[0] ?? current
  const choice = byKey[sel] || WALLPAPERS[0]
  const apply = () => emit('desk.wallpaper', choice.kind === 'photo' ? { kind: 'photo' } : { kind: 'color', color: choice.color })
  const close = () => emit('win.close', { id: win.id })
  const tab = valueOf(t, id('tabs'), 'desktop')
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <Tabs id={id('tabs')} tabs={[{ key: 'desktop', label: 'Desktop' }, { key: 'settings', label: 'Settings' }]} x={10} y={8} w={w - 20} def="desktop" />
      <TabPanel x={10} y={29} w={w - 20} h={h - 74}>
        {tab === 'desktop' ? (
          <>
            <Monitor x={(w - 20 - 170) / 2} y={10} choice={choice} />
            <div style={{ position: 'absolute', left: 12, top: 168, fontFamily: FONT, fontWeight: 600, fontSize: 10.5, color: C.text }}>Background:</div>
            <ListView id={id('list')} x={12} y={184} w={w - 44} h={h - 74 - 196} items={ITEMS} onOpen={() => (apply(), close())} />
          </>
        ) : (
          <div style={{ padding: 14, fontFamily: FONT, fontSize: 10.5, lineHeight: '17px', color: C.text }}>
            <div>Display: Plug and Play Monitor on VAIO Graphics</div>
            <div>Screen resolution: 1024 by 768 pixels</div>
            <div>Color quality: Highest (32 bit)</div>
          </div>
        )}
      </TabPanel>
      <Button id={id('ok')} label="OK" x={w - 236} y={h - 36} w={70} isDefault onClick={() => (apply(), close())} />
      <Button id={id('cancel')} label="Cancel" x={w - 160} y={h - 36} w={70} onClick={close} />
      <Button id={id('apply')} label="Apply" x={w - 84} y={h - 36} w={70} disabled={current === sel} onClick={apply} />
    </div>
  )
}

export default {
  id: 'display',
  title: () => 'Display Properties',
  taskbarLabel: () => 'Display Properties',
  icon: asset('img/desktop/ic-display.svg'),
  size: { w: 380, h: 400 },
  position: { x: 250, y: 120 },
  minSize: { w: 340, h: 360 },
  explorer: false,
  Content: scoped(Display),
}
