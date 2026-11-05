// The explorer apps (my Documents, my Pictures, my Computer): the client area under
// os/ExplorerChrome, in the my Music window's style: a task pane on the left ("file tasks",
// "other places", "details"), the folder's items (tiles, thumbnails, icons or details) and a
// status line. Navigation is derived from the log:
//   'xp.go' { id, path }             open a folder (double-click, task links, Run)
//   'explorer.nav' { id, dir }       back / forward (chrome), 'explorer.crumb' { id, index }
//   'explorer.command' { id, command: 'up' | 'hide' | 'folders' | 'find' | 'preview' }
//   'explorer.menu' { id, menu, x, y } the chrome's File / Edit / View / Help / Favorites
//   'fs.mkdir' { path, name }, 'fs.delete' { path, name }   (fictional file system changes)
import { memo } from 'react'
import { emit, getLog, getVersion } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, valueOf, hoverKeys, pt, selectionOf, ListView, ContextMenu, contextHandler, MenuPopup, Overlay, menuState, C, FONT, HEAVY, useLive, find } from '../../ui/index.js'
import { useUITime as useT } from '../../ui/scope.jsx'
import { normalRect, WORK } from '../../os/PlexWindow.jsx'
import { getApp } from '../../os/apps.js'
import { Ico } from './icons.jsx'
import { PictureArt } from './pictures.jsx'
import { ROOT, nodeAt, pathKey, openFile, openMusic, kb, typeName, MY_DOCS, MY_PICS } from './fs.js'
import { openWin, openUrl, messageBox } from './common.js'

const PANE_W = 190

// ---- file system changes from the log ---------------------------------------------------------
let fsCache = { v: -1, t: -1, extra: null }
function fsChanges(t) {
  const v = getVersion()
  if (fsCache.v === v && fsCache.t === t) return fsCache
  const add = new Map()
  const del = new Set()
  for (const e of getLog()) {
    if (e.t > t) break
    if (e.type === 'fs.mkdir') {
      const k = pathKey(e.path)
      add.set(k, [...(add.get(k) || []), { name: e.name, kind: 'folder', children: [], modified: e.date || '11/5/2003', created: true }])
    } else if (e.type === 'fs.delete') del.add(pathKey(e.path) + '/' + e.name)
  }
  fsCache = { v, t, add, del }
  return fsCache
}
export function childrenAt(t, path) {
  const n = resolve(path)
  if (!n) return null
  const ch = fsChanges(t)
  const k = pathKey(path)
  const list = [...(n.children || []), ...(ch.add.get(k) || [])]
  return list.filter((c) => !ch.del.has(k + '/' + c.name))
}
function resolve(path) {
  const n = nodeAt(path)
  if (n) return n
  // a folder made at run time (empty)
  return path.length > 1 ? { name: path[path.length - 1], kind: 'folder', children: [] } : null
}
const follow = (node, path) => (node.link ? node.link : [...path, node.name])

// ---- navigation -------------------------------------------------------------------------------
const NAV_TYPES = new Set(['xp.go', 'explorer.nav', 'explorer.crumb', 'explorer.command', 'win.open'])
const navCache = new Map()
export function navOf(t, win, root) {
  const v = getVersion()
  const key = win.id + '@' + win.openedAt
  const c = navCache.get(key)
  if (c && c.v === v && c.t === t) return c.s
  let list = [root]
  let pos = 0
  let hide = false
  let folders = false
  let preview = true
  const push = (p) => {
    if (pathKey(p) === pathKey(list[pos])) return
    list = [...list.slice(0, pos + 1), p]
    pos = list.length - 1
  }
  for (const e of getLog()) {
    if (e.t > t) break
    if (e.t < win.openedAt || e.id !== win.id || !NAV_TYPES.has(e.type)) continue
    if (e.type === 'xp.go') push(e.path)
    else if (e.type === 'win.open' && e.props?.go) push(e.props.go)
    else if (e.type === 'explorer.nav') {
      if (e.dir === 'back' && pos > 0) pos--
      else if (e.dir === 'forward' && pos < list.length - 1) pos++
    } else if (e.type === 'explorer.crumb') {
      const p = list[pos]
      if (e.index === 0) push(['my Computer'])
      else if (e.index === 1 && p.length > 2) push(p.slice(0, 2))
    } else if (e.type === 'explorer.command') {
      if (e.command === 'up' && list[pos].length > 1) push(list[pos].slice(0, -1))
      else if (e.command === 'hide') hide = !hide
      else if (e.command === 'folders') folders = !folders
      else if (e.command === 'preview') preview = !preview
    }
  }
  const s = { path: list[pos], canBack: pos > 0, canFwd: pos < list.length - 1, hide, folders, preview }
  navCache.set(key, { v, t, s })
  if (navCache.size > 64) navCache.delete(navCache.keys().next().value)
  return s
}
const go = (win, path) => emit('xp.go', { id: win.id, path })

// ---- task pane --------------------------------------------------------------------------------
function TaskLink({ id, a, b, onClick, icon, y }) {
  const lit = hoverKeys(useT(), id + ':h').get(0) || 0
  return (
    <div
      style={{ position: 'absolute', left: 12, top: y, width: PANE_W - 20, height: 19, display: 'flex', alignItems: 'center', gap: 6 }}
      onPointerEnter={(e) => emit('hover', { id: id + ':h', key: 0, on: true, ...pt(e) })}
      onPointerLeave={() => emit('hover', { id: id + ':h', key: 0, on: false })}
      onPointerDown={(e) => {
        if (e.button === 0) onClick?.()
      }}
    >
      <div style={{ width: 16, height: 16, flex: 'none' }}>{icon && <Ico kind={icon} size={16} />}</div>
      <span style={{ fontFamily: FONT, fontSize: 11, whiteSpace: 'nowrap', textDecoration: lit > 0.5 ? 'underline' : 'none', color: lit > 0.5 ? C.link : undefined }}>
        <span style={{ fontWeight: 400, color: lit > 0.5 ? C.link : C.textLight }}>{a} </span>
        <span style={{ fontWeight: 560, color: lit > 0.5 ? C.link : C.textDark }}>{b}</span>
      </span>
    </div>
  )
}
const Heading = memo(function Heading({ a, b, y }) {
  return (
    <div style={{ position: 'absolute', left: 14, top: y, fontFamily: FONT, fontSize: 17.5, fontWeight: 300, color: C.headingLight, whiteSpace: 'nowrap', lineHeight: '20px' }}>
      {a} <span style={{ fontWeight: 500, color: C.heading }}>{b}</span>
    </div>
  )
})

function tasksFor(win, path, node, selNode) {
  const k = pathKey(path)
  const special = node?.special
  const groups = []
  if (k === 'my Computer') {
    groups.push([
      ['system', 'tasks'],
      [
        ['View system', 'information', 'computer', () => openWin('about', 'about')],
        ['Add or remove', 'programs', 'programs', () => openWin('cpl:programs', 'applet', { applet: 'programs' })],
        ['Change a', 'setting', 'display', () => openWin('control', 'control')],
      ],
    ])
  } else if (special === 'pictures') {
    groups.push([
      ['picture', 'tasks'],
      [
        ['View as a', 'slide show', 'slideshow', () => openWin('viewer', 'viewer', { pic: selNode?.pic, slideshow: true })],
        ['Order prints', 'online', 'ie', () => openUrl('www.ofoto.com')],
        ['Print', 'pictures', 'print', () => noPrinter()],
        ['Copy all items', 'to CD', 'cd', () => openWin('burncd', 'burncd', { what: 'pictures' })],
      ],
    ])
  } else {
    groups.push([
      ['file', 'tasks'],
      [
        ['Make a new', 'folder', 'folder', () => newFolder(path)],
        ['Publish this folder', 'to the Web', 'ie', () => openUrl('www.msn.com')],
        ['Share this', 'folder', 'shared', () => openWin('sharemusic', 'sharemusic', { folder: path[path.length - 1] })],
      ],
    ])
  }
  const places = []
  if (k !== pathKey(MY_DOCS)) places.push(['my', 'Documents', 'folder', () => go(win, MY_DOCS)])
  if (k !== pathKey(MY_PICS)) places.push(['my', 'Pictures', 'picture', () => go(win, MY_PICS)])
  places.push(['my', 'Music', 'music', () => openMusic()])
  if (k !== 'my Computer') places.push(['my', 'Computer', 'computer', () => go(win, ['my Computer'])])
  places.push(['Control', 'Panel', 'programs', () => openWin('control', 'control')])
  groups.push([['other', 'places'], places.slice(0, 4)])
  return groups
}

let folderN = 0
function newFolder(path) {
  folderN++
  emit('fs.mkdir', { path, name: folderN === 1 ? 'New Folder' : `New Folder (${folderN})` })
}
const noPrinter = () => messageBox({ title: 'Print', icon: 'warning', text: 'Windows cannot print because no printer is installed.\nTo add a printer, open Printers and Faxes in Control Panel.' })

function TaskPane({ win, path, node, selNode, preview, h }) {
  const groups = tasksFor(win, path, node, selNode)
  let y = 18
  const out = []
  groups.forEach(([[a, b], links], gi) => {
    out.push(<Heading key={'h' + gi} a={a} b={b} y={y} />)
    y += 28
    links.forEach(([la, lb, icon, fn], li) => {
      out.push(<TaskLink key={gi + ':' + li} id={wid(win, `task.${gi}.${li}`)} a={la} b={lb} icon={icon} onClick={fn} y={y} />)
      y += 20
    })
    y += 22
  })
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: PANE_W, height: h }}>
      {out}
      <Heading a="" b="details" y={y} />
      <Details node={selNode || node} path={path} y={y + 28} preview={preview} />
    </div>
  )
}

const Details = memo(function Details({ node, y, preview }) {
  if (!node) return null
  const line = { fontFamily: FONT, fontSize: 10.5, lineHeight: '15px', color: C.textDark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: PANE_W - 26 }
  return (
    <div style={{ position: 'absolute', left: 14, top: y }}>
      {preview && node.kind === 'picture' && (
        <div style={{ marginBottom: 6, boxShadow: '0 0 0 1px #c5d3e8, 0 3px 6px rgba(40,70,120,0.2)', width: 120, height: 90 }}>
          <PictureArt id={node.pic} w={120} h={90} />
        </div>
      )}
      <div style={{ ...line, fontFamily: HEAVY, color: '#3a4260' }}>{node.name}</div>
      <div style={line}>{node.kind === 'computer' ? 'System Folder' : typeName(node)}</div>
      {node.size != null && <div style={line}>Size: {kb(node.size)}</div>}
      {node.modified && <div style={line}>Date Modified: {node.modified}</div>}
      {node.free && <div style={line}>Free Space: {node.free}</div>}
      {node.total && <div style={line}>Total Size: {node.total}</div>}
    </div>
  )
})

// folder tree (the Folders command): the top levels as an indented list
function FolderTree({ win, path, h, t }) {
  const rows = []
  const walk = (n, p, depth) => {
    rows.push({ key: pathKey(p), cells: [n.name], icon: <Ico kind={iconOf(n)} size={16} />, depth, path: p })
    if (n.children && depth < 3 && !n.link && (depth < 1 || pathKey(path).startsWith(pathKey(p)))) for (const c of childrenAt(t, p) || []) if (c.children || c.kind === 'folder') walk(c, [...p, c.name], depth + 1)
  }
  walk(ROOT, ['my Computer'], 0)
  return (
    <div style={{ position: 'absolute', left: 4, top: 6, width: PANE_W - 8, height: h - 12, background: 'rgba(255,255,255,0.7)', borderRadius: 4, boxShadow: `inset 0 0 0 1px ${C.borderLight}` }}>
      <ListView
        id={wid(win, 'tree')}
        x={2}
        y={2}
        w={PANE_W - 12}
        h={h - 16}
        rowH={18}
        multi={false}
        items={rows.map((r) => ({ ...r, cells: [' '.repeat(r.depth * 4) + r.cells[0]] }))}
        onSelect={(keys) => {
          const r = rows.find((x) => x.key === keys[0])
          if (r) go(win, r.path)
        }}
      />
    </div>
  )
}

export const iconOf = (n) =>
  ({ computer: 'computer', drive: 'drive', cd: 'cd', floppy: 'floppy', shared: 'shared', doc: 'doc', text: 'text', picture: 'picture', music: 'music' })[n.kind] ||
  (n.special === 'pictures' ? 'picture' : n.special === 'music' ? 'music' : 'folder')

// ---- item views -------------------------------------------------------------------------------
const VIEWS = { tiles: [214, 54], thumbs: [118, 112], icons: [86, 76] }

const Tile = memo(function Tile({ node, view, sel, lit, active }) {
  const [cw, ch] = VIEWS[view]
  const bg = sel ? (active ? C.rowSel : C.rowSelDim) : lit > 0 ? C.rowHover : null
  const edge = sel && active ? `inset 0 0 0 1px ${C.rowSelEdge}` : lit > 0 ? 'inset 0 0 0 1px rgba(150,195,250,0.6)' : null
  const name = { fontFamily: FONT, fontSize: 11, color: sel && active ? '#1d3f78' : '#3a4260', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
  if (view === 'tiles') {
    return (
      <div style={{ position: 'relative', width: cw - 6, height: ch - 6 }}>
        {bg && <div style={{ position: 'absolute', inset: 0, borderRadius: 4, background: bg, boxShadow: edge, opacity: sel ? 1 : lit }} />}
        <div style={{ position: 'absolute', left: 4, top: 3 }}>
          {node.kind === 'picture' ? (
            <div style={{ width: 42, height: 42, display: 'flex', alignItems: 'center' }}>
              <div style={{ boxShadow: '0 0 0 1px #fff, 0 0 0 2px #b9c7dc' }}>
                <PictureArt id={node.pic} w={40} h={30} />
              </div>
            </div>
          ) : (
            <Ico kind={iconOf(node)} size={42} />
          )}
        </div>
        <div style={{ position: 'absolute', left: 54, top: 6, width: cw - 66, ...name }}>{node.name}</div>
        <div style={{ position: 'absolute', left: 54, top: 21, width: cw - 66, ...name, fontSize: 10, color: '#8b91a6' }}>{node.free ? `${node.free} free of ${node.total}` : typeName(node)}</div>
        {node.size != null && <div style={{ position: 'absolute', left: 54, top: 34, ...name, fontSize: 10, color: '#8b91a6' }}>{kb(node.size)}</div>}
      </div>
    )
  }
  const thumb = view === 'thumbs'
  return (
    <div style={{ position: 'relative', width: cw - 6, height: ch - 6 }}>
      {bg && <div style={{ position: 'absolute', inset: 0, borderRadius: 4, background: bg, boxShadow: edge, opacity: sel ? 1 : lit }} />}
      <div style={{ position: 'absolute', left: 0, right: 0, top: thumb ? 6 : 4, display: 'flex', justifyContent: 'center' }}>
        {thumb ? (
          <div style={{ width: 96, height: 72, background: '#fff', boxShadow: '0 0 0 1px #c5d3e8, 0 2px 4px rgba(40,70,120,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {node.kind === 'picture' ? <PictureArt id={node.pic} w={92} h={68} /> : <Ico kind={iconOf(node)} size={44} />}
          </div>
        ) : node.kind === 'picture' ? (
          <div style={{ boxShadow: '0 0 0 1px #fff, 0 0 0 2px #b9c7dc', marginTop: 6 }}>
            <PictureArt id={node.pic} w={40} h={30} />
          </div>
        ) : (
          <Ico kind={iconOf(node)} size={42} />
        )}
      </div>
      <div style={{ position: 'absolute', left: 3, right: 3, top: thumb ? 84 : 50, textAlign: 'center', ...name }}>{node.name}</div>
    </div>
  )
})

function Grid({ win, items, view, x, y, w, h, onOpen, active, t, ctx }) {
  const id = wid(win, 'items')
  const [cw, ch] = VIEWS[view]
  const cols = Math.max(1, Math.floor((w - 20) / cw))
  const rows = Math.ceil(items.length / cols)
  const contentH = rows * ch + 12
  const max = Math.max(0, contentH - h)
  const pos = Math.min(max, Math.max(0, valueOf(t, id + ':scroll', 0)))
  const sel = new Set(selectionOf(t, id))
  const lit = hoverKeys(t, id + ':rows')
  const choose = (e, it) => {
    const cur = selectionOf(now(), id)
    let keys = [it.key]
    if (e.ctrlKey || e.metaKey) keys = cur.includes(it.key) ? cur.filter((k) => k !== it.key) : [...cur, it.key]
    emit('ui.value', { id: id + ':sel', value: { keys, anchor: it.key } })
  }
  return (
    <div
      style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden' }}
      onWheel={(e) => {
        if (max > 0) emit('ui.value', { id: id + ':scroll', value: Math.round(Math.min(max, Math.max(0, pos + e.deltaY * 0.6))) })
      }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && sel.size) emit('ui.value', { id: id + ':sel', value: { keys: [], anchor: null } })
      }}
      onContextMenu={ctx}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, transform: pos ? `translateY(${-pos}px)` : undefined }}>
        {items.map((it, i) => (
          <div
            key={it.key}
            style={{ position: 'absolute', left: 10 + (i % cols) * cw, top: 8 + Math.floor(i / cols) * ch, width: cw - 6, height: ch - 6 }}
            onPointerEnter={(e) => emit('hover', { id: id + ':rows', key: it.key, on: true, ...pt(e) })}
            onPointerLeave={() => emit('hover', { id: id + ':rows', key: it.key, on: false })}
            onPointerDown={(e) => {
              if (e.button === 0 || (e.button === 2 && !sel.has(it.key))) choose(e, it)
            }}
            onDoubleClick={() => onOpen(it)}
          >
            <Tile node={it.node} view={view} sel={sel.has(it.key)} lit={lit.get(it.key) || 0} active={active} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- the explorer body -------------------------------------------------------------------------
function ExplorerBody({ win, t, w, h, active, root, defView, app }) {
  const nav = navOf(t, win, root)
  const path = nav.path
  const node = resolve(path)
  const kids = childrenAt(t, path) || []
  const items = kids.map((n) => ({ key: n.name, node: n, cells: [n.name, n.size != null ? kb(n.size) : '', n.kind === 'computer' ? 'System Folder' : typeName(n), n.modified || ''], icon: <Ico kind={iconOf(n)} size={16} />, sort: [n.name.toLowerCase(), n.size ?? -1, typeName(n), n.modified || ''] }))
  const viewId = wid(win, 'view:' + pathKey(path))
  const view = valueOf(t, viewId, node?.special === 'pictures' ? 'thumbs' : defView)
  const selKeys = selectionOf(t, wid(win, 'items'))
  const selNode = kids.find((n) => n.name === selKeys[selKeys.length - 1])
  const showPane = !nav.hide
  const left = showPane ? PANE_W : 0
  const statusH = 20
  const open = (it) => {
    const n = it.node
    if (n.app === 'music') return openMusic()
    if (n.children && !n.removable) return go(win, follow(n, path))
    openFile(n, path)
  }
  const del = (n) =>
    messageBox({
      title: n.children ? 'Confirm Folder Delete' : 'Confirm File Delete',
      icon: 'question',
      text: `Are you sure you want to send '${n.name}' to the Recycle Bin?`,
      buttons: [{ label: 'Yes', isDefault: true, emit: ['fs.delete', { path, name: n.name }] }, { label: 'No' }],
    })
  const setView = (v) => emit('ui.value', { id: viewId, value: v })
  const viewItems = [
    { label: 'Thumbnails', radio: view === 'thumbs', onClick: () => setView('thumbs') },
    { label: 'Tiles', radio: view === 'tiles', onClick: () => setView('tiles') },
    { label: 'Icons', radio: view === 'icons', onClick: () => setView('icons') },
    { label: 'Details', radio: view === 'details', onClick: () => setView('details') },
  ]
  const ctxBg = [{ label: 'View', items: viewItems }, '-', { label: 'Refresh', onClick: () => emit('xp.go', { id: win.id, path }) }, '-', { label: 'New', items: [{ label: 'Folder', onClick: () => newFolder(path) }] }, '-', { label: 'Properties', onClick: () => props(node) }]
  const ctxItem = selNode
    ? [{ label: 'Open', bold: true, onClick: () => open({ node: selNode }) }, '-', { label: 'Delete', disabled: !!selNode.removable || !!selNode.special || node?.kind === 'computer', onClick: () => del(selNode) }, '-', { label: 'Properties', onClick: () => props(selNode) }]
    : ctxBg
  const ctxId = wid(win, 'ctx')
  const ctx = contextHandler(ctxId, () => (selectionOf(now(), wid(win, 'items')).length ? ctxItem : ctxBg))
  const menus = {
    File: [
      { label: 'Open', disabled: !selNode, onClick: () => selNode && open({ node: selNode }) },
      { label: 'New', items: [{ label: 'Folder', onClick: () => newFolder(path) }] },
      '-',
      { label: 'Delete', disabled: !selNode || !!selNode.removable || !!selNode.special || node?.kind === 'computer', onClick: () => selNode && del(selNode) },
      { label: 'Properties', onClick: () => props(selNode || node) },
      '-',
      { label: 'Close', onClick: () => emit('win.close', { id: win.id }) },
    ],
    Edit: [
      { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => emit('ui.value', { id: wid(win, 'items') + ':sel', value: { keys: kids.map((n) => n.name), anchor: null } }) },
      { label: 'Invert Selection', onClick: () => emit('ui.value', { id: wid(win, 'items') + ':sel', value: { keys: kids.map((n) => n.name).filter((k) => !selKeys.includes(k)), anchor: null } }) },
    ],
    View: [...viewItems, '-', { label: 'Refresh', onClick: () => emit('xp.go', { id: win.id, path }) }],
    Help: [{ label: 'Help and Support Center', onClick: () => openWin('help', 'help') }, '-', { label: 'About Windows', onClick: () => openWin('about', 'about') }],
    Favorites: [{ label: 'MSN.com', onClick: () => openUrl('www.msn.com') }, { label: 'Radio Station Guide', onClick: () => openUrl('windowsmedia.com/radio') }],
  }
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      {showPane && (nav.folders ? <FolderTree win={win} path={path} h={h - statusH} t={t} /> : <TaskPane win={win} path={path} node={node} selNode={selNode} preview={nav.preview} h={h - statusH} />)}
      {view === 'details' ? (
        <ListView
          id={wid(win, 'items')}
          x={left + 6}
          y={6}
          w={w - left - 12}
          h={h - statusH - 10}
          items={items}
          columns={[{ label: 'Name', w: 190 }, { label: 'Size', w: 70, align: 'right' }, { label: 'Type', w: 150 }, { label: 'Date Modified', w: Math.max(90, w - left - 12 - 410 - 17) }]}
          onOpen={open}
          active={active}
          onContext={ctx}
        />
      ) : (
        <Grid win={win} items={items} view={view} x={left} y={0} w={w - left} h={h - statusH} onOpen={open} active={active} t={t} ctx={ctx} />
      )}
      {!kids.length && (
        <div style={{ position: 'absolute', left, right: 0, top: 30, textAlign: 'center', fontFamily: FONT, fontSize: 11, color: C.textDim, pointerEvents: 'none' }}>This folder is empty.</div>
      )}
      <div style={{ position: 'absolute', left: 0, top: h - statusH, width: w, height: statusH, background: 'linear-gradient(180deg, rgba(255,255,255,0) 0, rgba(255,255,255,0.18) 2px, rgba(255,255,255,0.05) 19px)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: h - statusH, height: statusH, lineHeight: `${statusH}px`, textAlign: 'center', fontFamily: FONT, fontWeight: 500, fontSize: 11, color: '#7f8db0' }}>
        {selKeys.length ? `${selKeys.length} object${selKeys.length > 1 ? 's' : ''} selected` : `${kids.length} object${kids.length === 1 ? '' : 's'}`}
      </div>
      <ContextMenu id={ctxId} items={() => (selectionOf(now(), wid(win, 'items')).length ? ctxItem : ctxBg)} />
      <ChromeMenu win={win} t={t} menus={menus} app={app} />
    </div>
  )
}

function props(n) {
  if (!n) return
  messageBox({
    title: `${n.name} Properties`,
    icon: 'info',
    text: [n.name, `Type: ${n.kind === 'computer' ? 'System Folder' : typeName(n)}`, n.size != null ? `Size: ${kb(n.size)}` : null, n.modified ? `Modified: ${n.modified}` : null, n.free ? `Free space: ${n.free} of ${n.total}` : null].filter(Boolean).join('\n'),
  })
}

// the explorer chrome's File / Edit / View / Help / Favorites: 'explorer.menu' opens one at the
// clicked title (window-local x, y); it closes with 'ui.menu' { id: <win>.xmenu, open: null }
export function ChromeMenu({ win, t, menus, app }) {
  const live = useLive()
  const em = lastWin(t, win, 'explorer.menu')
  const closed = menuState(t, win.id + '.xmenu')
  if (!live || !em || (closed && closed.t >= em.t)) return null
  const items = menus[em.menu]
  if (!items) return null
  const r = win.maximized ? WORK : normalRect(win, app)
  return (
    <Overlay>
      <MenuPopup id={win.id + '.xmenu.' + em.menu} items={items} x={Math.round(r.x + em.x)} y={Math.round(r.y + em.y + 1)} openT={em.t} onClose={() => emit('ui.menu', { id: win.id + '.xmenu', open: null })} />
    </Overlay>
  )
}
function lastWin(t, win, type) {
  const [a, i] = find(t, type, win.id)
  return i >= 0 && a[i].t >= win.openedAt ? a[i] : null
}

// an explorer app: makeExplorer({ id, title, root, view, position, crumbs })
export function makeExplorer({ id, title, taskbar, root, view = 'tiles', position, size = { w: 720, h: 540 }, crumbs, search }) {
  const app = {
    id,
    title: () => title,
    taskbarLabel: () => taskbar || title,
    icon: null,
    size,
    position,
    minSize: { w: 600, h: 380 },
    explorer: {
      crumbs,
      search: search ?? 'search my for...',
      commands: [
        { id: 'hide', label: 'Hide Tasks', icon: 'hide' },
        { id: 'up', label: 'Up a Folder', icon: 'up' },
        { id: 'folders', label: 'Folders', icon: 'folders' },
        { id: 'find', label: 'Find', icon: 'find' },
        { id: 'preview', label: 'Preview', icon: 'preview' },
      ],
      pressed: () => null,
    },
  }
  app.Content = scoped(function Explorer(props) {
    return <ExplorerBody {...props} root={root} defView={view} app={getApp(id)} />
  })
  return app
}
