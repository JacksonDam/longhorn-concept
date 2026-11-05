// Solitaire: a Klondike-style patience game with original card art. The deal comes from a seed
// and every move is logged ('sol.new' { id, seed }, 'sol.draw' { id }, 'sol.move' { id, from,
// index, to }), so the table is replayed from the log. Click a card, then where it should go;
// double-click a card to send it to the foundations; click the stock to turn a card.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, valueOf, find, Button, C, FONT, HEAVY } from '../../ui/index.js'
import { AppTop, appTopHeight, StatusBar } from '../lib/chrome.jsx'
import { closeWin, messageBox, openWin } from '../lib/common.js'

const SUITS = ['♠', '♥', '♦', '♣'] // spades hearts diamonds clubs
const RED = new Set([1, 2])
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const CW = 60
const CH = 84
const GAP = 16

function deal(seed) {
  let s = (seed * 2654435761) >>> 0 || 7
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  const deck = []
  for (let su = 0; su < 4; su++) for (let rk = 0; rk < 13; rk++) deck.push({ su, rk, up: false })
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  const piles = { stock: [], waste: [], f0: [], f1: [], f2: [], f3: [] }
  let k = 0
  for (let i = 0; i < 7; i++) {
    piles['t' + i] = deck.slice(k, k + i + 1).map((c, j) => ({ ...c, up: j === i }))
    k += i + 1
  }
  piles.stock = deck.slice(k)
  return piles
}

const top = (p) => p[p.length - 1]
export function canMove(piles, from, index, to) {
  const src = piles[from]
  if (!src || index < 0 || index >= src.length || !src[index].up) return false
  const moving = src.slice(index)
  const c = moving[0]
  const dst = piles[to]
  if (!dst || from === to) return false
  if (to.startsWith('f')) {
    if (moving.length !== 1) return false
    const tc = top(dst)
    return tc ? tc.su === c.su && tc.rk === c.rk - 1 : c.rk === 0
  }
  if (to.startsWith('t')) {
    const tc = top(dst)
    if (!tc) return c.rk === 12
    return tc.up && RED.has(tc.su) !== RED.has(c.su) && tc.rk === c.rk + 1
  }
  return false
}

// the table from the log
function tableAt(t, win) {
  const evs = []
  for (const type of ['sol.new', 'sol.draw', 'sol.move']) {
    const [a, i] = find(t, type, win.id)
    for (let j = 0; j <= i; j++) if (a[j].t >= win.openedAt) evs.push(a[j])
  }
  evs.sort((p, q) => p.t - q.t)
  let seed = Math.round(win.openedAt * 1000) % 100000
  let piles = deal(seed)
  let moves = 0
  for (const e of evs) {
    if (e.type === 'sol.new') {
      seed = e.seed
      piles = deal(seed)
      moves = 0
    } else if (e.type === 'sol.draw') {
      piles = { ...piles }
      if (piles.stock.length) {
        piles.waste = [...piles.waste, { ...top(piles.stock), up: true }]
        piles.stock = piles.stock.slice(0, -1)
      } else {
        piles.stock = piles.waste.map((c) => ({ ...c, up: false })).reverse()
        piles.waste = []
      }
      moves++
    } else if (e.type === 'sol.move' && canMove(piles, e.from, e.index, e.to)) {
      piles = { ...piles }
      const moving = piles[e.from].slice(e.index)
      piles[e.from] = piles[e.from].slice(0, e.index)
      piles[e.to] = [...piles[e.to], ...moving]
      // turn the newly exposed tableau card
      const src = piles[e.from]
      if (e.from.startsWith('t') && src.length && !top(src).up) piles[e.from] = [...src.slice(0, -1), { ...top(src), up: true }]
      moves++
    }
  }
  const won = ['f0', 'f1', 'f2', 'f3'].every((f) => piles[f].length === 13)
  return { piles, moves, won, seed }
}

const Card = memo(function Card({ c, sel }) {
  if (!c.up)
    return (
      <div style={{ width: CW, height: CH, borderRadius: 6, background: 'linear-gradient(150deg, #6eb0fa 0, #3f78c4 50%, #2a5aa6 100%)', boxShadow: 'inset 0 0 0 1px #fff, inset 0 0 0 4px #4f8ad9, inset 0 0 0 5px rgba(255,255,255,0.6), 0 1px 2px rgba(10,30,70,0.4)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 8, borderRadius: 3, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 3px, rgba(255,255,255,0) 3px 7px)' }} />
      </div>
    )
  const col = RED.has(c.su) ? '#c8321e' : '#1d2a44'
  return (
    <div style={{ position: 'relative', width: CW, height: CH, borderRadius: 6, background: sel ? '#dff0ff' : 'linear-gradient(180deg, #ffffff, #f2f5fa)', boxShadow: sel ? '0 0 0 2px #3d7bd9, 0 2px 4px rgba(10,30,70,0.4)' : 'inset 0 0 0 1px #9aa7bd, 0 1px 2px rgba(10,30,70,0.35)', color: col }}>
      <div style={{ position: 'absolute', left: 5, top: 3, fontFamily: HEAVY, fontSize: 13, lineHeight: '14px', textAlign: 'center' }}>
        {RANKS[c.rk]}
        <div style={{ fontSize: 12 }}>{SUITS[c.su]}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 26, textAlign: 'center', fontSize: c.rk >= 10 ? 26 : 30, lineHeight: '34px', fontFamily: c.rk >= 10 ? HEAVY : 'Georgia, serif' }}>{c.rk >= 10 ? RANKS[c.rk] : SUITS[c.su]}</div>
      <div style={{ position: 'absolute', right: 5, bottom: 3, fontFamily: HEAVY, fontSize: 13, lineHeight: '14px', textAlign: 'center', transform: 'rotate(180deg)' }}>
        {RANKS[c.rk]}
        <div style={{ fontSize: 12 }}>{SUITS[c.su]}</div>
      </div>
    </div>
  )
})
const Slot = memo(function Slot({ label }) {
  return <div style={{ width: CW, height: CH, borderRadius: 6, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.08)', textAlign: 'center', lineHeight: `${CH}px`, fontSize: 26, color: 'rgba(255,255,255,0.35)' }}>{label}</div>
})

function Solitaire({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const { piles, moves, won, seed } = tableAt(t, win)
  const sel = valueOf(t, id('sel'), null)
  const setSel = (v) => emit('ui.value', { id: id('sel'), value: v })
  const curTable = () => tableAt(now(), win).piles
  const top0 = appTopHeight({ toolbar: false })
  const x0 = (i) => 14 + i * (CW + GAP)
  const yTop = top0 + 12
  const yTab = yTop + CH + 18
  const clickPile = (pile, index) => {
    const ps = curTable()
    const s = valueOf(now(), id('sel'), null)
    if (s && canMove(ps, s.pile, s.index, pile)) {
      emit('sol.move', { id: win.id, from: s.pile, index: s.index, to: pile })
      return setSel(null)
    }
    const p = ps[pile]
    if (index != null && p[index]?.up && (pile.startsWith('t') || index === p.length - 1)) setSel(s && s.pile === pile && s.index === index ? null : { pile, index })
    else setSel(null)
  }
  const auto = (pile) => {
    const ps = curTable()
    const i = ps[pile].length - 1
    for (const f of ['f0', 'f1', 'f2', 'f3'])
      if (canMove(ps, pile, i, f)) {
        emit('sol.move', { id: win.id, from: pile, index: i, to: f })
        setSel(null)
        return
      }
  }
  const newGame = () => {
    emit('sol.new', { id: win.id, seed: Math.round(now() * 1000) % 100000 })
    setSel(null)
  }
  const howTo = () => messageBox({ title: 'Solitaire', icon: 'info', heading: 'how to play', text: 'Build the four foundations up by suit from Ace to King. On the table, stack cards down in alternating colours. Only a King may fill an empty column.\n\nClick a card, then where to put it. Double-click a card to send it to a foundation. Click the stock to turn a card.' })
  const menus = [
    { key: 'game', label: 'Game', items: [{ label: 'Deal', shortcut: 'F2', onClick: newGame }, '-', { label: 'Exit', onClick: () => closeWin(win.id) }] },
    { key: 'help', label: 'Help', items: [{ label: 'How to Play', onClick: () => messageBox({ title: 'Solitaire', icon: 'info', heading: 'how to play', text: 'Build the four foundations up by suit from Ace to King. On the table, stack cards down in alternating colours. Only a King may fill an empty column.\n\nClick a card, then where to put it. Double-click a card to send it to a foundation. Click the stock to turn a card.' }) }, { label: 'Help and Support', onClick: () => openWin('help', 'help') }] },
  ]
  const cardAt = (pile, c, i, x, y) => (
    <div
      key={pile + i}
      style={{ position: 'absolute', left: x, top: y }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.stopPropagation()
        clickPile(pile, i)
      }}
      onDoubleClick={() => auto(pile)}
    >
      <Card c={c} sel={!!sel && sel.pile === pile && i >= sel.index} />
    </div>
  )
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, #3e8a4a 0, #2a6b36 60%, #1f5229 100%)' }}>
      <AppTop id={id('m')} w={w} menus={menus} />
      {/* stock */}
      <div style={{ position: 'absolute', left: x0(0), top: yTop }} onPointerDown={(e) => e.button === 0 && (emit('sol.draw', { id: win.id }), setSel(null))}>
        {piles.stock.length ? <Card c={{ up: false }} /> : <Slot label={'↻'} />}
      </div>
      {/* waste */}
      <div style={{ position: 'absolute', left: x0(1), top: yTop }} onPointerDown={(e) => e.button === 0 && (emit('sol.draw', { id: win.id }), setSel(null))}>{!piles.waste.length && <Slot label="" />}</div>
      {piles.waste.length > 0 && cardAt('waste', top(piles.waste), piles.waste.length - 1, x0(1), yTop)}
      {/* foundations */}
      {['f0', 'f1', 'f2', 'f3'].map((f, i) => (
        <div key={f}>
          <div style={{ position: 'absolute', left: x0(3 + i), top: yTop }} onPointerDown={(e) => e.button === 0 && clickPile(f, null)}>
            <Slot label="A" />
          </div>
          {piles[f].length > 0 && cardAt(f, top(piles[f]), piles[f].length - 1, x0(3 + i), yTop)}
        </div>
      ))}
      {/* tableau */}
      {Array.from({ length: 7 }, (_, i) => {
        const p = piles['t' + i]
        let y = yTab
        return (
          <div key={i}>
            <div style={{ position: 'absolute', left: x0(i), top: yTab }} onPointerDown={(e) => e.button === 0 && clickPile('t' + i, null)}>
              <Slot label="" />
            </div>
            {p.map((c, j) => {
              const node = cardAt('t' + i, c, j, x0(i), y)
              y += c.up ? 20 : 7
              return node
            })}
          </div>
        )
      })}
      {won && (
        <div style={{ position: 'absolute', left: w / 2 - 150, top: h / 2 - 50, width: 300, height: 100, borderRadius: 10, background: 'rgba(255,255,255,0.92)', boxShadow: '0 4px 14px rgba(0,30,0,0.5)', textAlign: 'center' }}>
          <div style={{ fontFamily: FONT, fontSize: 22, color: C.heading, marginTop: 16 }}>You win!</div>
          <Button id={id('again')} label="Deal Again" isDefault x={100} y={56} w={100} h={24} onClick={newGame} />
        </div>
      )}
      <StatusBar y={h - 20} w={w} left={<span onPointerDown={(e) => e.button === 0 && howTo()}>Moves: {moves}</span>} right={<span onPointerDown={(e) => e.button === 0 && newGame()}>Game #{seed}</span>} />
    </div>
  )
}

export default {
  id: 'solitaire',
  title: () => 'Solitaire',
  taskbarLabel: () => 'Solitaire',
  icon: null,
  size: { w: 560, h: 500 },
  position: { x: 160, y: 60 },
  minSize: { w: 560, h: 420 },
  explorer: false,
  background: '#2a6b36',
  Content: scoped(Solitaire, { watch: ['sol'] }),
}
