// The fictional file system behind my Computer, my Documents, my Pictures and Search: a few
// neutral late-2003 files. Paths are arrays of names from the 'my Computer' root.
//
// node: { name, kind, size?, modified?, children?, link? (path it stands for), app? (opens a window) }
// kinds: computer, drive, cd, floppy, folder, shared, doc, text, picture, music
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { getWindow } from '../../os/wm.js'
import { openWin, messageBox } from './common.js'
import { PICTURES } from './pictures.jsx'

const d = (s) => s // dates are display strings (m/d/yyyy h:mm AM/PM)

const docs = [
  { name: 'Book club list.doc', kind: 'doc', size: 24, modified: d('10/12/2003 4:15 PM') },
  { name: 'Garden plan.doc', kind: 'doc', size: 31, modified: d('9/28/2003 11:02 AM') },
  { name: 'Holiday cards.doc', kind: 'doc', size: 19, modified: d('11/2/2003 8:40 PM') },
  { name: 'Moving checklist.doc', kind: 'doc', size: 27, modified: d('8/17/2003 2:26 PM') },
  { name: 'Recipes.txt', kind: 'text', size: 3, modified: d('10/30/2003 6:51 PM') },
  { name: 'Weekend trip.doc', kind: 'doc', size: 22, modified: d('10/24/2003 9:12 AM') },
]

const pictureFiles = PICTURES.map((p) => ({ name: p.name + '.jpg', kind: 'picture', size: p.size, modified: p.taken, pic: p.id }))

const music = [
  { name: 'Gomez - Bring it on.wma', kind: 'music', size: 4270, modified: d('6/9/2003 7:30 PM'), track: 0 },
  { name: 'U2 - One More Voice.wma', kind: 'music', size: 2960, modified: d('6/9/2003 7:34 PM'), track: 1 },
  { name: 'Alicia Keys - Just another.wma', kind: 'music', size: 7030, modified: d('7/2/2003 9:05 PM'), track: 2 },
  { name: 'Evergreen - Small sound.wma', kind: 'music', size: 4820, modified: d('7/2/2003 9:11 PM'), track: 3 },
]

export const MY_DOCS = ['my Computer', 'my Documents']
export const MY_PICS = ['my Computer', 'my Documents', 'my Pictures']

export const ROOT = {
  name: 'my Computer',
  kind: 'computer',
  children: [
    {
      name: 'my Documents',
      kind: 'folder',
      special: 'documents',
      children: [
        { name: 'my Music', kind: 'folder', special: 'music', app: 'music', children: music },
        { name: 'my Pictures', kind: 'folder', special: 'pictures', children: pictureFiles },
        { name: 'my Videos', kind: 'folder', children: [] },
        ...docs,
      ],
    },
    { name: 'Shared Documents', kind: 'shared', children: [{ name: 'Shared Music', kind: 'folder', children: [] }, { name: 'Shared Pictures', kind: 'folder', children: [] }] },
    {
      name: 'Local Disk (C:)',
      kind: 'drive',
      free: '28.4 GB',
      total: '37.2 GB',
      children: [
        {
          name: 'Documents and Settings',
          kind: 'folder',
          children: [
            { name: 'All Users', kind: 'folder', children: [] },
            { name: 'Sondra', kind: 'folder', children: [{ name: 'Desktop', kind: 'folder', children: [] }, { name: 'Favorites', kind: 'folder', children: [] }, { name: 'my Documents', kind: 'folder', link: MY_DOCS }] },
          ],
        },
        {
          name: 'Program Files',
          kind: 'folder',
          children: ['Internet Explorer', 'Messenger', 'Microsoft Office', 'Movie Maker', 'Outlook Express', 'Winamp3', 'Windows Media Player'].map((n) => ({ name: n, kind: 'folder', children: [] })),
        },
        {
          name: 'WINDOWS',
          kind: 'folder',
          children: [
            { name: 'Fonts', kind: 'folder', children: [] },
            { name: 'Help', kind: 'folder', children: [] },
            { name: 'Media', kind: 'folder', children: [] },
            { name: 'system32', kind: 'folder', children: [] },
            { name: 'Web', kind: 'folder', children: [{ name: 'Wallpaper', kind: 'folder', children: [] }] },
          ],
        },
      ],
    },
    { name: 'DVD-RW Drive (D:)', kind: 'cd', removable: 'disc', children: null },
    { name: '3½ Floppy (A:)', kind: 'floppy', removable: 'disk', children: null },
  ],
}

export function nodeAt(path) {
  let n = ROOT
  for (let i = 1; i < path.length; i++) {
    const c = n?.children?.find((x) => x.name === path[i])
    if (!c) return null
    n = c
  }
  return n
}
export const pathKey = (p) => p.join('/')

// open a file (folders are navigated by the explorer itself)
export function openFile(node, path) {
  if (node.app === 'music') return openMusic()
  if (node.removable) {
    const drive = node.name.match(/\(([A-Z]):\)/)?.[1] || 'D'
    messageBox({
      title: node.name,
      icon: 'cd',
      text: node.removable === 'disc' ? `Please insert a disc into drive ${drive}:.` : `Please insert a disk into drive ${drive}:.`,
    })
    return
  }
  switch (node.kind) {
    case 'doc':
    case 'text':
      openWin('word:' + node.name, 'word', { file: node.name })
      return
    case 'picture':
      openWin('viewer', 'viewer', { pic: node.pic, folder: pathKey(path || MY_PICS) })
      return
    case 'music':
      emit('media.play', { track: node.track })
      openWin('winamp', 'winamp')
      return
  }
}

// the my Music window keeps its legacy events
export function openMusic() {
  const w = getWindow(now(), 'music')
  if (!w || w.state === 'closed') emit('music.open')
  else if (w.state === 'minimized') emit('music.restore')
  else emit('win.focus', { id: 'music' })
}

// every file, for Search: [{ node, path (folder path) }]
export function allFiles() {
  const out = []
  const walk = (n, path) => {
    for (const c of n.children || []) {
      out.push({ node: c, path })
      if (c.children && !c.link) walk(c, [...path, c.name])
    }
  }
  walk(ROOT, ['my Computer'])
  return out
}

// Run box: drive letters, folder names and file names
export function lookupPath(s) {
  const q = s.trim().toLowerCase().replace(/[\\/]+$/, '')
  if (!q) return null
  const drive = q.match(/^([a-z]):(.*)$/)
  if (drive) {
    const dn = ROOT.children.find((c) => c.name.toLowerCase().includes(`(${drive[1]}:)`))
    if (!dn) return null
    if (dn.removable) return { open: () => openFile(dn) }
    const parts = drive[2].split(/[\\/]/).filter(Boolean)
    let path = ['my Computer', dn.name]
    for (const p of parts) {
      const n = nodeAt(path)
      const c = n?.children?.find((x) => x.name.toLowerCase() === p)
      if (!c) return null
      path = [...path, c.name]
    }
    return { open: () => openWin('computer', 'computer', { go: path }) }
  }
  for (const { node, path } of allFiles()) {
    if (node.name.toLowerCase() === q || node.name.toLowerCase().replace(/\.[a-z0-9]+$/, '') === q) {
      if (node.children) return { open: () => openWin('computer', 'computer', { go: [...path, node.name] }) }
      return { open: () => openFile(node, path) }
    }
  }
  return null
}

export const kb = (n) => (n >= 1024 ? `${(n / 1024).toFixed(1)} MB` : `${n} KB`)
export const typeName = (n) =>
  ({
    folder: 'File Folder',
    shared: 'File Folder',
    doc: 'Microsoft Word Document',
    text: 'Text Document',
    picture: 'JPEG Image',
    music: 'Windows Media Audio file',
    drive: 'Local Disk',
    cd: 'CD Drive',
    floppy: '3½-Inch Floppy Disk',
  })[n.kind] || 'File'
