// AutoPlay for the digital camera (second reference, f00054): "Transfer pictures and video to
// your computer. Which provider do you want to use?" The camera maker's own program isn't
// installed; Windows Picture and Video Acquisition starts the import wizard. "Always use the
// selected provider" is remembered ('camera.always'), so the camera opens the wizard directly.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { asset } from '../../core/preload.js'
import { scoped, wid, hoverKeys, pt, Button, Checkbox, checkedOf, C, FONT, HEAVY } from '../../ui/index.js'
import { Ico } from '../lib/icons.jsx'
import { openWin, closeWin, messageBox } from '../lib/common.js'

export const ALWAYS = 'camera.always' // ui.value id (session-wide setting)
export function openCamera(t) {
  if (checkedOf(t, ALWAYS, false)) openWin('acquire', 'acquire')
  else openWin('autoplay', 'autoplay')
}

const Option = memo(function Option({ icon, title, sub, lit, focus }) {
  return (
    <div style={{ position: 'relative', width: 380, height: 40 }}>
      {(lit > 0 || focus) && <div style={{ position: 'absolute', inset: 0, borderRadius: 3, background: lit > 0 ? C.rowHover : 'transparent', boxShadow: focus ? 'inset 0 0 0 1px #e2433a' : 'none' }} />}
      <div style={{ position: 'absolute', left: 6, top: 6 }}>{icon}</div>
      <div style={{ position: 'absolute', left: 40, top: 4, fontFamily: HEAVY, fontSize: 11.5, color: '#d27a10', whiteSpace: 'nowrap' }}>{title}</div>
      <div style={{ position: 'absolute', left: 40, top: 20, fontFamily: FONT, fontSize: 10.5, color: '#8b91a6', whiteSpace: 'nowrap' }}>{sub}</div>
    </div>
  )
})

function AutoPlay({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const lit = hoverKeys(t, id('opt'))
  const always = checkedOf(t, ALWAYS, false)
  const hov = (k) => ({
    onPointerEnter: (e) => emit('hover', { id: id('opt'), key: k, on: true, ...pt(e) }),
    onPointerLeave: () => emit('hover', { id: id('opt'), key: k, on: false }),
  })
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <div style={{ position: 'absolute', left: 12, top: 12, fontFamily: FONT, fontSize: 16, color: '#4a5068', whiteSpace: 'nowrap' }}>Transfer pictures and video to your computer</div>
      <div style={{ position: 'absolute', left: 36, top: 36, fontFamily: HEAVY, fontSize: 11, color: '#2c6cc4' }}>Which provider do you want to use?</div>
      <div style={{ position: 'absolute', left: 12, top: 54, width: w - 24, height: 1, background: C.borderLight }} />
      <div style={{ position: 'absolute', left: 12, top: 60 }} {...hov('maker')} onPointerDown={(e) => e.button === 0 && messageBox({ title: 'Digital Camera', icon: 'info', text: "The camera maker's transfer program is not installed on this computer.\nUse Windows Picture and Video Acquisition instead." })}>
        <div style={{ position: 'absolute', left: 40, top: -2, fontFamily: HEAVY, fontSize: 9.5, color: '#2c6cc4' }}>New!</div>
        <div style={{ position: 'relative', top: 8 }}>
          <Option icon={<Ico kind="camera" size={26} />} title="Digital Camera" sub="Capture exceptional images directly to your computer." lit={lit.get('maker') || 0} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 12, top: 118, width: w - 24, height: 1, background: C.borderLight }} />
      <div
        style={{ position: 'absolute', left: 12, top: 126 }}
        {...hov('wia')}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          closeWin(win.id)
          openWin('acquire', 'acquire')
        }}
      >
        <Option icon={<img src={asset('img/desktop/flag.svg')} alt="" draggable={false} style={{ width: 24, height: 22 }} />} title="Windows Picture and Video Acquisition" sub="Automatically copy your images and make them easy to find later." lit={lit.get('wia') || 0} focus />
      </div>
      <Checkbox id={ALWAYS} label="Always use the selected provider" x={20} y={h - 64} checked={always} onChange={(v) => emit('ui.value', { id: ALWAYS, value: v })} />
      <div style={{ position: 'absolute', left: 0, top: h - 40, width: w, height: 40, background: 'linear-gradient(180deg, #7fb2ec, #4f8ad9)' }} />
      <Button id={id('cancel')} label="Cancel" x={w - 96} y={h - 32} w={80} h={23} onClick={() => closeWin(win.id)} />
    </div>
  )
}

export default {
  id: 'autoplay',
  title: () => 'Digital Camera',
  taskbarLabel: () => 'Digital Camera',
  icon: null,
  size: { w: 428, h: 300 },
  position: { x: 140, y: 190 },
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(AutoPlay, {}),
}
