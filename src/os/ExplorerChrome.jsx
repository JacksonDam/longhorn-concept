// The explorer-window chrome of the Plex window (from the video's my Music window): the glass
// toolbar (back/forward, Home, Search, link buttons, Favorites; the title and window buttons are
// drawn on it by PlexWindow), the menu row with the breadcrumb address bar, and the command row.
// Window-local px; EXPLORER_TOP is where the client area starts.
//
// App config (`explorer` in the app registry; every field optional, defaults = my Music):
//   { crumbs: ['my Computer', 'my Pictures'] | (win, t) => [...],
//     search: 'search my for...' | (win, t) => string,
//     commands: [{ id, label, icon: 'hide' | 'up' | 'folders' | 'find' | 'preview' | <component> }],
//     pressed: 'preview' | ['a', 'b'] | (win, t) => command id(s) shown pressed,
//     menus: { File: items, Edit: items, View: items, Help: items } | (win, t) => {...}  (ui kit items),
//     crumbMenus: [items for crumb 0, items for crumb 1] | (win, t) => [...],
//     Search: ({ win, t, copy }) => node   (replaces the search field text, window-local px;
//             copy: drawn in a motion-blur copy, no input handling needed) }
//   A command may carry onClick(win) (called on click, besides the event).
// Clicks emit events the app or the shell handles:
//   'explorer.command' { id: <window id>, command }   command row
//   'explorer.menu'    { id, menu: 'File' | 'Edit' | 'View' | 'Help', x, y }
//   'explorer.crumb'   { id, index, x, y }
//   'explorer.nav'     { id, dir: 'back' | 'forward' }
// Web links open Internet Explorer on its offline page (the brief's rule), Home opens MSN in IE,
// Search opens the Search window, Favorites drops the Favorites list ('explorer.menu' Favorites).
import { memo } from 'react'
import { emit } from '../core/events.js'
import { DropMenu, dropBelow, wid } from '../ui/index.js'
import { Txt, Texts, abs, HEAVY } from './text.jsx'
import * as I from './icons.jsx'

export const EXPLORER_TOP = 123

const W0 = 777 // the gradients were measured on the 777 px my Music window: stops scale with the width
const toolbarStops = [['#4985d7', 0], ['#4f8bdd', 40], ['#5793e2', 120], ['#5fa1ed', 200], ['#6eb0fa', 285], ['#6ab0f8', 330], ['#68aaf8', 360], ['#66a8f4', 440], ['#5fa2ee', 500], ['#5a9ce9', 560], ['#558fe2', 640], ['#4e84d7', 700], ['#4a86d8', 777]]
const bandStops = [['#326ab4', 0], ['#356eba', 85], ['#3b73bd', 125], ['#427dc4', 165], ['#508bd2', 245], ['#5994d4', 285], ['#5a9ade', 325], ['#5c9ce0', 365], ['#5c9ad9', 405], ['#5a9ad8', 445], ['#5190d6', 485], ['#518cd1', 525], ['#4984cb', 565], ['#437ec3', 605], ['#3974bd', 645], ['#386ebb', 685], ['#326ab6', 725], ['#336bb5', 777]]
const grad = (stops, w) => `linear-gradient(90deg, ${stops.map(([c, x]) => `${c} ${w === W0 ? x + 'px' : ((x / W0) * 100).toFixed(2) + '%'}`).join(', ')})`

const label = { size: 11, w: 400, f: HEAVY, sx: 1, c: '#e4f4ff', style: { filter: 'drop-shadow(0 0 1.2px rgba(10,50,120,0.75))' } }

const ie = (url) => () => emit('win.open', { id: 'ie', app: 'ie', props: { url } })

// the toolbar's link buttons (icon box, label x); Favorites only on windows at least 760 px wide
const TOOLS = [
  { ix: 90, iy: 22, iw: 34, ih: 36, tx: 133, text: 'Home', Icon: I.HomeIcon, onClick: ie('www.msn.com') },
  { ix: 149, iy: 29, iw: 50, ih: 26, tx: 209, text: 'Search', Icon: I.SearchIcon, onClick: () => emit('win.open', { id: 'search', app: 'search' }) },
  { ix: 255, iy: 27, iw: 28, ih: 32, tx: 291, text: 'ofoto.com', Icon: () => <I.PageIcon kind="ofoto" />, onClick: ie('www.ofoto.com') },
  { ix: 356, iy: 26, iw: 26, ih: 30, tx: 387, text: 'my music', Icon: I.NotesIcon, onClick: () => emit('win.open', { id: 'music', app: 'music' }) },
  { ix: 444, iy: 26, iw: 28, ih: 32, tx: 482, text: 'yahoo.com', Icon: () => <I.PageIcon kind="yahoo" />, onClick: ie('www.yahoo.com') },
  { ix: 553, iy: 26, iw: 28, ih: 32, tx: 593, text: 'google.com', Icon: () => <I.PageIcon kind="google" />, onClick: ie('www.google.com') },
  { ix: 659, iy: 25, iw: 30, ih: 30, tx: 695, text: 'Favorites', Icon: I.StarIcon, fav: true },
]
const BF = { x: 10, y: 19 }
const toolsFor = (w) => TOOLS.filter((it) => !it.fav || w >= 760)

// The toolbar's icons (back / forward and the link icons with their reflections, as I.Reflected
// draws them) are one SVG image, made on first use: an image is rasterised once and shared by
// every layer of every explorer window (live and motion-blur copies), where the inline drawings
// cost each layer ~200 DOM nodes, masks and their paint. (Pixel-identical to the inline icons:
// max channel difference 5, RMSE 0.04 over the toolbar.)
const TOOL_IMG_H = 75
// SVG markup of a React element tree (the icons are plain function components drawing SVG)
const KEEP_CAMEL = new Set(['viewBox', 'gradientUnits', 'gradientTransform', 'preserveAspectRatio', 'maskUnits', 'maskContentUnits', 'patternUnits', 'clipPathUnits', 'spreadMethod', 'stdDeviation'])
const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
function iconMarkup(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (Array.isArray(node)) return node.map(iconMarkup).join('')
  if (typeof node !== 'object') return esc(node)
  const { type, props } = node
  if (typeof type === 'function') return iconMarkup(type(props))
  if (type && typeof type === 'object' && type.type) return iconMarkup({ type: type.type, props }) // memo
  if (typeof type !== 'string') return iconMarkup(props.children) // fragment
  let attrs = type === 'svg' ? ' xmlns="http://www.w3.org/2000/svg"' : ''
  for (const [k, v] of Object.entries(props)) {
    if (k === 'children' || v == null || v === false) continue
    if (k === 'style') attrs += ` style="${esc(Object.entries(v).map(([p, x]) => kebab(p) + ':' + x).join(';'))}"`
    else attrs += ` ${k === 'className' ? 'class' : KEEP_CAMEL.has(k) ? k : kebab(k)}="${esc(v)}"`
  }
  return `<${type}${attrs}>${iconMarkup(props.children)}</${type}>`
}
function toolbarImage(fav) {
  const items = TOOLS.filter((it) => fav || !it.fav)
  const w = Math.max(...items.map((it) => it.ix + it.iw)) + 4
  const defs = [`<g id="bf">${iconMarkup(<I.BackForward />)}</g>`]
  const body = [`<use href="#bf" x="${BF.x}" y="${BF.y}"/>`]
  items.forEach((it, i) => {
    defs.push(`<g id="t${i}">${iconMarkup(<it.Icon />)}</g>`)
    // the reflection: the icon flipped below its box, its lowest 9 px fading out, at 30 %
    defs.push(`<linearGradient id="g${i}" gradientUnits="userSpaceOnUse" x1="0" y1="${it.ih}" x2="0" y2="${it.ih - 9}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`)
    defs.push(`<mask id="m${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${it.iw}" height="${it.ih}"><rect width="${it.iw}" height="${it.ih}" fill="url(#g${i})"/></mask>`)
    body.push(`<svg x="${it.ix}" y="${it.iy}" width="${it.iw}" height="${it.ih}" overflow="visible"><use href="#t${i}"/></svg>`)
    body.push(`<g transform="translate(${it.ix} ${it.iy + 2 * it.ih}) scale(1 -1)" opacity="0.3"><svg width="${it.iw}" height="${it.ih}" overflow="hidden"><g mask="url(#m${i})"><use href="#t${i}"/></g></svg></g>`)
  })
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${TOOL_IMG_H}" viewBox="0 0 ${w} ${TOOL_IMG_H}"><defs>${defs.join('')}</defs>${body.join('')}</svg>`
  return { src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(doc), w }
}
let toolImgs = null
const toolImg = (fav) => {
  toolImgs ??= [toolbarImage(false), toolbarImage(true)]
  return toolImgs[fav ? 1 : 0]
}

const DEFAULT_COMMANDS = [
  { id: 'hide', label: 'Hide Music Tasks', icon: 'hide' },
  { id: 'up', label: 'Up a Folder', icon: 'up' },
  { id: 'folders', label: 'Folders', icon: 'folders' },
  { id: 'find', label: 'Find', icon: 'find' },
  { id: 'preview', label: 'Preview', icon: 'preview' },
]
// measured slots of the video's command row (icon box, text x)
const SLOTS = [
  { icon: [14, 104, 14, 14], tx: 35, ty: 113, size: 10.4 },
  { icon: [194, 99, 20, 20], tx: 218, ty: 112.5, size: 9.8 },
  { icon: [295, 99, 26, 26], tx: 320, ty: 112.5, size: 9.8 },
  { icon: [372, 97, 24, 24], tx: 396, ty: 112.5, size: 9.8 },
  { icon: [441, 99, 18, 18], tx: 462, ty: 112.5, size: 9.8, button: [433, 96, 77, 23] },
]
const CMD_ICONS = {
  hide: () => <I.HideTasksIcon />,
  up: () => <I.UpFolderIcon />,
  folders: () => <I.FolderIcon size={26} />,
  find: () => <I.FindIcon />,
  preview: () => <I.PreviewIcon />,
}

const MENU_LABELS = [['File', 16, '#86bcff'], ['Edit', 57, '#86bcff'], ['View', 100, '#86bcff'], ['Help', 151, '#8cc2ff']]

const val = (v, win, t, def) => (v == null ? def : typeof v === 'function' ? v(win, t) : v)

// places every explorer window can go to (the breadcrumb drop-downs and default menus)
const open = (id, app = id) => () => emit('win.open', { id, app })
export const PLACES = [
  { label: 'my Documents', onClick: open('documents') },
  { label: 'my Pictures', onClick: open('pictures') },
  { label: 'my Music', onClick: open('music') },
  { label: 'my Computer', onClick: open('computer') },
  '-',
  { label: 'Control Panel', onClick: open('control') },
]
// the Favorites drop-down (every link opens Internet Explorer on its offline page)
export const FAVORITES = [
  { label: 'MSN.com', onClick: () => emit('win.open', { id: 'ie', app: 'ie', props: { url: 'www.msn.com' } }) },
  { label: 'Music on MSN', onClick: () => emit('win.open', { id: 'ie', app: 'ie', props: { url: 'music.msn.com' } }) },
  { label: 'ofoto.com', onClick: () => emit('win.open', { id: 'ie', app: 'ie', props: { url: 'www.ofoto.com' } }) },
  { label: 'Yahoo!', onClick: () => emit('win.open', { id: 'ie', app: 'ie', props: { url: 'www.yahoo.com' } }) },
  { label: 'Google', onClick: () => emit('win.open', { id: 'ie', app: 'ie', props: { url: 'www.google.com' } }) },
  '-',
  { label: 'Windows Update', onClick: () => emit('win.open', { id: 'ie', app: 'ie', props: { url: 'windowsupdate.microsoft.com' } }) },
]
const defaultMenus = (win) => ({
  File: [{ label: 'Close', onClick: () => emit('win.close', { id: win.id }) }],
  Edit: [{ label: 'Select All', shortcut: 'Ctrl+A', disabled: true }],
  View: [{ label: 'Refresh', shortcut: 'F5', onClick: () => emit('explorer.refresh', { id: win.id }) }],
  Help: [
    { label: 'Help and Support', onClick: open('help') },
    '-',
    { label: 'About Windows', onClick: open('about') },
  ],
})

// copy: a motion-blur copy's chrome (no hit areas or menus, the toolbar icons from one image)
export const ExplorerChrome = memo(function ExplorerChrome({ win, app, w, t, copy = false }) {
  const id = win.id
  const cfg = typeof app.explorer === 'object' ? app.explorer : {}
  const crumbs = val(cfg.crumbs, win, t, ['my Computer', 'my Pictures'])
  const commands = val(cfg.commands, win, t, DEFAULT_COMMANDS)
  const pressedV = val(cfg.pressed, win, t, 'preview')
  const pressed = new Set(Array.isArray(pressedV) ? pressedV : [pressedV])
  const menus0 = val(cfg.menus, win, t, null) || defaultMenus(win)
  const menus = menus0.Favorites ? menus0 : { ...menus0, Favorites: FAVORITES }
  const crumbMenus = val(cfg.crumbMenus, win, t, null) || [PLACES, PLACES]
  const menuId = (m) => wid(win, 'xmenu.' + m)
  const menu = (m) => (e) => {
    e.stopPropagation()
    emit('explorer.menu', { id, menu: m })
    if (menus[m]) dropBelow(menuId(m), e.currentTarget, menus[m])
  }
  const cmd = (c) => () => {
    emit('explorer.command', { id, command: c.id })
    if (c.onClick) c.onClick(win)
  }
  const Search = cfg.Search
  return (
    <>
      {/* glass toolbar (title bar + favourites row) */}
      <div style={abs(1, 0, w - 1, 75, { background: grad(toolbarStops, w) })} />
      <div
        style={abs(1, 0, w - 1, 75, {
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.28) 0, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0) 6px, rgba(255,255,255,0) 64px, rgba(255,255,255,0.06) 68px, rgba(255,255,255,0.1) 70px, rgba(0,0,0,0) 72px)',
        })}
      />
      <img alt="" src={toolImg(w >= 760).src} width={toolImg(w >= 760).w} height={TOOL_IMG_H} style={abs(0, 0, toolImg(w >= 760).w, TOOL_IMG_H)} />
      {!copy && <div data-hit="nav:back" style={abs(18, 26, 26, 26)} onClick={() => emit('explorer.nav', { id, dir: 'back' })} />}
      {!copy && <div data-hit="nav:forward" style={abs(46, 30, 18, 18)} onClick={() => emit('explorer.nav', { id, dir: 'forward' })} />}
      <Texts style={label.style} items={toolsFor(w).map((it) => ({ x: it.tx, y: 48, text: it.text, size: label.size, w: label.w, f: label.f, sx: label.sx, c: label.c }))} />
      {!copy &&
        toolsFor(w).map((it) => (
          <div key={it.text} data-hit={'tool:' + it.text} style={abs(it.ix - 2, 22, it.tx - it.ix + it.text.length * 6.5 + 4, 40, { cursor: 'default' })} onClick={it.fav ? menu('Favorites') : it.onClick} />
        ))}

      {/* menu / address band and command row */}
      <div
        style={abs(1, 72, w - 2, 50, {
          background: grad(bandStops, w),
          borderRadius: '8px 8px 0 0',
          boxShadow: 'inset 0 1px 0 rgba(20,60,130,0.6), inset 0 2px 0 rgba(140,190,255,0.12)',
        })}
      />
      <div style={abs(0, 118, w, 4, { background: 'linear-gradient(180deg, #3f7ac3, #5a96e0 50%, #3c76b7)' })} />
      <div style={abs(0, 122, w, 1, { background: '#9cd8ff' })} />

      <Texts items={MENU_LABELS.map(([m, x, c]) => ({ x, y: 88, text: m, size: 10, w: 400, f: HEAVY, sx: 1, c }))} />
      {!copy && MENU_LABELS.map(([m, x]) => <div key={m} data-hit={'menu:' + m} style={abs(x - 6, 76, 34, 16)} onClick={menu(m)} />)}

      {/* breadcrumb address bar */}
      <div
        style={abs(198, 78, w - 213, 17, {
          borderRadius: 9,
          background: `linear-gradient(90deg, #d9ecfb 0, #e5effa 300px, #e3edf9 480px, #dce8f6 ${w - 257}px, #c3d5ec ${w - 213}px)`,
          boxShadow: '0 -1px 0 rgba(20,55,105,0.75), inset 0 1px 1px rgba(10,40,100,0.35), 0 1px 0 rgba(170,210,255,0.35)',
        })}
      />
      <Crumbs id={id} crumbs={crumbs} search={Search ? '' : val(cfg.search, win, t, 'search my for...')} menuIds={copy ? null : [0, 1].map((i) => wid(win, 'xcrumb.' + i))} crumbMenus={crumbMenus} copy={copy} />
      {Search && <Search win={win} t={t} copy={copy} />}
      {!copy && Object.keys(menus).map((m) => (
        <DropMenu key={m} id={menuId(m)} items={menus[m]} />
      ))}
      {!copy && crumbMenus.map((items, i) => items && <DropMenu key={'c' + i} id={wid(win, 'xcrumb.' + i)} items={items} />)}

      {/* command row */}
      {commands.slice(0, SLOTS.length).map((c, i) => {
        const s = SLOTS[i]
        const Icon = typeof c.icon === 'string' ? CMD_ICONS[c.icon] : c.icon
        const isPressed = pressed.has(c.id)
        return (
          <div key={c.id}>
            {s.button && isPressed && (
              <div
                style={abs(...s.button, {
                  borderRadius: 4,
                  background: 'linear-gradient(180deg, rgba(150,200,255,0.55), rgba(110,170,240,0.45))',
                  boxShadow: 'inset 0 0 0 1px rgba(170,215,255,0.35)',
                })}
              />
            )}
            <div style={abs(...s.icon)}>{Icon && <Icon />}</div>
            {!copy && <div data-hit={'cmd:' + c.id} style={abs(s.icon[0] - 4, 96, s.tx - s.icon[0] + c.label.length * 6 + 10, 23)} onClick={cmd(c)} />}
          </div>
        )
      })}
      {/* the labels over the pressed button's highlight */}
      <Texts items={commands.slice(0, SLOTS.length).map((c, i) => ({ key: c.id, x: SLOTS[i].tx, y: SLOTS[i].ty, text: c.label, size: SLOTS[i].size, w: 400, f: HEAVY, sx: 1, c: pressed.has(c.id) ? '#eef6ff' : '#e6f2ff' }))} />
    </>
  )
})

// the breadcrumb: the first crumb on a light-blue segment, the next on a darker one, then the search field
const Crumbs = memo(function Crumbs({ id, crumbs, search, menuIds, crumbMenus, copy }) {
  const open = (i) => (e) => {
    e.stopPropagation()
    emit('explorer.crumb', { id, index: i })
    if (crumbMenus[i]) dropBelow(menuIds[i], e.currentTarget, crumbMenus[i])
  }
  const c0 = crumbs[0] ?? '', c1 = crumbs[1]
  return (
    <>
      <div
        style={abs(198, 78, 104, 17, {
          borderRadius: '9px 0 0 9px',
          background: 'linear-gradient(180deg, #86c8ff 0, #6cb2f6 45%, #5ca2ea 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
        })}
      />
      {c1 != null && <div style={abs(302, 78, 83, 17, { background: 'linear-gradient(180deg, #6ea2df 0, #5b8fd2 50%, #5486c8 100%)' })} />}
      <svg width="10" height="10" style={{ position: 'absolute', left: 205, top: 82, overflow: 'visible' }}>
        <path d="M4.5 1 L8 5 L6 5 L6 8.5 L3 8.5 L3 5 L1 5 Z" fill="#ffffff" />
      </svg>
      <Txt x={217} y={90} size={11.5} w={400} f={HEAVY} sx={1} c="#ffffff">
        {c0}
      </Txt>
      <div style={abs(291, 85, 7, 4)}>
        <I.DropArrow c="#e8f4ff" />
      </div>
      {!copy && <div data-hit="crumb:0" style={abs(200, 78, 102, 17)} onClick={open(0)} />}
      {c1 != null && (
        <>
          <Txt x={312} y={90} size={11.5} w={400} f={HEAVY} sx={1} c="#f0f6ff">
            {c1}
          </Txt>
          <div style={abs(377, 85, 7, 4)}>
            <I.DropArrow c="#e8f4ff" />
          </div>
          {!copy && <div data-hit="crumb:1" style={abs(302, 78, 83, 17)} onClick={open(1)} />}
        </>
      )}
      {search && (
        <Txt x={389} y={89.5} size={11} w={400} c="#8ab0d8">
          {search}
        </Txt>
      )}
    </>
  )
})
