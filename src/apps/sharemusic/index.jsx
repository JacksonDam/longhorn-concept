// Share Music (and "Share this folder"): network sharing for a folder. The settings are kept
// ('share.set' { folder, on, name, write }).
//   win.open { id: 'sharemusic', app: 'sharemusic', props: { folder? } }
import { emit, getLog } from '../../core/events.js'
import { scoped, wid, valueOf, TextField, textOf, Button, Checkbox, Tabs, TabPanel, focusField, C, FONT, HEAVY } from '../../ui/index.js'
import { Ico } from '../lib/icons.jsx'
import { closeWin, openWin } from '../lib/common.js'
import { openMusic } from '../lib/fs.js'

// the folder's saved settings (latest 'share.set' at or before t)
function saved(t, folder) {
  let s = null
  for (const e of getLog()) {
    if (e.t > t) break
    if (e.type === 'share.set' && e.folder === folder) s = e
  }
  return s
}

function Share({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const folder = win.props?.folder || 'my Music'
  const s = saved(t, folder)
  const on = valueOf(t, id('on'), s ? s.on : false)
  const write = valueOf(t, id('write'), s ? s.write : false)
  const toggle = () => emit('ui.value', { id: id('on'), value: !on })
  const openFolder = () => (/pictures/i.test(folder) ? openWin('pictures', 'pictures') : /music/i.test(folder) ? openMusic() : openWin('documents', 'documents'))
  const apply = () => emit('share.set', { folder, on, write, name: textOf(t, id('name'), s?.name || folder) })
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <Tabs id={id('tab')} tabs={[{ key: 'sharing', label: 'Sharing' }]} x={10} y={8} w={w - 20} />
      <TabPanel x={10} y={29} w={w - 20} h={h - 74}>
        <div style={{ position: 'absolute', left: 14, top: 14 }} onPointerDown={(e) => e.button === 0 && openFolder()}>
          <Ico kind="shared" size={40} />
        </div>
        <div style={{ position: 'absolute', left: 64, top: 16, fontFamily: HEAVY, fontSize: 13, color: '#2c6cc4' }} onPointerDown={(e) => e.button === 0 && openFolder()}>{folder}</div>
        <div onPointerDown={(e) => e.button === 0 && toggle()} style={{ position: 'absolute', left: 64, top: 34, right: 14, fontFamily: FONT, fontSize: 10.5, lineHeight: '15px', color: '#8b91a6' }}>Share this folder with other people who use this network.</div>
        <div style={{ position: 'absolute', left: 14, top: 72, fontFamily: HEAVY, fontSize: 11, color: '#3b7cc6' }} onPointerDown={(e) => e.button === 0 && toggle()}>Network sharing and security</div>
        <Checkbox id={id('on')} label="Share this folder on the network" x={14} y={94} checked={on} onChange={(v) => emit('ui.value', { id: id('on'), value: v })} />
        <div onPointerDown={(e) => e.button === 0 && on && focusField(id('name'))} style={{ position: 'absolute', left: 32, top: 120, fontFamily: FONT, fontSize: 11, color: on ? C.text : '#a4abbb' }}>Share name:</div>
        <TextField id={id('name')} def={s?.name || folder} x={104} y={117} w={w - 140} h={20} disabled={!on} />
        <Checkbox id={id('write')} label="Allow network users to change my files" x={32} y={146} disabled={!on} checked={write} onChange={(v) => emit('ui.value', { id: id('write'), value: v })} />
      </TabPanel>
      <Button id={id('ok')} label="OK" isDefault x={w - 262} y={h - 36} w={78} h={23} onClick={() => (apply(), closeWin(win.id))} />
      <Button id={id('cancel')} label="Cancel" x={w - 178} y={h - 36} w={78} h={23} onClick={() => closeWin(win.id)} />
      <Button id={id('apply')} label="Apply" x={w - 94} y={h - 36} w={78} h={23} onClick={apply} />
    </div>
  )
}

export default {
  id: 'sharemusic',
  title: (p) => `${p.folder || 'my Music'} Properties`,
  taskbarLabel: (p) => `${p.folder || 'my Music'} Properties`,
  icon: null,
  size: { w: 400, h: 330 },
  position: { x: 280, y: 160 },
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(Share, { watch: ['share'] }),
}
