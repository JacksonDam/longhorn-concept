// Shell-side description of apps: taskbar label and icon for a wm window, and the shell's
// launch actions (all of them emit the documented 'win.open' events; apps that aren't
// registered yet simply render nothing until the window system and apps land).
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { focusedWindow, getWindow } from '../../os/wm.js'
import { getApp, hasApp } from '../../os/apps.js'
import { asset } from '../../core/preload.js'
import {
  IEIcon, WordIcon, MusicIcon, OutlookIcon, WinampIcon, DocumentsIcon, PicturesIcon, ComputerIcon,
  DisplayIcon, ControlIcon, HelpIcon, SearchIcon, RunIcon, BuddyIcon, DialogIcon,
} from './appIcons.jsx'

// label: what the taskbar button says; Icon: 16 px icon component
const APPS = {
  outlook: { label: () => 'Inbox - Microsoft Outlook', Icon: OutlookIcon },
  ie: { label: (p) => (p.url === 'yahoo.com' ? 'Yahoo.com' : p.url ? `${p.url} - Microsoft Internet Explorer` : 'Microsoft Internet Explorer'), Icon: IEIcon },
  word: { label: () => 'Document 12 - Microsoft Word', Icon: WordIcon },
  winamp: { label: () => 'Winamp3', Icon: WinampIcon },
  music: { label: () => 'My Music', Icon: MusicIcon },
  documents: { label: () => 'My Documents', Icon: DocumentsIcon },
  pictures: { label: () => 'My Pictures', Icon: PicturesIcon },
  computer: { label: () => 'My Computer', Icon: ComputerIcon },
  control: { label: () => 'Control Panel', Icon: ControlIcon },
  help: { label: () => 'Help and Support Center', Icon: HelpIcon },
  search: { label: () => 'Search Results', Icon: SearchIcon },
  run: { label: () => 'Run', Icon: RunIcon },
  display: { label: () => 'Display Properties', Icon: DisplayIcon },
  im: { label: (p) => `${p.buddy || 'Buddy'} - Conversation`, Icon: BuddyIcon },
  dialog: { label: (p) => p.title || 'Windows', Icon: DialogIcon },
}

// the video's own buttons keep their measured labels and icons
const VIDEO = { inbox: 'outlook', yahoo: 'ie', doc1: 'word', winamp: 'winamp', music: 'music' }
const isVideo = (win) => VIDEO[win.id] === win.app

const iconCache = new Map()
function urlIcon(url) {
  let C = iconCache.get(url)
  if (!C) {
    C = function RegistryIcon({ x, y, size = 16 }) {
      return <img src={url} alt="" draggable={false} style={{ position: 'absolute', left: x, top: y, width: size, height: size }} />
    }
    iconCache.set(url, C)
  }
  return C
}

export const appOf = (win) => APPS[win.app] || { label: () => win.app || win.id, Icon: DialogIcon }
export function taskLabel(win) {
  if (!isVideo(win) && hasApp(win.app)) {
    const a = getApp(win.app)
    const l = a.taskbarLabel?.(win.props || {}) ?? a.title?.(win.props || {})
    if (l) return l
  }
  return appOf(win).label(win.props || {})
}
export function TaskIcon(win) {
  if (!isVideo(win) && hasApp(win.app)) {
    const icon = getApp(win.app).icon
    if (icon) return urlIcon(icon)
  }
  return appOf(win).Icon
}
void asset

// open (or restore and focus) a window
export function openApp(id, app, props) {
  emit('win.open', props ? { id, app, props } : { id, app })
}
// legacy events for the my Music window, which the music window still listens to
const LEGACY = { 'win.open': 'music.open', 'win.minimize': 'music.minimize', 'win.restore': 'music.restore', 'win.close': 'music.close' }
export function winEvent(type, id) {
  if (id === 'music' && LEGACY[type]) emit(LEGACY[type])
  else emit(type, { id })
}

// XP taskbar button rules: restore a minimised window, minimise the focused one, focus others
export function taskClick(id) {
  const t = now()
  const w = getWindow(t, id)
  if (!w) return
  emit('tb.press', { id })
  if (w.state === 'minimized') winEvent('win.restore', id)
  else if (focusedWindow(t)?.id === id) winEvent('win.minimize', id)
  else winEvent('win.focus', id)
}

// The shell's launchers (Start menu, sidebar, desktop menu)
export const launch = {
  documents: () => openApp('documents', 'documents'),
  pictures: () => openApp('pictures', 'pictures'),
  music: () => {
    const w = getWindow(now(), 'music')
    if (!w || w.state === 'closed') emit('music.open')
    else if (w.state === 'minimized') emit('music.restore')
    else emit('win.focus', { id: 'music' })
  },
  computer: () => openApp('computer', 'computer'),
  internet: (url = 'www.msn.com') => openApp('ie', 'ie', { url }),
  email: (message) => openApp('inbox', 'outlook', message ? { message } : undefined),
  word: () => openApp('doc1', 'word'),
  winamp: () => openApp('winamp', 'winamp'),
  control: () => openApp('control', 'control'),
  help: () => openApp('help', 'help'),
  search: () => openApp('search', 'search'),
  run: () => openApp('run', 'run'),
  display: () => openApp('display', 'display'),
  im: (buddy) => openApp('im:' + buddy, 'im', { buddy }),
}
