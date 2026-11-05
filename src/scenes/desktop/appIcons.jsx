// Small (16 px) Plex-style app icons for the taskbar, Start menu and menus. Image files where the
// video shows a real icon (IE, Word, my Music, Outlook, Winamp; public/img/desktop/icons), drawn
// SVG for the rest.
import { asset, preload } from '../../core/preload.js'
import { OutlookIcon, WinampIcon, iconUrl } from './icons.jsx'

const S = ({ x, y, size = 16, children, vb = 16 }) => (
  <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} style={{ position: 'absolute', left: x, top: y, overflow: 'visible' }}>
    {children}
  </svg>
)

const Img = (f) =>
  function ImgIcon({ x, y, size = 16 }) {
    return <img data-ic={f} src={iconUrl(f)} alt="" draggable={false} style={{ position: 'absolute', left: x, top: y, width: size, height: size }} />
  }
// the XP My Music folder is the real shell32 icon (group 237): its 16 px bitmap up to 20 px (the
// taskbar, where the video has it 1 px higher) and its 48 px design above (the Start menu)
const XP_MUSIC = { 16: asset('img/desktop/icons/ic-mymusic-xp16.png'), 48: asset('img/desktop/icons/ic-mymusic-xp48.png') }
preload([...['ic-ie', 'ic-word'].map(iconUrl), XP_MUSIC[16], XP_MUSIC[48]])

// Internet Explorer 6 and the Office 2003 Word document, each redrawn from its 16 px design (the
// larger IE6/Office versions are drawn differently)
export const IEIcon = Img('ic-ie')
export const WordIcon = Img('ic-word')
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
export { OutlookIcon, WinampIcon }

function folderBody(extra) {
  return (
    <>
      <path d="M1 4 Q1 3 2 3 L6 3 L7.4 4.6 L14 4.6 Q15 4.6 15 5.6 L15 13 Q15 14 14 14 L2 14 Q1 14 1 13 Z" fill="#e8c35a" stroke="#a57d1e" strokeWidth="0.7" />
      {extra}
      <path d="M1 6.6 L15 6.6 L15 13 Q15 14 14 14 L2 14 Q1 14 1 13 Z" fill="#f7da7c" stroke="#a57d1e" strokeWidth="0.7" />
    </>
  )
}

export function DocumentsIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      {folderBody(<rect x="4" y="2" width="8" height="8" fill="#ffffff" stroke="#8b9bb4" strokeWidth="0.6" />)}
      <path d="M5.5 9 H10.5 M5.5 11 H9" stroke="#b08a2e" strokeWidth="0.8" />
    </S>
  )
}
export function PicturesIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      {folderBody(<rect x="4" y="1.6" width="9" height="7" fill="#7fb7e8" stroke="#ffffff" strokeWidth="0.8" />)}
      <circle cx="11" cy="9.6" r="2" fill="#f2c94c" opacity="0.9" />
      <path d="M3 13 L6.5 9.4 L9 11.6 L13 8.8 L13 13 Z" fill="#5b9a4a" opacity="0.85" />
    </S>
  )
}
export function ComputerIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <rect x="1.5" y="1.5" width="13" height="9.5" rx="1" fill="#d7dde6" stroke="#5d6b82" strokeWidth="0.8" />
      <rect x="3" y="3" width="10" height="6.5" fill="#3b7bd8" />
      <path d="M3 3 L13 3 L3 9.5 Z" fill="#6aa4ee" opacity="0.6" />
      <path d="M6 11 L5 13.6 L11 13.6 L10 11 Z" fill="#aab4c4" />
      <rect x="3.5" y="13.6" width="9" height="1.4" rx="0.5" fill="#8c97aa" />
    </S>
  )
}
export function DisplayIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <rect x="1.5" y="1.5" width="13" height="9.5" rx="1" fill="#d7dde6" stroke="#5d6b82" strokeWidth="0.8" />
      <rect x="3" y="3" width="10" height="6.5" fill="#e98a3a" />
      <path d="M3 7.6 L6 5.6 L8.6 7.2 L13 4.6 L13 9.5 L3 9.5 Z" fill="#3c4f7a" />
      <rect x="6.5" y="11" width="3" height="2.4" fill="#aab4c4" />
      <rect x="4" y="13.4" width="8" height="1.4" rx="0.5" fill="#8c97aa" />
    </S>
  )
}
export function ControlIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <rect x="1.5" y="2" width="13" height="12" rx="1.5" fill="#e3e9f3" stroke="#5d6b82" strokeWidth="0.8" />
      <rect x="3.5" y="4" width="4" height="3.5" fill="#3b7bd8" />
      <rect x="8.5" y="4" width="4" height="3.5" fill="#5bb04a" />
      <rect x="3.5" y="8.5" width="4" height="3.5" fill="#e0a43a" />
      <rect x="8.5" y="8.5" width="4" height="3.5" fill="#c4544a" />
    </S>
  )
}
export function HelpIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <circle cx="8" cy="8" r="7" fill="#2f6fd6" stroke="#1a4596" strokeWidth="0.8" />
      <ellipse cx="7" cy="5" rx="4.5" ry="2.6" fill="#fff" opacity="0.25" />
      <path d="M5.8 6 Q5.8 3.8 8 3.8 Q10.3 3.8 10.3 5.8 Q10.3 7.2 8.6 7.8 Q8 8.1 8 9.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11.8" r="1.05" fill="#fff" />
    </S>
  )
}
export function SearchIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <circle cx="6.5" cy="6.5" r="4.4" fill="#cfe6ff" fillOpacity="0.6" stroke="#2f62b8" strokeWidth="1.6" />
      <ellipse cx="5.4" cy="5" rx="2" ry="1.2" fill="#fff" opacity="0.8" />
      <path d="M9.8 9.8 L14.5 14.5" stroke="#2f62b8" strokeWidth="2.2" strokeLinecap="round" />
    </S>
  )
}
export function RunIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <rect x="1.5" y="3" width="13" height="10" rx="1" fill="#f4f6fa" stroke="#5d6b82" strokeWidth="0.8" />
      <rect x="1.5" y="3" width="13" height="2.6" fill="#3b7bd8" />
      <path d="M4 8.2 L6.4 9.6 L4 11 M7.6 11 H11" stroke="#2c3e5c" strokeWidth="1" fill="none" />
    </S>
  )
}
export function MailIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <rect x="1" y="3.5" width="14" height="9.5" rx="1" fill="#f8f5ec" stroke="#7d7f90" strokeWidth="0.8" />
      <path d="M1.4 4 L8 9 L14.6 4" fill="none" stroke="#9a8f6a" strokeWidth="0.9" />
    </S>
  )
}
export function BuddyIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <circle cx="8" cy="4.4" r="2.8" fill="#6fd0a8" stroke="#2f7f6a" strokeWidth="0.6" />
      <path d="M2.8 15 C2.8 9.6 5 7.6 8 7.6 C11 7.6 13.2 9.6 13.2 15 Z" fill="#3f7fe0" stroke="#1d4fa8" strokeWidth="0.6" />
    </S>
  )
}
export function DialogIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.2" fill="#f4f6fa" stroke="#5d6b82" strokeWidth="0.8" />
      <rect x="1.5" y="2.5" width="13" height="3" rx="1" fill="#3b7bd8" />
      <rect x="9" y="10" width="4" height="2" rx="0.6" fill="#b9c6dc" />
    </S>
  )
}
export function LogOffIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <rect x="1" y="1" width="14" height="14" rx="3" fill="#e9a53a" stroke="#9a6416" strokeWidth="0.7" />
      <ellipse cx="7" cy="4.5" rx="5" ry="2.4" fill="#fff" opacity="0.3" />
      <path d="M6.5 5 L3.5 8 L6.5 11 M3.8 8 H11.5" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </S>
  )
}
export function ShutDownIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <rect x="1" y="1" width="14" height="14" rx="3" fill="#d4513a" stroke="#8a2a1c" strokeWidth="0.7" />
      <ellipse cx="7" cy="4.5" rx="5" ry="2.4" fill="#fff" opacity="0.3" />
      <path d="M5.2 5.4 A4 4 0 1 0 10.8 5.4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M8 3.2 V8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </S>
  )
}
export function SwitchIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <rect x="1" y="1" width="14" height="14" rx="3" fill="#4a8fe0" stroke="#1d4fa8" strokeWidth="0.7" />
      <path d="M4 6 H11 M9 4 L11 6 L9 8 M12 10.5 H5 M7 8.5 L5 10.5 L7 12.5" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </S>
  )
}
export function WeatherIcon({ x, y, size }) {
  return (
    <S x={x} y={y} size={size}>
      <circle cx="6" cy="6" r="3.4" fill="#f5c542" />
      <path d="M4 13.5 Q1.5 13.5 1.8 11.2 Q2.2 9.2 4.4 9.4 Q5.2 7.2 7.8 7.6 Q10 8 10.4 9.8 Q13.8 9.6 14 12 Q14 13.5 12.2 13.5 Z" fill="#eef2f8" stroke="#8d9ab0" strokeWidth="0.6" />
    </S>
  )
}
export function NoIcon() {
  return null
}
