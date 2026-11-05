// Dev-only gallery of the UI kit (src/ui) inside a real PlexWindow, for testing and benching the
// controls: window.__wm.emit('win.open', { id: 'uikit', app: 'uikit' }). Not registered in builds.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import {
  scoped, Button, MenuBar, ContextMenu, contextHandler, TextField, Checkbox, Radio, Slider, ListView, Tabs, TabPanel,
  ScrollView, Tooltip, Dialog, MessageIcon, wid, valueOf, tabOf, C, FONT,
} from '../../ui/index.js'

const ROWS = Array.from({ length: 30 }, (_, i) => ({
  key: 'r' + i,
  cells: [['Budget notes', 'Trip photos', 'Recipes', 'Holiday list', 'Garden plan'][i % 5] + ' ' + (i + 1), `${(i * 37) % 900 + 12} KB`, `10/${(i % 28) + 1}/2003`],
  sort: [null, (i * 37) % 900 + 12, i % 28],
}))

const Para = memo(function Para() {
  return (
    <div style={{ padding: 8, fontFamily: FONT, fontSize: 11, lineHeight: '16px', color: C.text }}>
      {Array.from({ length: 12 }, (_, i) => (
        <p key={i} style={{ margin: '0 0 8px' }}>
          Paragraph {i + 1}. A short neutral line of text to fill the scroll view so that its scrollbar has something to move.
        </p>
      ))}
    </div>
  )
})

function Kit({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const menus = [
    { key: 'file', label: 'File', items: [{ label: 'New', shortcut: 'Ctrl+N' }, { label: 'Open...', shortcut: 'Ctrl+O' }, '-', { label: 'Recent', items: [{ label: 'Budget notes' }, { label: 'Recipes' }] }, '-', { label: 'Close', onClick: () => emit('win.close', { id: win.id }) }] },
    { key: 'edit', label: 'Edit', items: [{ label: 'Undo', shortcut: 'Ctrl+Z', disabled: true }, '-', { label: 'Cut' }, { label: 'Copy' }, { label: 'Paste' }] },
    { key: 'view', label: 'View', items: [{ label: 'Status Bar', checked: valueOf(t, id('sb'), true), onClick: () => emit('ui.value', { id: id('sb'), value: !valueOf(t, id('sb'), true) }) }, { label: 'Icons', radio: true }, { label: 'Details' }] },
    { key: 'help', label: 'Help', items: [{ label: 'About Windows', onClick: () => emit('win.open', { id: 'about', app: 'about' }) }] },
  ]
  const tab = tabOf(t, id('tabs'), 'a')
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }} onContextMenu={contextHandler(id('ctx'), [{ label: 'Refresh' }, { label: 'Properties' }])}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: 22, background: C.band }} />
      <MenuBar id={id('menu')} menus={menus} x={6} y={2} />
      <Button id={id('ok')} label="OK" x={16} y={36} isDefault onClick={() => emit('ui.value', { id: id('n'), value: valueOf(t, id('n'), 0) + 1 })} />
      <Button id={id('cancel')} label="Cancel" x={100} y={36} />
      <Button id={id('dis')} label="Disabled" x={184} y={36} disabled />
      <Tooltip forId={id('ok')} text={`Clicked ${valueOf(t, id('n'), 0)} times`} />
      <div style={{ position: 'absolute', left: 270, top: 30, width: 200, height: 34, background: C.band, borderRadius: 4 }}>
        <Button id={id('glass')} label="Glass" variant="glass" x={6} y={6} w={70} />
      </div>
      <TextField id={id('tf')} x={16} y={72} w={250} placeholder="type here..." />
      <TextField id={id('ta')} x={16} y={100} w={250} h={60} multiline placeholder="a few lines..." />
      <Checkbox id={id('cb1')} label="Show hidden files" x={290} y={74} />
      <Checkbox id={id('cb2')} label="Remember my password" x={290} y={94} def />
      <Radio group={id('rg')} option="a" label="Icons" x={290} y={118} def="a" />
      <Radio group={id('rg')} option="b" label="Details" x={290} y={136} def="a" />
      <Slider id={id('sl')} x={16} y={172} w={160} def={0.3} />
      <Slider id={id('sl2')} x={200} y={172} w={46} variant="wedge" def={0.5} />
      <Tabs id={id('tabs')} tabs={[{ key: 'a', label: 'General' }, { key: 'b', label: 'Sharing' }, { key: 'c', label: 'Customize' }]} x={14} y={196} w={260} />
      <TabPanel x={14} y={217} w={260} h={60}>
        <div style={{ padding: 10, fontFamily: FONT, fontSize: 11, color: C.text }}>Tab: {tab}</div>
      </TabPanel>
      <ListView
        id={id('list')}
        x={16}
        y={286}
        w={300}
        h={h - 296}
        columns={[{ label: 'Name', w: 140 }, { label: 'Size', w: 60, align: 'right' }, { label: 'Modified', w: 80 }]}
        items={ROWS}
      />
      <ScrollView id={id('sv')} x={330} y={286} w={w - 346} h={h - 296} style={{ background: '#fff', boxShadow: `inset 0 0 0 1px ${C.borderLight}` }}>
        <Para />
      </ScrollView>
      <div style={{ position: 'absolute', left: 500, top: 30 }}>
        <MessageIcon kind="info" />
      </div>
      <div style={{ position: 'absolute', left: 545, top: 30 }}>
        <MessageIcon kind="warning" />
      </div>
      <div style={{ position: 'absolute', left: 590, top: 30 }}>
        <MessageIcon kind="error" />
      </div>
      <div style={{ position: 'absolute', left: 635, top: 30 }}>
        <MessageIcon kind="cd" />
      </div>
      <div style={{ position: 'absolute', left: 330, top: 160, width: 330, height: 120, borderRadius: 4, overflow: 'hidden', boxShadow: `0 0 0 1px ${C.borderLight}` }}>
        <Dialog id={id('dlg')} icon="question" text={'Do you want to save the changes\nto Document 1?'} buttons={[{ label: 'Yes', isDefault: true }, { label: 'No' }, { label: 'Cancel' }]} bw={64} />
      </div>
      <ContextMenu id={id('ctx')} items={[{ label: 'Refresh' }, { label: 'Properties' }]} />
    </div>
  )
}

export default import.meta.env.DEV
  ? {
      id: 'uikit',
      title: () => 'UI kit',
      taskbarLabel: () => 'UI kit',
      icon: null,
      size: { w: 700, h: 560 },
      position: { x: 60, y: 60 },
      explorer: false,
      Content: scoped(Kit),
    }
  : null
