// App icons: <Ico kind size />. Real Windows XP art wherever XP has the icon (os/xp.jsx, sprites
// built from the XP SP3 binaries; assets-src/SOURCES.md section 13): files, folders, drives,
// places, Control Panel applets and categories, the IE6, Explorer and Outlook Express toolbar
// images and the Picture and Fax Viewer tools; Office 2003's Word document. Each kind maps to an
// XP icon name (an XP name may also be passed as the kind). What has no such art stays an SVG
// glyph: the Winamp transport buttons (Nullsoft's skin), Messenger's emoticon / block buttons and
// the format bar's letters.
import { memo } from 'react'
import { XpIcon, hasXp } from '../../os/xp.jsx'

// kind -> XP icon name
const XP = {
  // files, folders, drives
  folder: 'folder', open: 'tb-open', doc: 'worddoc', text: 'text', picture: 'image', video: 'video', music: 'audio',
  drive: 'drive', cd: 'dvd', floppy: 'floppy', shared: 'shared', computer: 'computer',
  camera: 'camera', recycle: 'recycle', mypics: 'mypics', mymusic: 'mymusic', mydocs: 'mydocs',
  // applets and places
  display: 'display', clock: 'datetime', sound: 'sound', mouse: 'mouse', users: 'users',
  network: 'netconn', programs: 'addremove', printer: 'printers', help: 'help', run: 'run',
  ie: 'ie', mailbig: 'mail', search32: 'search', calc: 'calc', charmap: 'charmap',
  cards: 'solitaire', paint: 'paint',
  // toolbars: IE6
  back: 'tb-back', forward: 'tb-forward', stop: 'tb-stop', refresh: 'tb-refresh', home: 'tb-home',
  search: 'tb-search', star: 'tb-favorites', history: 'tb-history', mail: 'tb-mail', print: 'tb-print',
  go: 'tb-go',
  // Explorer
  newdoc: 'tb-new', save: 'tb-save', cut: 'tb-cut', copy: 'tb-copy', paste: 'tb-paste',
  undo: 'tb-undo', redo: 'tb-redo', find: 'tb-find', folders: 'tb-folders', up: 'tb-up',
  // Outlook Express
  newmail: 'oe-newmail', reply: 'oe-reply', replyall: 'oe-replyall', fwd: 'oe-forward',
  del: 'oe-delete', sendrecv: 'oe-sendrecv', send: 'oe-send', attach: 'oe-attach',
  // Picture and Fax Viewer
  zoomin: 'pv-zoomin', zoomout: 'pv-zoomout', rotate: 'pv-rotcw', slideshow: 'slideshow',
}

// SVG glyphs where XP has no counterpart, and the format bar's letter glyphs (Word draws B / I / U
// and the alignment lines as plain glyphs; light so they read on the blue chrome)
const L = '#eaf5ff'
const glyphs = {
  bold: <text x="12" y="17.5" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="15" fill={L}>B</text>,
  italic: <text x="12" y="17.5" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="15" fill={L}>I</text>,
  underline: (
    <>
      <text x="12" y="16" textAnchor="middle" fontFamily="Georgia, serif" fontSize="14" fill={L}>U</text>
      <path d="M7 19 H17" stroke={L} strokeWidth="1.5" />
    </>
  ),
  alignL: <path d="M4 6 H20 M4 10 H14 M4 14 H20 M4 18 H14" stroke={L} strokeWidth="1.7" />,
  alignC: <path d="M4 6 H20 M7 10 H17 M4 14 H20 M7 18 H17" stroke={L} strokeWidth="1.7" />,
  alignR: <path d="M4 6 H20 M10 10 H20 M4 14 H20 M10 18 H20" stroke={L} strokeWidth="1.7" />,
  bullets: (
    <>
      <circle cx="5.5" cy="7" r="1.6" fill={L} />
      <circle cx="5.5" cy="12" r="1.6" fill={L} />
      <circle cx="5.5" cy="17" r="1.6" fill={L} />
      <path d="M9.5 7 H20 M9.5 12 H20 M9.5 17 H20" stroke={L} strokeWidth="1.6" />
    </>
  ),
  color: (
    <>
      <text x="12" y="15" textAnchor="middle" fontFamily="Georgia, serif" fontSize="13" fill={L}>A</text>
      <rect x="5" y="17" width="14" height="3.2" fill="#e8402a" />
    </>
  ),
  play: <path d="M8 5 L19 12 L8 19 Z" fill={L} stroke="#2e66b5" strokeWidth="0.8" strokeLinejoin="round" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="4" height="14" rx="1" fill={L} />
      <rect x="13.5" y="5" width="4" height="14" rx="1" fill={L} />
    </>
  ),
  stopm: <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill={L} />,
  prev: (
    <>
      <rect x="5" y="6" width="2.6" height="12" fill={L} />
      <path d="M18.5 6 L9 12 L18.5 18 Z" fill={L} />
    </>
  ),
  next: (
    <>
      <rect x="16.4" y="6" width="2.6" height="12" fill={L} />
      <path d="M5.5 6 L15 12 L5.5 18 Z" fill={L} />
    </>
  ),
  eject: (
    <>
      <path d="M12 5 L19 13 H5 Z" fill={L} />
      <rect x="5" y="15.5" width="14" height="3" fill={L} />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5 H8 L13 5 V19 L8 14.5 H4 Z" fill={L} />
      <path d="M16 8.5 A5 5 0 0 1 16 15.5 M18.5 6 A8.5 8.5 0 0 1 18.5 18" fill="none" stroke={L} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  emoticon: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="url(#ig-yellow)" stroke="#a87800" strokeWidth="0.8" />
      <circle cx="9" cy="10" r="1.2" fill="#5a3b00" />
      <circle cx="15" cy="10" r="1.2" fill="#5a3b00" />
      <path d="M8 14 Q12 17.5 16 14" fill="none" stroke="#5a3b00" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),
  block: (
    <>
      <circle cx="12" cy="12" r="8" fill="none" stroke={L} strokeWidth="2" />
      <path d="M6.5 17.5 L17.5 6.5" stroke={L} strokeWidth="2" />
    </>
  ),
}

// The shared gradients live once in the document (a 0 x 0 svg in <body>), not in every icon:
// url(#ig-...) references resolve document-wide.
function injectDefs() {
  if (typeof document === 'undefined' || document.getElementById('ig-defs')) return
  const grad = (id, [hi, mid, lo]) =>
    `<radialGradient id="${id}" cx="0.35" cy="0.3" r="0.85"><stop offset="0" stop-color="${hi}"/><stop offset="0.55" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></radialGradient>`
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('id', 'ig-defs')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:hidden'
  svg.innerHTML = `<defs>${grad('ig-yellow', ['#fff6c4', '#f8d24a', '#c08b00'])}</defs>`
  document.body.appendChild(svg)
}
injectDefs()

export const xpName = (kind) => XP[kind] || (hasXp(kind) ? kind : null)

export const Ico = memo(function Ico({ kind, size = 20, style }) {
  const x = xpName(kind)
  if (x) return <XpIcon name={x} size={size} style={{ display: 'block', ...style }} />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', overflow: 'visible', ...style }}>
      {glyphs[kind] || null}
    </svg>
  )
})

export const hasIcon = (kind) => !!xpName(kind) || kind in glyphs
