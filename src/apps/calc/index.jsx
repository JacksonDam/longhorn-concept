// Calculator: the standard four-function calculator with memory, square root, percent and 1/x.
// Its state is logged ('ui.value' <win>/calc); digits and operators also come from the keyboard
// while the window is active.
import { memo, useEffect } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, valueOf, Button, C, FONT, HEAVY } from '../../ui/index.js'
import { AppTop, appTopHeight, chromeTop } from '../lib/chrome.jsx'
import { closeWin, messageBox } from '../lib/common.js'

const S0 = { d: '0', acc: null, op: null, fresh: true, mem: 0, err: false }
const fmt = (x) => {
  if (!isFinite(x)) return 'Cannot divide by zero.'
  const s = String(+x.toPrecision(12))
  return s.length > 16 ? x.toExponential(8) : s
}
const apply = (a, op, b) => (op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : op === '/' ? a / b : b)

export function step(s, k) {
  if (s.err && k !== 'C') return s
  const cur = parseFloat(s.d)
  if (/^[0-9]$/.test(k)) return { ...s, d: s.fresh || s.d === '0' ? k : s.d.length < 16 ? s.d + k : s.d, fresh: false }
  if (k === '.') return s.fresh ? { ...s, d: '0.', fresh: false } : s.d.includes('.') ? s : { ...s, d: s.d + '.' }
  if (k === 'C') return { ...S0, mem: s.mem }
  if (k === 'CE') return { ...s, d: '0', fresh: true }
  if (k === 'BS') return s.fresh ? s : { ...s, d: s.d.length > 1 ? s.d.slice(0, -1) : '0' }
  if (k === '+/-') return { ...s, d: s.d.startsWith('-') ? s.d.slice(1) : s.d === '0' ? '0' : '-' + s.d }
  if (k === 'sqrt') return cur < 0 ? { ...s, d: 'Invalid input for function.', err: true } : { ...s, d: fmt(Math.sqrt(cur)), fresh: true }
  if (k === '1/x') return cur === 0 ? { ...s, d: 'Cannot divide by zero.', err: true } : { ...s, d: fmt(1 / cur), fresh: true }
  if (k === '%') return { ...s, d: fmt(((s.acc ?? 0) * cur) / 100), fresh: true }
  if (k === 'MC') return { ...s, mem: 0 }
  if (k === 'MR') return { ...s, d: fmt(s.mem), fresh: true }
  if (k === 'MS') return { ...s, mem: cur, fresh: true }
  if (k === 'M+') return { ...s, mem: s.mem + cur, fresh: true }
  if ('+-*/'.includes(k)) {
    const acc = s.acc == null || s.fresh ? (s.acc == null ? cur : s.acc) : apply(s.acc, s.op, cur)
    const r = s.acc != null && !s.fresh ? apply(s.acc, s.op, cur) : acc
    return { ...s, acc: r, op: k, d: fmt(r), fresh: true, err: !isFinite(r) }
  }
  if (k === '=') {
    if (s.op == null) return { ...s, fresh: true }
    const r = apply(s.acc, s.op, cur)
    return { ...s, d: fmt(r), acc: null, op: null, fresh: true, err: !isFinite(r) }
  }
  return s
}

const KEYS = [
  ['MC', '7', '8', '9', '/', 'sqrt'],
  ['MR', '4', '5', '6', '*', '%'],
  ['MS', '1', '2', '3', '-', '1/x'],
  ['M+', '0', '+/-', '.', '+', '='],
]

const Display = memo(function Display({ d, mem, w }) {
  return (
    <>
      <div style={{ position: 'absolute', left: 10, top: 6, width: w - 20, height: 28, borderRadius: 4, background: 'linear-gradient(180deg, #f2f8ff, #ffffff)', boxShadow: `inset 0 0 0 1px ${C.border}, inset 0 1px 3px rgba(30,70,140,0.2)` }} />
      <div style={{ position: 'absolute', left: 16, top: 6, width: w - 32, height: 28, lineHeight: '28px', textAlign: 'right', fontFamily: HEAVY, fontSize: 16, color: '#1d3557', whiteSpace: 'nowrap', overflow: 'hidden' }}>{d}</div>
      {mem !== 0 && <div style={{ position: 'absolute', left: 14, top: 40, fontFamily: HEAVY, fontSize: 11, color: '#2c6cc4' }}>M</div>}
    </>
  )
})

function Calc({ win, t, w, active, live }) {
  const id = wid(win, 'calc')
  const s = valueOf(t, id, S0)
  const press = (k) => emit('ui.value', { id, value: step(valueOf(now(), id, S0), k) })
  useEffect(() => {
    if (!active || !live) return
    const map = { Enter: '=', '=': '=', Escape: 'C', Backspace: 'BS', Delete: 'CE' }
    const on = (e) => {
      if (e.target?.classList?.contains('lh-input')) return
      const k = /^[0-9.+\-*/%]$/.test(e.key) ? e.key : map[e.key]
      if (!k) return
      e.preventDefault()
      press(k)
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, live, id])
  const top = appTopHeight({ toolbar: false })
  const menus = [
    { key: 'edit', label: 'Edit', items: [{ label: 'Clear', shortcut: 'Esc', onClick: () => press('C') }] },
    { key: 'view', label: 'View', items: [{ label: 'Standard', radio: true }] },
    { key: 'help', label: 'Help', items: [{ label: 'About Calculator', onClick: () => messageBox({ title: 'About Calculator', icon: 'info', text: 'Microsoft® Calculator\nVersion 5.1\nCopyright © 1981-2003 Microsoft Corporation' }) }, '-', { label: 'Close', onClick: () => closeWin(win.id) }] },
  ]
  const bw = (w - 20 - 5 * 4) / 6
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <AppTop id={wid(win, 'm')} w={w} menus={menus} />
      <div style={{ position: 'absolute', left: 0, top, width: w }}>
        <Display d={s.d} mem={s.mem} w={w} />
        <Button id={wid(win, 'k.BS')} label="Backspace" x={w - 10 - 3 * (bw + 4) + 4} y={42} w={bw * 1.5} h={24} onClick={() => press('BS')} />
        <Button id={wid(win, 'k.CE')} label="CE" x={w - 10 - 1.5 * (bw + 4) + 4} y={42} w={bw * 0.75 + 1} h={24} onClick={() => press('CE')} />
        <Button id={wid(win, 'k.C')} label="C" x={w - 10 - 0.75 * (bw + 4) + 3} y={42} w={bw * 0.75 + 1} h={24} onClick={() => press('C')} />
        {KEYS.map((row, r) =>
          row.map((k, c) => (
            <Button key={k} id={wid(win, 'k.' + k)} label={k === 'sqrt' ? '√' : k} x={10 + c * (bw + 4)} y={74 + r * 30} w={bw} h={26} isDefault={k === '='} onClick={() => press(k)} />
          )),
        )}
      </div>
      {void FONT}
    </div>
  )
}

export default {
  id: 'calc',
  title: () => 'Calculator',
  taskbarLabel: () => 'Calculator',
  icon: null,
  size: { w: 270, h: 268 },
  position: { x: 380, y: 200 },
  explorer: false,
  chromeTop: chromeTop({ toolbar: false }),
  background: '#f6f9fe',
  Content: scoped(Calc, {}),
  usesActive: true, // Content draws differently when the window isn't active
}
