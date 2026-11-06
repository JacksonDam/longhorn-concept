// Paint: draw with a pencil, brush or eraser in a palette of colours. Strokes are logged
// ('paint.begin' { id, tool, color, size }, 'paint.pt' { id, x, y }, 'paint.end' { id },
// 'paint.undo' { id }, 'paint.clear' { id }) and redrawn onto a canvas from the log.
import { memo, useLayoutEffect, useRef } from 'react'
import { emit } from '../../core/events.js'
import { scoped, wid, valueOf, find, pt, stageRect, ToolButton, Tooltip, DropMenu, dropBelow, C } from '../../ui/index.js'
import { AppTop, appTopHeight, StatusBar, chromeTop } from '../lib/chrome.jsx'
import { closeWin, messageBox, openWin } from '../lib/common.js'
import { XpIcon } from '../../os/xp.jsx'

const COLORS = ['#000000', '#808080', '#c0272d', '#e67e22', '#f5c542', '#4dbb3a', '#2e7d32', '#38b6d8', '#2c6cc4', '#1f3f7a', '#8e44ad', '#d85fa4', '#8a5a2b', '#ffffff']
const TOOLS = [
  ['pencil', 'Pencil', 1],
  ['brush', 'Brush', 5],
  ['big', 'Big Brush', 12],
  ['eraser', 'Eraser', 14],
]
const SCALE = 2 // canvas pixels per stage pixel

// strokes of this window up to t: [{ tool, color, size, pts }]
function strokesAt(t, win) {
  const evs = []
  for (const type of ['paint.begin', 'paint.pt', 'paint.end', 'paint.undo', 'paint.clear']) {
    const [a, i] = find(t, type, win.id)
    for (let j = 0; j <= i; j++) if (a[j].t >= win.openedAt) evs.push(a[j])
  }
  evs.sort((p, q) => p.t - q.t)
  let strokes = []
  let cur = null
  for (const e of evs) {
    if (e.type === 'paint.begin') {
      cur = { tool: e.tool, color: e.color, size: e.size, pts: [] }
      strokes.push(cur)
    } else if (e.type === 'paint.pt' && cur) cur.pts.push([e.x, e.y])
    else if (e.type === 'paint.end') cur = null
    else if (e.type === 'paint.undo') strokes = strokes.slice(0, -1)
    else if (e.type === 'paint.clear') strokes = []
  }
  return strokes
}

const Canvas = memo(function Canvas({ w, h, strokes, version }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const c = ref.current
    const g = c.getContext('2d')
    g.setTransform(SCALE, 0, 0, SCALE, 0, 0)
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, w, h)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    for (const s of strokes) {
      g.strokeStyle = s.tool === 'eraser' ? '#ffffff' : s.color
      g.lineWidth = s.size
      g.beginPath()
      s.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
      if (s.pts.length === 1) g.lineTo(s.pts[0][0] + 0.01, s.pts[0][1])
      g.stroke()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, version])
  return <canvas ref={ref} width={w * SCALE} height={h * SCALE} style={{ width: w, height: h, display: 'block' }} />
})

function Paint({ win, t, w, h, live }) {
  const id = (n) => wid(win, n)
  const tool = valueOf(t, id('tool'), 'brush')
  const color = valueOf(t, id('color'), '#2c6cc4')
  const strokes = strokesAt(t, win)
  const drawing = useRef(null)
  const top = appTopHeight({ toolbar: false })
  const cw = w - 70
  const ch = h - top - 70
  const size = TOOLS.find((x) => x[0] === tool)?.[2] ?? 5
  const NAMES = ['Black', 'Gray', 'Red', 'Orange', 'Yellow', 'Green', 'Dark Green', 'Teal', 'Blue', 'Navy', 'Purple', 'Pink', 'Brown', 'White']
  const colorItems = COLORS.map((c, i) => ({ label: NAMES[i], radio: c === color, icon: <div style={{ width: 12, height: 12, margin: 2, background: c, boxShadow: '0 0 0 1px #8a9bb8' }} />, onClick: () => emit('ui.value', { id: id('color'), value: c }) }))
  const menus = [
    { key: 'file', label: 'File', items: [{ label: 'New', onClick: () => emit('paint.clear', { id: win.id }) }, { label: 'Save', onClick: () => messageBox({ title: 'Paint', icon: 'info', text: 'The picture was saved as untitled.bmp in my Pictures.' }) }, '-', { label: 'Exit', onClick: () => closeWin(win.id) }] },
    { key: 'edit', label: 'Edit', items: [{ label: 'Undo', shortcut: 'Ctrl+Z', disabled: !strokes.length, onClick: () => emit('paint.undo', { id: win.id }) }] },
    { key: 'image', label: 'Image', items: [{ label: 'Clear Image', onClick: () => emit('paint.clear', { id: win.id }) }] },
    { key: 'help', label: 'Help', items: [{ label: 'About Paint', onClick: () => messageBox({ title: 'About Paint', icon: 'info', text: 'Microsoft® Paint\nVersion 5.1\nCopyright © 1981-2003 Microsoft Corporation' }) }] },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#9fb1cc' }}>
      <AppTop id={id('m')} w={w} menus={menus} />
      {/* tool box */}
      <div style={{ position: 'absolute', left: 6, top: top + 8, width: 52, height: 4 * 30 + 8, borderRadius: 6, background: C.body, boxShadow: `inset 0 0 0 1px ${C.border}` }} />
      {TOOLS.map(([k, label], i) => (
        <span key={k}>
          <ToolButton id={id('t.' + k)} x={12} y={top + 12 + i * 30} w={40} h={26} icon={<XpIcon name={TOOL_ICON[k]} size={16} crisp />} iconSize={16} active={tool === k} onClick={() => emit('ui.value', { id: id('tool'), value: k })} />
          <Tooltip forId={id('t.' + k)} text={label} />
        </span>
      ))}
      <div
        style={{ position: 'absolute', left: 62, top: top + 8, width: cw, height: ch, boxShadow: '2px 3px 6px rgba(20,40,80,0.35), 0 0 0 1px #7f93b3', background: '#fff' }}
        onPointerDown={(e) => {
          if (e.button !== 0 || !live) return
          const r = stageRect(e.currentTarget)
          const q = pt(e)
          drawing.current = r
          e.currentTarget.setPointerCapture(e.pointerId)
          emit('paint.begin', { id: win.id, tool, color, size })
          emit('paint.pt', { id: win.id, x: Math.round((q.x - r.x) * 2) / 2, y: Math.round((q.y - r.y) * 2) / 2 })
        }}
        onPointerMove={(e) => {
          const r = drawing.current
          if (!r) return
          const q = pt(e)
          emit('paint.pt', { id: win.id, x: Math.round((q.x - r.x) * 2) / 2, y: Math.round((q.y - r.y) * 2) / 2 })
        }}
        onPointerUp={() => {
          if (!drawing.current) return
          drawing.current = null
          emit('paint.end', { id: win.id })
        }}
      >
        <Canvas w={cw} h={ch} strokes={strokes} version={strokes.length + ':' + strokes.reduce((n, s) => n + s.pts.length, 0)} />
      </div>
      {/* palette */}
      <div onPointerDown={(e) => e.button === 0 && dropBelow(id('dd.color'), e.currentTarget, colorItems)} style={{ position: 'absolute', left: 62, top: h - 54, width: 30, height: 30, borderRadius: 4, background: color, boxShadow: '0 0 0 1px #4d5a70, inset 0 0 0 2px #fff' }} />
      <DropMenu id={id('dd.color')} items={colorItems} />
      {COLORS.map((c, i) => (
        <div key={c} style={{ position: 'absolute', left: 100 + (i % 7) * 18, top: h - 56 + Math.floor(i / 7) * 17, width: 15, height: 14, background: c, borderRadius: 2, boxShadow: c === color ? '0 0 0 2px #fff, 0 0 0 3px #2c6cc4' : '0 0 0 1px #4d5a70' }} onPointerDown={(e) => e.button === 0 && emit('ui.value', { id: id('color'), value: c })} />
      ))}
      <StatusBar y={h - 20} w={w} left={<span onPointerDown={(e) => e.button === 0 && !strokes.length && openWin('help', 'help')}>{strokes.length ? `${strokes.length} stroke${strokes.length > 1 ? 's' : ''}` : 'For Help, click Help Topics on the Help Menu.'}</span>} />
    </div>
  )
}

// XP mspaint.exe's tool box art (16 px, 16 colours), drawn crisp at its own size; XP has one Brush
// tool (its size is an option), so Brush and Big Brush share its icon
const TOOL_ICON = { pencil: 'pt-pencil', brush: 'pt-brush', big: 'pt-brush', eraser: 'pt-eraser' }

export default {
  id: 'paint',
  title: () => 'untitled - Paint',
  taskbarLabel: () => 'untitled - Paint',
  icon: null,
  size: { w: 640, h: 480 },
  position: { x: 150, y: 70 },
  minSize: { w: 420, h: 320 },
  explorer: false,
  chromeTop: chromeTop({ toolbar: false }),
  background: '#9fb1cc',
  Content: scoped(Paint, { watch: ['paint'] }),
}
