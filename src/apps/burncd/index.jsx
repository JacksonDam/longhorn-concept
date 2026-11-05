// Burn CD (my Music, pictures "Copy all items to CD", Burn DVD): asks for a blank disc. There is
// no disc in the drive: "Try Again" checks the drive for a moment and reports that again.
//   win.open { id: 'burncd', app: 'burncd', props: { what: 'music' | 'pictures' | 'dvd' } }
import { emit } from '../../core/events.js'
import { scoped, wid, valueOf, lastOf, Button, Checkbox, MessageIcon, C, FONT } from '../../ui/index.js'
import { closeWin } from '../lib/common.js'

const CHECK = 1.6 // s the drive "spins up" when checking

function BurnCD({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const what = win.props?.what || 'music'
  const dvd = what === 'dvd'
  const disc = dvd ? 'DVD' : 'CD'
  const tryE = lastOf(t, 'ui.value', id('try'))
  const checking = tryE && t - tryE.t < CHECK
  const tries = valueOf(t, id('try'), 0)
  const items = { music: 'the selected music', pictures: 'the pictures in my Pictures & Videos', dvd: 'your pictures and videos' }[what]
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <div style={{ position: 'absolute', left: 20, top: 18 }}>
        <MessageIcon kind="cd" size={48} />
      </div>
      <div style={{ position: 'absolute', left: 84, top: 14, fontFamily: FONT, fontSize: 19, fontWeight: 300, color: C.headingLight, whiteSpace: 'nowrap' }}>
        burn <span style={{ fontWeight: 500, color: C.heading }}>{disc}</span>
      </div>
      <div style={{ position: 'absolute', left: 84, top: 44, right: 20, fontFamily: FONT, fontSize: 11.5, lineHeight: '17px', color: C.text }}>
        Insert a blank, writable {disc} into the DVD-RW Drive (D:) to burn {items}.
      </div>
      <div style={{ position: 'absolute', left: 84, top: 92, right: 20, height: 22, borderRadius: 4, background: '#fff', boxShadow: `inset 0 0 0 1px ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', fontFamily: FONT, fontSize: 11, color: checking ? '#3b7cc6' : '#a0472c' }}>
        {checking ? (
          <>
            <Spinner t={t} />
            Checking drive D:...
          </>
        ) : (
          <>{tries ? `No disc found in drive D: (checked ${tries} time${tries > 1 ? 's' : ''}).` : 'No disc found in drive D:.'}</>
        )}
      </div>
      <Checkbox id={id('close')} label="Close the wizard after the files have been written" x={84} y={124} def />
      <Button id={id('try')} label="Try Again" x={w - 270} y={h - 36} w={80} h={23} disabled={checking} onClick={() => emit('ui.value', { id: id('try'), value: tries + 1 })} />
      <Button id={id('burn')} label={`Burn ${disc}`} isDefault x={w - 184} y={h - 36} w={80} h={23} disabled />
      <Button id={id('cancel')} label="Cancel" x={w - 98} y={h - 36} w={80} h={23} onClick={() => closeWin(win.id)} />
    </div>
  )
}

function Spinner({ t }) {
  const a = (t * 360 * 1.5) % 360
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ transform: `rotate(${a}deg)` }}>
      <circle cx="7" cy="7" r="5.5" fill="none" stroke="#c9dbf3" strokeWidth="2" />
      <path d="M7 1.5 A5.5 5.5 0 0 1 12.5 7" fill="none" stroke="#3d7bd9" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default {
  id: 'burncd',
  title: (p) => (p.what === 'dvd' ? 'Burn DVD' : 'Burn CD'),
  taskbarLabel: (p) => (p.what === 'dvd' ? 'Burn DVD' : 'Burn CD'),
  icon: null,
  size: { w: 440, h: 210 },
  position: { x: 240, y: 230 },
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(BurnCD),
}
