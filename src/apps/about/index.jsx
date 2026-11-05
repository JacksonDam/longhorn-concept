// About Windows (and, with props.product 'ie', About Internet Explorer).
import { memo } from 'react'
import { asset } from '../../core/preload.js'
import { scoped, Button, C, FONT, HEAVY } from '../../ui/index.js'
import { Ico } from '../lib/icons.jsx'
import { closeWin } from '../lib/common.js'
import { userName } from '../lib/user.js'

const line = { fontFamily: FONT, fontSize: 11, lineHeight: '16px', color: C.text }

const WindowsAbout = memo(function WindowsAbout({ user }) {
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 86, background: 'linear-gradient(180deg, #2f6fc9 0, #4b8ee0 60%, #6aa8f0 100%)' }} />
      <div style={{ position: 'absolute', left: 0, top: 84, right: 0, height: 2, background: 'linear-gradient(90deg, #f29a3c, #ffd36b 40%, #8fd24c 70%, #4aa3ef)' }} />
      <img src={asset('img/desktop/flag.svg')} alt="" draggable={false} style={{ position: 'absolute', left: 24, top: 18, width: 54, height: 48, filter: 'drop-shadow(0 2px 3px rgba(0,30,90,0.4))' }} />
      <div style={{ position: 'absolute', left: 92, top: 20, fontFamily: FONT, fontSize: 13, color: '#d8ecff' }}>Microsoft®</div>
      <div style={{ position: 'absolute', left: 90, top: 32, fontFamily: HEAVY, fontSize: 32, color: '#ffffff', letterSpacing: -0.5 }}>Windows</div>
      <div style={{ position: 'absolute', left: 22, top: 102, right: 22, ...line }}>
        <div>Microsoft® Windows</div>
        <div>Version 6.0 (Build 4051)</div>
        <div>Copyright © 1985-2003 Microsoft Corporation</div>
        <div style={{ height: 1, background: C.borderLight, margin: '10px 0' }} />
        <div>This product is licensed under the terms of the End-User License Agreement to:</div>
        <div style={{ paddingLeft: 20, color: '#2d3550', fontFamily: HEAVY }}>{user}</div>
        <div style={{ height: 1, background: C.borderLight, margin: '10px 0' }} />
        <div>Physical memory available to Windows: 524,288 KB</div>
      </div>
    </>
  )
})

const IEAbout = memo(function IEAbout({ user }) {
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 86, background: 'linear-gradient(180deg, #2f6fc9 0, #4b8ee0 60%, #6aa8f0 100%)' }} />
      <div style={{ position: 'absolute', left: 26, top: 20 }}>
        <Ico kind="ie" size={48} />
      </div>
      <div style={{ position: 'absolute', left: 92, top: 22, fontFamily: FONT, fontSize: 13, color: '#d8ecff' }}>Microsoft®</div>
      <div style={{ position: 'absolute', left: 90, top: 36, fontFamily: HEAVY, fontSize: 24, color: '#ffffff' }}>Internet Explorer 6</div>
      <div style={{ position: 'absolute', left: 22, top: 102, right: 22, ...line }}>
        <div>Version: 6.0.2800.1106</div>
        <div>Cipher Strength: 128-bit</div>
        <div>Product ID: 55274-640-0000000-00000</div>
        <div>Update Versions: SP1;</div>
        <div style={{ height: 1, background: C.borderLight, margin: '10px 0' }} />
        <div>Copyright © 1995-2003 Microsoft Corp.</div>
        <div style={{ height: 1, background: C.borderLight, margin: '10px 0' }} />
        <div>Licensed to: {user}</div>
      </div>
    </>
  )
})

function About({ win, t }) {
  const ie = win.props?.product === 'ie'
  const user = userName(t)
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      {ie ? <IEAbout user={user} /> : <WindowsAbout user={user} />}
      <Button id={win.id + '.ok'} label="OK" isDefault x={312} y={266} w={80} h={23} onClick={() => closeWin(win.id)} />
    </div>
  )
}

export default {
  id: 'about',
  title: (p) => (p.product === 'ie' ? 'About Internet Explorer' : 'About Windows'),
  taskbarLabel: (p) => (p.product === 'ie' ? 'About Internet Explorer' : 'About Windows'),
  icon: null,
  size: { w: 410, h: 326 },
  position: { x: 240, y: 170 },
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(About, {}),
}
