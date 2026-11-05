// The explorer-window chrome of the Plex window (from the video's my Music window): the glass
// toolbar (back/forward, Home, Search, link buttons, Favorites; the title and window buttons are
// drawn on it by PlexWindow), the menu row with the breadcrumb address bar, and the command row.
// Window-local px; EXPLORER_TOP is where the client area starts.
//
// App config (`explorer` in the app registry; every field optional, defaults = my Music):
//   { crumbs: ['my Computer', 'my Pictures'] | (win, t) => [...],
//     search: 'search my for...' | (win, t) => string,
//     commands: [{ id, label, icon: 'hide' | 'up' | 'folders' | 'find' | 'preview' | <component> }],
//     pressed: 'preview' | (win, t) => command id shown pressed,
//     menus: { File: items, Edit: items, View: items, Help: items } | (win, t) => {...}  (ui kit items) }
// Clicks emit events the app or the shell handles:
//   'explorer.command' { id: <window id>, command }   command row
//   'explorer.menu'    { id, menu: 'File' | 'Edit' | 'View' | 'Help', x, y }
//   'explorer.crumb'   { id, index, x, y }
//   'explorer.nav'     { id, dir: 'back' | 'forward' }
// Web links open Internet Explorer on its offline page (the brief's rule), Home opens MSN in IE,
// Search opens the Search window, Favorites drops the Favorites list ('explorer.menu' Favorites).
import { memo } from 'react'
import { emit } from '../core/events.js'
import { Txt, abs, HEAVY } from './text.jsx'
import * as I from './icons.jsx'

export const EXPLORER_TOP = 123

const W0 = 777 // the gradients were measured on the 777 px my Music window: stops scale with the width
const toolbarStops = [['#4985d7', 0], ['#4f8bdd', 40], ['#5793e2', 120], ['#5fa1ed', 200], ['#6eb0fa', 285], ['#6ab0f8', 330], ['#68aaf8', 360], ['#66a8f4', 440], ['#5fa2ee', 500], ['#5a9ce9', 560], ['#558fe2', 640], ['#4e84d7', 700], ['#4a86d8', 777]]
const bandStops = [['#326ab4', 0], ['#356eba', 85], ['#3b73bd', 125], ['#427dc4', 165], ['#508bd2', 245], ['#5994d4', 285], ['#5a9ade', 325], ['#5c9ce0', 365], ['#5c9ad9', 405], ['#5a9ad8', 445], ['#5190d6', 485], ['#518cd1', 525], ['#4984cb', 565], ['#437ec3', 605], ['#3974bd', 645], ['#386ebb', 685], ['#326ab6', 725], ['#336bb5', 777]]
const grad = (stops, w) => `linear-gradient(90deg, ${stops.map(([c, x]) => `${c} ${w === W0 ? x + 'px' : ((x / W0) * 100).toFixed(2) + '%'}`).join(', ')})`

const label = { size: 11, w: 400, f: HEAVY, sx: 1, c: '#e4f4ff', style: { filter: 'drop-shadow(0 0 1.2px rgba(10,50,120,0.75))' } }

function ToolItem({ text, tx, children, iw, ih, ix, iy, onClick, hitW }) {
  return (
    <>
      <I.Reflected x={ix} y={iy} w={iw} h={ih} gap={0} depth={9} op={0.3}>
        {children}
      </I.Reflected>
      <Txt x={tx} y={48} {...label}>
        {text}
      </Txt>
      <div data-hit={'tool:' + text} style={abs(ix - 2, 22, hitW ?? tx - ix + text.length * 6.5 + 4, 40, { cursor: 'default' })} onClick={onClick} />
    </>
  )
}

const ie = (url) => () => emit('win.open', { id: 'ie', app: 'ie', props: { url } })

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

const val = (v, win, t, def) => (v == null ? def : typeof v === 'function' ? v(win, t) : v)

export const ExplorerChrome = memo(function ExplorerChrome({ win, app, w, t }) {
  const id = win.id
  const cfg = typeof app.explorer === 'object' ? app.explorer : {}
  const crumbs = val(cfg.crumbs, win, t, ['my Computer', 'my Pictures'])
  const commands = val(cfg.commands, win, t, DEFAULT_COMMANDS)
  const pressed = val(cfg.pressed, win, t, 'preview')
  const menu = (m, x) => (e) => emit('explorer.menu', { id, menu: m, x: win.rect ? x : x, y: 95 })
  const cmd = (c) => () => emit('explorer.command', { id, command: c })
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
      <div style={abs(10, 19, 60, 40)}>
        <I.BackForward />
      </div>
      <div data-hit="nav:back" style={abs(18, 26, 26, 26)} onClick={() => emit('explorer.nav', { id, dir: 'back' })} />
      <div data-hit="nav:forward" style={abs(46, 30, 18, 18)} onClick={() => emit('explorer.nav', { id, dir: 'forward' })} />
      <ToolItem ix={90} iy={22} iw={34} ih={36} tx={133} text="Home" onClick={ie('www.msn.com')}>
        <I.HomeIcon />
      </ToolItem>
      <ToolItem ix={149} iy={29} iw={50} ih={26} tx={209} text="Search" onClick={() => emit('win.open', { id: 'search', app: 'search' })}>
        <I.SearchIcon />
      </ToolItem>
      <ToolItem ix={255} iy={27} iw={28} ih={32} tx={291} text="ofoto.com" onClick={ie('www.ofoto.com')}>
        <I.PageIcon kind="ofoto" />
      </ToolItem>
      <ToolItem ix={356} iy={26} iw={26} ih={30} tx={387} text="my music" onClick={() => emit('win.open', { id: 'music', app: 'music' })}>
        <I.NotesIcon />
      </ToolItem>
      <ToolItem ix={444} iy={26} iw={28} ih={32} tx={482} text="yahoo.com" onClick={ie('www.yahoo.com')}>
        <I.PageIcon kind="yahoo" />
      </ToolItem>
      <ToolItem ix={553} iy={26} iw={28} ih={32} tx={593} text="google.com" onClick={ie('www.google.com')}>
        <I.PageIcon kind="google" />
      </ToolItem>
      {w >= 760 && (
        <ToolItem ix={659} iy={25} iw={30} ih={30} tx={695} text="Favorites" onClick={menu('Favorites', 659)}>
          <I.StarIcon />
        </ToolItem>
      )}

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

      {[['File', 16, '#86bcff'], ['Edit', 57, '#86bcff'], ['View', 100, '#86bcff'], ['Help', 151, '#8cc2ff']].map(([m, x, c]) => (
        <div key={m}>
          <Txt x={x} y={88} size={10} w={400} f={HEAVY} sx={1} c={c}>
            {m}
          </Txt>
          <div data-hit={'menu:' + m} style={abs(x - 6, 76, 34, 16)} onClick={menu(m, x - 6)} />
        </div>
      ))}

      {/* breadcrumb address bar */}
      <div
        style={abs(198, 78, w - 213, 17, {
          borderRadius: 9,
          background: `linear-gradient(90deg, #d9ecfb 0, #e5effa 300px, #e3edf9 480px, #dce8f6 ${w - 257}px, #c3d5ec ${w - 213}px)`,
          boxShadow: '0 -1px 0 rgba(20,55,105,0.75), inset 0 1px 1px rgba(10,40,100,0.35), 0 1px 0 rgba(170,210,255,0.35)',
        })}
      />
      <Crumbs id={id} crumbs={crumbs} search={val(cfg.search, win, t, 'search my for...')} />

      {/* command row */}
      {commands.slice(0, SLOTS.length).map((c, i) => {
        const s = SLOTS[i]
        const Icon = typeof c.icon === 'string' ? CMD_ICONS[c.icon] : c.icon
        const isPressed = c.id === pressed
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
            <Txt x={s.tx} y={s.ty} size={s.size} w={400} f={HEAVY} sx={1} c={isPressed ? '#eef6ff' : '#e6f2ff'}>
              {c.label}
            </Txt>
            <div data-hit={'cmd:' + c.id} style={abs(s.icon[0] - 4, 96, s.tx - s.icon[0] + c.label.length * 6 + 10, 23)} onClick={cmd(c.id)} />
          </div>
        )
      })}
    </>
  )
})

// the breadcrumb: the first crumb on a light-blue segment, the next on a darker one, then the search field
const Crumbs = memo(function Crumbs({ id, crumbs, search }) {
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
      <div data-hit="crumb:0" style={abs(200, 78, 102, 17)} onClick={() => emit('explorer.crumb', { id, index: 0, x: 200, y: 95 })} />
      {c1 != null && (
        <>
          <Txt x={312} y={90} size={11.5} w={400} f={HEAVY} sx={1} c="#f0f6ff">
            {c1}
          </Txt>
          <div style={abs(377, 85, 7, 4)}>
            <I.DropArrow c="#e8f4ff" />
          </div>
          <div data-hit="crumb:1" style={abs(302, 78, 83, 17)} onClick={() => emit('explorer.crumb', { id, index: 1, x: 302, y: 95 })} />
        </>
      )}
      <Txt x={389} y={89.5} size={11} w={400} c="#8ab0d8">
        {search}
      </Txt>
    </>
  )
})
