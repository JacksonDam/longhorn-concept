// my Programs & Services (start-menu-mockup.md): an explorer window with "program tasks" and
// category tiles with big glass icons, three programs each and "more..." (expands). Only programs
// this OS has; each entry launches it.  win.open { id: 'programs', app: 'programs' }
import { memo, useEffect, useReducer } from 'react'
import { emit } from '../../core/events.js'
import { scoped, wid, valueOf, hoverKeys, pt, DropMenu, dropBelow, ScrollView, C, FONT, HEAVY } from '../../ui/index.js'
import { Ico, xpName } from '../lib/icons.jsx'
import { SlabCanvas } from '../music/SlabCanvas.jsx'
import { xpSheetUrl } from '../../os/xp.jsx'
import { ICONS, COLS, PAD } from '../../os/xpSheet.js'
import { waitFor } from '../../core/preload.js'
import { openWin, openUrl, messageBox } from '../lib/common.js'
import { openMusic } from '../lib/fs.js'
import { useChromeCommands, chromeToggled } from '../lib/Explorer.jsx'

const P = (name, icon, go) => ({ name, icon, go })
export const CATEGORIES = [
  { key: 'accessories', label: 'Accessories', color: ['#e9f3ff', '#7fb2ec', '#2f62ad'], glyph: 'programs', items: [P('Calculator', 'calc', () => openWin('calc', 'calc')), P('Notepad', 'notepad', () => openWin('notepad', 'notepad')), P('Character Map', 'charmap', () => openWin('charmap', 'charmap')), P('Run...', 'run', () => openWin('run', 'run')), P('Search', 'search32', () => openWin('search', 'search'))] },
  { key: 'communications', label: 'Communications', color: ['#e9fbff', '#6cc6e8', '#1f7aa6'], glyph: 'mailbig', items: [P('Outlook', 'outlook', () => openWin('inbox', 'outlook')), P('Messenger', 'users', () => openWin('im:Hank', 'im', { buddy: 'Hank' })), P('Network Connections', 'network', () => openWin('cpl:network', 'applet', { applet: 'network' }))] },
  { key: 'entertainment', label: 'Entertainment', color: ['#f6eaff', '#b98ae8', '#6a3aa8'], glyph: 'music', items: [P('Winamp3', 'sound', () => openWin('winamp', 'winamp')), P('my Music', 'mymusic', () => openMusic()), P('Slide Show', 'slideshow', () => openWin('slideshow', 'slideshow', { auto: true }))] },
  { key: 'games', label: 'Games', color: ['#ecffe6', '#7ccf62', '#2e8a1f'], glyph: 'cards', items: [P('Solitaire', 'cards', () => openWin('solitaire', 'solitaire'))] },
  { key: 'imaging', label: 'Imaging', color: ['#fff4e2', '#f2b45a', '#b8700f'], glyph: 'picture', items: [P('Paint', 'paint', () => openWin('paint', 'paint')), P('my Pictures & Videos', 'mypics', () => openWin('pictures', 'pictures')), P('Create an Album', 'wmp-album', () => openWin('album', 'album'))] },
  { key: 'internet', label: 'Internet', color: ['#e9f3ff', '#5fa8ee', '#1d5cb0'], glyph: 'ie', items: [P('Internet Explorer', 'ie', () => openUrl('www.msn.com')), P('MSN', 'ie', () => openUrl('www.msn.com')), P('Windows Update', 'winupdate', () => openUrl('windowsupdate.microsoft.com'))] },
  { key: 'productivity', label: 'Productivity', color: ['#eef3ff', '#8ea6e0', '#3a52a0'], glyph: 'doc', items: [P('Word', 'word', () => openWin('doc1', 'word')), P('my Documents', 'mydocs', () => openWin('documents', 'documents')), P('Notepad', 'notepad', () => openWin('notepad', 'notepad'))] },
]

// A big glass tile icon (ref3 insp1.png): a pale blue glass slab turned towards the text, the
// category's icon on its face, its reflection on the floor below. Drawn by the shared slab
// renderer (gl/slab.js through my Music's SlabCanvas: one GL context for every slab, its targets
// shared) as a real 3D slab; a tile's image depends only on its category, so each canvas renders
// once and keeps its pixels (no GL work per frame).
const TILE = { w: 58, h: 58, d: 9 }
const BOX = { w: 92, h: 150, cx: 38, cy: 33 } // the canvas around the slab and its reflection
const FLOOR = BOX.cy + TILE.h / 2 + 4
const POSE = { x: BOX.cx, y: BOX.cy, ry: 0.55, rx: -0.12, rz: 0, s: 1 }
const MIRROR = { ...POSE, y: 2 * FLOOR - POSE.y, rx: -POSE.rx, sy: -1 }
const reflMask = `linear-gradient(180deg, transparent ${FLOOR - 2}px, #000 ${FLOOR + 4}px, transparent ${FLOOR + 40}px)`

// the face: glass gradient, a highlight across the top, the icon's 48 px design from the XP sheet
const FACE = 128
const faces = new Map() // glyph -> slab record
// (the sheet starts loading with the app module, so it is there by the time a window opens;
// capture waits for it)
const sheet = typeof document === 'undefined' ? null : new Image()
if (sheet) sheet.src = xpSheetUrl(48)
const sheetReady = sheet ? sheet.decode().catch(() => {}) : Promise.resolve()
waitFor(sheetReady)
function faceSlab(glyph) {
  let slab = faces.get(glyph)
  if (slab) return slab
  const c = document.createElement('canvas')
  c.width = c.height = FACE
  slab = { ...TILE, radius: 7, canvas: c, canvasVersion: 0, edgeColor: [0.78, 0.88, 1], edgeMix: 0.45, spec: 0.3, rim: 0.55, sat: 1, contrast: 1, brightness: 1, backFlip: false }
  faces.set(glyph, slab)
  const draw = () => {
    const g = c.getContext('2d')
    const bg = g.createLinearGradient(0, 0, FACE, FACE)
    bg.addColorStop(0, '#eef7ff')
    bg.addColorStop(0.45, '#b6d9fb')
    bg.addColorStop(1, '#7cb1ec')
    g.fillStyle = bg
    g.fillRect(0, 0, FACE, FACE)
    const hl = g.createLinearGradient(0, 0, 0, FACE * 0.42)
    hl.addColorStop(0, 'rgba(255,255,255,0.85)')
    hl.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = hl
    g.beginPath()
    g.ellipse(FACE / 2, 0, FACE * 0.62, FACE * 0.42, 0, 0, Math.PI)
    g.fill()
    const name = xpName(glyph)
    const i = name && ICONS[name]?.[48]
    if (i != null && sheet?.complete && sheet.naturalWidth) {
      const cell = 48 + 2 * PAD
      g.imageSmoothingQuality = 'high'
      g.drawImage(sheet, (i % COLS) * cell + PAD, Math.floor(i / COLS) * cell + PAD, 48, 48, FACE * 0.18, FACE * 0.18, FACE * 0.64, FACE * 0.64)
    }
    slab.canvasVersion++
  }
  draw()
  // (a window opened before the sheet decoded draws the icon on once it has)
  if (!(sheet?.complete && sheet.naturalWidth)) sheetReady.then(draw)
  return slab
}

const GlassIcon = memo(function GlassIcon({ glyph }) {
  const slab = faceSlab(glyph)
  const v = slab.canvasVersion
  const [, redraw] = useReducer((n) => n + 1, 0)
  useEffect(() => {
    let live = true
    sheetReady.then(() => live && slab.canvasVersion !== v && redraw())
    return () => (live = false)
  }, [slab, v])
  return (
    <div style={{ position: 'relative', width: 58, height: 58 }}>
      <SlabCanvas t={0} width={BOX.w} height={BOX.h} items={[{ slab, pose: () => MIRROR }]} P={700} style={{ left: -10, top: -4, opacity: 0.2, WebkitMaskImage: reflMask, maskImage: reflMask }} />
      <SlabCanvas t={0} width={BOX.w} height={BOX.h} items={[{ slab, pose: () => POSE }]} P={700} style={{ left: -10, top: -4 }} />
    </div>
  )
})

function Tile({ win, t, cat, open }) {
  const lit = hoverKeys(t, wid(win, 'pi'))
  const shown = open ? cat.items : cat.items.slice(0, 3)
  return (
    <div style={{ position: 'relative', width: 268, minHeight: 104 }}>
      <div style={{ position: 'absolute', left: 0, top: 4 }}>
        <div onPointerDown={(e) => e.button === 0 && (cat.items.length > 3 ? emit('ui.value', { id: wid(win, 'more:' + cat.key), value: !open }) : cat.items[0].go())}>
          <GlassIcon glyph={cat.glyph} />
        </div>
      </div>
      <div onPointerDown={(e) => e.button === 0 && (cat.items.length > 3 ? emit('ui.value', { id: wid(win, 'more:' + cat.key), value: !open }) : cat.items[0].go())} style={{ position: 'absolute', left: 72, top: 0, fontFamily: HEAVY, fontSize: 13.5, color: '#2c6cc4', whiteSpace: 'nowrap' }}>{cat.label}</div>
      {shown.map((it, i) => {
        const k = cat.key + ':' + i
        const l = lit.get(k) || 0
        return (
          <div
            key={k}
            style={{ position: 'absolute', left: 68, top: 19 + i * 16, height: 15, padding: '0 4px', borderRadius: 3, display: 'flex', gap: 5, alignItems: 'center', background: l > 0.5 ? C.rowHover : 'transparent', fontFamily: FONT, fontSize: 11, color: l > 0.5 ? C.link : '#7b7d84', whiteSpace: 'nowrap' }}
            onPointerEnter={(e) => emit('hover', { id: wid(win, 'pi'), key: k, on: true, ...pt(e) })}
            onPointerLeave={() => emit('hover', { id: wid(win, 'pi'), key: k, on: false })}
            onPointerDown={(e) => e.button === 0 && it.go()}
          >
            {it.name}
          </div>
        )
      })}
      {cat.items.length > 3 && (
        <div style={{ position: 'absolute', left: 72, top: 22 + shown.length * 16, fontFamily: FONT, fontSize: 10.5, color: '#8b8d94' }} onPointerDown={(e) => e.button === 0 && emit('ui.value', { id: wid(win, 'more:' + cat.key), value: !open })}>
          {open ? 'less...' : 'more...'}
        </div>
      )}
    </div>
  )
}

const TaskPane = memo(function TaskPane({ fold, onFold }) {
  const link = (k, label, icon, fn, y) => (
    <div key={k} style={{ position: 'absolute', left: 14, top: y, display: 'flex', gap: 6, alignItems: 'center', fontFamily: FONT, fontSize: 11, color: C.textDark, whiteSpace: 'nowrap' }} onPointerDown={(e) => e.button === 0 && fn()}>
      <Ico kind={icon} size={16} />
      {label}
    </div>
  )
  // headings fold their groups
  const head = (k, a, b, y) => (
    <div key={k} style={{ position: 'absolute', left: 14, top: y, width: 170, fontFamily: FONT, fontSize: 17.5, fontWeight: 300, color: C.headingLight }} onPointerDown={(e) => e.button === 0 && onFold(k)}>
      {a} <span style={{ fontWeight: 500, color: C.heading }}>{b}</span>
      <svg width="9" height="6" style={{ position: 'absolute', right: 4, top: 9 }}>
        <path d={fold[k] ? 'M0 0 L9 0 L4.5 6 Z' : 'M0 6 L9 6 L4.5 0 Z'} fill="#8ebbe9" />
      </svg>
    </div>
  )
  let y = 14
  const out = [head('pt', 'program', 'tasks', y)]
  y += 30
  if (!fold.pt) {
    out.push(link('add', 'Add new programs', 'programs', () => messageBox({ title: 'Add New Programs', icon: 'info', text: 'There are no new programs available to add from your network or from a CD.\nInsert a program CD into the DVD-RW Drive (D:) to install from it.' }), y))
    out.push(link('cfg', 'Configure a program', 'display', () => openWin('control', 'control'), y + 20))
    out.push(link('rm', 'Remove a program', 'addremove', () => openWin('cpl:programs', 'applet', { applet: 'programs' }), y + 40))
    out.push(link('upd', 'Search for updates', 'winupdate', () => openUrl('windowsupdate.microsoft.com'), y + 60))
    y += 82
  }
  y += 20
  out.push(head('op', 'other', 'places', y))
  y += 30
  if (!fold.op) {
    out.push(link('docs', 'my Documents', 'mydocs', () => openWin('documents', 'documents'), y))
    out.push(link('pc', 'my Computer', 'computer', () => openWin('computer', 'computer'), y + 20))
    out.push(link('cp', 'Control Panel', 'control', () => openWin('control', 'control'), y + 40))
  }
  return out
})

const sel2 = (a, b) => (
  <>
    <span style={{ fontWeight: 500, color: '#6d8db8' }}>{a} </span>
    <span style={{ color: '#8cb8ee' }}>{b}</span>
  </>
)

function programMenus(win, t) {
  const group = valueOf(t, wid(win, 'group'), 'category')
  const order = valueOf(t, wid(win, 'order'), 'alpha')
  const groupItems = [
    { label: 'By Category', radio: group === 'category', onClick: () => emit('ui.value', { id: wid(win, 'group'), value: 'category' }) },
    { label: 'All Programs', radio: group === 'all', onClick: () => emit('ui.value', { id: wid(win, 'group'), value: 'all' }) },
  ]
  const orderItems = [
    { label: 'Alphabetically', radio: order === 'alpha', onClick: () => emit('ui.value', { id: wid(win, 'order'), value: 'alpha' }) },
    { label: 'Default Order', radio: order === 'default', onClick: () => emit('ui.value', { id: wid(win, 'order'), value: 'default' }) },
  ]
  return {
    File: [{ label: 'Close', onClick: () => emit('win.close', { id: win.id }) }],
    Edit: [{ label: 'Select All', disabled: true }],
    View: [...groupItems, '-', ...orderItems],
    Help: [{ label: 'Help and Support Center', onClick: () => openWin('help', 'help') }],
    Favorites: [{ label: 'MSN.com', onClick: () => openUrl('www.msn.com') }],
  }
}

function Programs({ win, t, w, h, live }) {
  useChromeCommands(win, t, live, {
    up: () => openWin('computer', 'computer'),
    find: () => openWin('search', 'search'),
    folders: () => openWin('documents', 'documents'),
  })
  const hide = chromeToggled(t, win, 'hide')
  const group = valueOf(t, wid(win, 'group'), 'category')
  const order = valueOf(t, wid(win, 'order'), 'alpha')
  const groupItems = [
    { label: 'By Category', radio: group === 'category', onClick: () => emit('ui.value', { id: wid(win, 'group'), value: 'category' }) },
    { label: 'All Programs', radio: group === 'all', onClick: () => emit('ui.value', { id: wid(win, 'group'), value: 'all' }) },
  ]
  const orderItems = [
    { label: 'Alphabetically', radio: order === 'alpha', onClick: () => emit('ui.value', { id: wid(win, 'order'), value: 'alpha' }) },
    { label: 'Default Order', radio: order === 'default', onClick: () => emit('ui.value', { id: wid(win, 'order'), value: 'default' }) },
  ]
  const sortIt = (list) => (order === 'alpha' ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list)
  let cats = order === 'alpha' ? [...CATEGORIES].sort((a, b) => a.label.localeCompare(b.label)) : CATEGORIES
  if (group === 'all') {
    const seen = new Set()
    const items = sortIt(CATEGORIES.flatMap((c) => c.items).filter((it) => !seen.has(it.name) && seen.add(it.name)))
    cats = [{ key: 'all', label: 'All Programs', color: ['#eef3ff', '#7fb2ec', '#2f62ad'], glyph: 'programs', items }]
  } else cats = cats.map((c) => ({ ...c, items: sortIt(c.items) }))
  let y = 0
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      {!hide && <TaskPane fold={{ pt: valueOf(t, wid(win, 'fold:pt'), false), op: valueOf(t, wid(win, 'fold:op'), false) }} onFold={(k) => emit('ui.value', { id: wid(win, 'fold:' + k), value: !valueOf(t, wid(win, 'fold:' + k), false) })} />}
      <div style={{ position: 'absolute', left: 200, top: 10, height: 16, display: 'flex', gap: 0, fontFamily: FONT, fontSize: 11.5, whiteSpace: 'nowrap' }}>
        <span style={{ paddingRight: 30 }} onPointerDown={(e) => e.button === 0 && dropBelow(wid(win, 'dd.g'), e.currentTarget, groupItems)}>
          {sel2('Group programs', group === 'all' ? 'all together' : 'by category')} {'▾'}
        </span>
        <span onPointerDown={(e) => e.button === 0 && dropBelow(wid(win, 'dd.o'), e.currentTarget, orderItems)}>
          {sel2('Arrange', order === 'alpha' ? 'alphabetically' : 'by default')} {'▾'}
        </span>
      </div>
      <DropMenu id={wid(win, 'dd.g')} items={groupItems} />
      <DropMenu id={wid(win, 'dd.o')} items={orderItems} />
      <div style={{ position: 'absolute', left: 192, top: 32, width: w - 200, height: h - 38, borderRadius: 6, background: 'linear-gradient(180deg, #ffffff 0, #ffffff 60%, #eef4fc 100%)', boxShadow: 'inset 0 0 0 1px #c9daf0' }} />
      <ScrollView id={wid(win, 'sv')} x={196} y={36} w={w - 204} h={h - 44}>
        <div style={{ position: 'relative', height: Math.ceil(cats.length / 2) * 118 + 10 }}>
          {cats.map((c, i) => {
            const open = group === 'all' || valueOf(t, wid(win, 'more:' + c.key), false)
            const node = (
              <div key={c.key} style={{ position: 'absolute', left: (i % 2) * 280 + 6, top: Math.floor(i / 2) * 118 + 6 }}>
                <Tile win={win} t={t} cat={c} open={open} />
              </div>
            )
            void y
            return node
          })}
        </div>
      </ScrollView>
    </div>
  )
}

export default {
  id: 'programs',
  title: () => 'my Programs & Services',
  taskbarLabel: () => 'My Programs & Services',
  icon: null,
  size: { w: 777, h: 600 },
  position: { x: 60, y: 40 },
  minSize: { w: 700, h: 460 },
  explorer: {
    crumbs: ['my Computer', 'my Programs & Services'],
    search: 'search for…',
    commands: [
      { id: 'hide', label: 'Hide Program Tasks', icon: 'hide' },
      { id: 'up', label: 'Up a Folder', icon: 'up' },
      { id: 'folders', label: 'Folders', icon: 'folders' },
      { id: 'find', label: 'Find', icon: 'find' },
    ],
    pressed: () => null,
    menus: (win, t) => programMenus(win, t),
  },
  Content: scoped(Programs, {}),
}
