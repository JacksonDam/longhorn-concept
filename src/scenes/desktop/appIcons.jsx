// App icons for the taskbar, Start menu and menus. The video's taskbar icons (IE, Word, my Music,
// Outlook, Winamp) are the fitted images in public/img/desktop/icons at 16 px; every other icon,
// and the larger sizes, is real Windows XP art (os/xp.jsx; assets-src/SOURCES.md section 11),
// each drawn from its own size design. Components take { x, y, size }.
import { asset, preload } from '../../core/preload.js'
import { XpIcon } from '../../os/xp.jsx'
import { OutlookIcon as Outlook16, WinampIcon, iconUrl } from './icons.jsx'

const Img = (f) =>
  function ImgIcon({ x, y, size = 16 }) {
    return <img data-ic={f} src={iconUrl(f)} alt="" draggable={false} style={{ position: 'absolute', left: x, top: y, width: size, height: size }} />
  }
// the XP My Music folder is the real shell32 icon (group 237): its 16 px bitmap up to 20 px (the
// taskbar, where the video has it 1 px higher) and its 48 px design above (the Start menu)
const XP_MUSIC = { 16: asset('img/desktop/icons/ic-mymusic-xp16.png'), 48: asset('img/desktop/icons/ic-mymusic-xp48.png') }
preload([...['ic-ie', 'ic-word'].map(iconUrl), XP_MUSIC[16], XP_MUSIC[48]])

// Internet Explorer 6 and the Office 2003 Word document, each redrawn from its 16 px design for
// the taskbar; above 20 px IE is XP's own 32 / 48 px icon (iexplore.exe)
const IE16 = Img('ic-ie')
export function IEIcon({ x, y, size = 16 }) {
  return size <= 20 ? <IE16 x={x} y={y} size={size} /> : <XpIcon name="ie" x={x} y={y} size={size} />
}
const Word16 = Img('ic-word')
// above 20 px: Office 2003's own Word and Outlook icons (winword.exe, outlook.exe); the taskbar
// keeps the video's 16 px designs (its Outlook is a pre-release blue)
export function WordIcon({ x, y, size = 16 }) {
  return size <= 20 ? <Word16 x={x} y={y} size={size} /> : <XpIcon name="word" x={x} y={y} size={size} />
}
export function OutlookIcon({ x, y, size = 16 }) {
  return size <= 20 ? <Outlook16 x={x} y={y} size={size} /> : <XpIcon name="outlook" x={x} y={y} size={size} />
}
export function MusicIcon({ x, y, size = 16 }) {
  const small = size <= 20
  return (
    <img
      data-ic="ic-mymusic"
      src={small ? XP_MUSIC[16] : XP_MUSIC[48]}
      alt=""
      draggable={false}
      style={{ position: 'absolute', left: x, top: size === 16 ? y - 1 : y, width: size, height: size }}
    />
  )
}
export { WinampIcon }

// XP icons by name: Xp('mydocs') is a { x, y, size } component
const xpCache = new Map()
export function Xp(name) {
  let C = xpCache.get(name)
  if (!C) {
    C = function XpAppIcon({ x, y, size = 16 }) {
      return <XpIcon name={name} x={x} y={y} size={size} />
    }
    xpCache.set(name, C)
  }
  return C
}
export const DocumentsIcon = Xp('mydocs')
export const PicturesIcon = Xp('mypics')
export const VideosIcon = Xp('myvideos')
export const SharedIcon = Xp('shared')
export const ComputerIcon = Xp('computer')
export const DisplayIcon = Xp('display')
export const ControlIcon = Xp('control')
export const HelpIcon = Xp('help')
export const SearchIcon = Xp('search')
export const RunIcon = Xp('run')
export const MailIcon = Xp('mail')
export const TourIcon = Xp('tour')
export const LogOffIcon = Xp('logoff')
export const ShutDownIcon = Xp('shutdown')
export const DialogIcon = Xp('app')
// app id -> XP icon for windows the shell has no entry for (taskbar buttons, Start menu)
const APP_XP = {
  notepad: 'notepad', calculator: 'calc', calc: 'calc', paint: 'paint', solitaire: 'solitaire',
  charmap: 'charmap', programs: 'programs', applet: 'control', burncd: 'cdr', sharemusic: 'mymusic',
  slideshow: 'slideshow', picedit: 'image', album: 'mypics', autoplay: 'camera', acquire: 'camera',
  about: 'sysinfo', compose: 'mail', playlist: 'audio', viewer: 'image', dialog: 'msg-info',
}
export const appXpIcon = (app) => (APP_XP[app] ? Xp(APP_XP[app]) : null)

// Messenger buddy (msmsgs.exe is not on the XP CD): the drawn buddy
const S = ({ x, y, size = 16, children, vb = 16 }) => (
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} style={{ position: 'absolute', left: x, top: y, overflow: 'visible' }}>
    {children}
  </svg>
)
export function BuddyIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <circle cx="8" cy="4.4" r="2.8" fill="#6fd0a8" stroke="#2f7f6a" strokeWidth="0.6" />
      <path d="M2.8 15 C2.8 9.6 5 7.6 8 7.6 C11 7.6 13.2 9.6 13.2 15 Z" fill="#3f7fe0" stroke="#1d4fa8" strokeWidth="0.6" />
    </S>
  )
}
export function NoIcon() {
  return null
}
