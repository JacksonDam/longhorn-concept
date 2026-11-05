// Original glassy icons for the apps (SVG, drawn in the Plex palette). <Ico kind size />
// Toolbar glyphs are light on the blue chrome; file / applet icons are full colour.
import { memo } from 'react'

const G = {
  blue: ['#bfe3ff', '#3d8ef0', '#1650b8'],
  green: ['#d6ffc4', '#4dbb3a', '#1e7a14'],
  red: ['#ffd0c4', '#e9553a', '#a3200c'],
  orange: ['#ffe9b8', '#f5a623', '#b56a00'],
  purple: ['#f1d6ff', '#a066e0', '#5a2aa0'],
  grey: ['#ffffff', '#c9d3e2', '#7d8aa3'],
  yellow: ['#fff6c4', '#f8d24a', '#c08b00'],
}
const gloss = <ellipse cx="12" cy="6.5" rx="7.5" ry="3.6" fill="#fff" opacity="0.45" />

// light toolbar glyphs (on the blue chrome)
const L = '#eaf5ff'
const LS = { fill: 'none', stroke: L, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
const glyphs = {
  back: (
    <>
      <circle cx="12" cy="12" r="10" fill="url(#ig-blue)" stroke="#1b4f9c" strokeWidth="0.8" />
      {gloss}
      <path d="M13.5 7 L8.5 12 L13.5 17" {...LS} strokeWidth="2.6" stroke="#fff" />
    </>
  ),
  forward: (
    <>
      <circle cx="12" cy="12" r="10" fill="url(#ig-blue)" stroke="#1b4f9c" strokeWidth="0.8" />
      {gloss}
      <path d="M10.5 7 L15.5 12 L10.5 17" {...LS} strokeWidth="2.6" stroke="#fff" />
    </>
  ),
  stop: (
    <>
      <circle cx="12" cy="12" r="9" fill="url(#ig-red)" stroke="#8a1a08" strokeWidth="0.8" />
      {gloss}
      <path d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5" {...LS} stroke="#fff" strokeWidth="2.4" />
    </>
  ),
  refresh: (
    <>
      <path d="M18 9.5 A7 7 0 1 0 18.5 14" {...LS} stroke="#d8f5d0" strokeWidth="2.6" />
      <path d="M19.5 4.5 L19 10 L13.8 9" {...LS} stroke="#d8f5d0" strokeWidth="2.4" />
    </>
  ),
  home: (
    <>
      <path d="M4 12 L12 4.5 L20 12" {...LS} strokeWidth="2.2" />
      <path d="M6.5 11 V19.5 H17.5 V11" fill="rgba(255,255,255,0.25)" stroke={L} strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="10.5" y="14" width="3.5" height="5.5" fill={L} />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="5.5" fill="rgba(200,235,255,0.35)" stroke={L} strokeWidth="2" />
      <path d="M14 14 L19.5 19.5" {...LS} strokeWidth="3" />
    </>
  ),
  star: <path d="M12 3 L14.6 9 L21 9.4 L16 13.5 L17.7 20 L12 16.4 L6.3 20 L8 13.5 L3 9.4 L9.4 9 Z" fill="url(#ig-yellow)" stroke="#a87800" strokeWidth="0.8" strokeLinejoin="round" />,
  history: (
    <>
      <circle cx="12" cy="12" r="8" fill="rgba(255,255,255,0.2)" stroke={L} strokeWidth="1.8" />
      <path d="M12 7 V12 L15.5 14" {...LS} />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="6.5" width="17" height="11.5" rx="1.5" fill="rgba(255,255,255,0.88)" stroke="#5b86c4" strokeWidth="0.8" />
      <path d="M4 7 L12 13 L20 7" fill="none" stroke="#5b86c4" strokeWidth="1.2" />
    </>
  ),
  newmail: (
    <>
      <rect x="2.5" y="7.5" width="15" height="10.5" rx="1.5" fill="rgba(255,255,255,0.9)" stroke="#5b86c4" strokeWidth="0.8" />
      <path d="M3 8 L10 13 L17 8" fill="none" stroke="#5b86c4" strokeWidth="1.2" />
      <path d="M18.5 2.5 L19.4 5 L22 5.2 L20 6.9 L20.6 9.5 L18.5 8.1 L16.4 9.5 L17 6.9 L15 5.2 L17.6 5 Z" fill="#ffe36b" stroke="#b58a00" strokeWidth="0.5" />
    </>
  ),
  reply: (
    <>
      <path d="M10 6 L4 11.5 L10 17 V13.5 C14 13.2 17.5 14.5 20 18.5 C19.5 12.5 16 9.5 10 9.5 Z" fill={L} stroke="#2e66b5" strokeWidth="0.8" strokeLinejoin="round" />
    </>
  ),
  replyall: (
    <>
      <path d="M7 7 L2 11.5 L7 16" fill="none" stroke={L} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 6 L6.5 11.5 L12 17 V13.5 C15.5 13.2 18.5 14.5 21 18.5 C20.5 12.5 17.5 9.5 12 9.5 Z" fill={L} stroke="#2e66b5" strokeWidth="0.8" strokeLinejoin="round" />
    </>
  ),
  fwd: <path d="M14 6 L20 11.5 L14 17 V13.5 C10 13.2 6.5 14.5 4 18.5 C4.5 12.5 8 9.5 14 9.5 Z" fill={L} stroke="#2e66b5" strokeWidth="0.8" strokeLinejoin="round" />,
  del: (
    <>
      <path d="M6.5 8 H17.5 L16.5 20 H7.5 Z" fill="rgba(255,255,255,0.85)" stroke="#5b86c4" strokeWidth="0.9" strokeLinejoin="round" />
      <rect x="5" y="5.5" width="14" height="2.6" rx="1" fill={L} stroke="#5b86c4" strokeWidth="0.8" />
      <path d="M10 10.5 V17.5 M14 10.5 V17.5" stroke="#8aa8d6" strokeWidth="1.2" />
    </>
  ),
  print: (
    <>
      <rect x="7" y="3.5" width="10" height="6" fill="#fff" stroke="#5b86c4" strokeWidth="0.8" />
      <rect x="3.5" y="9" width="17" height="7.5" rx="1.5" fill="rgba(225,238,255,0.92)" stroke="#5b86c4" strokeWidth="0.8" />
      <rect x="7" y="14" width="10" height="6.5" fill="#fff" stroke="#5b86c4" strokeWidth="0.8" />
      <path d="M8.5 16.5 H15.5 M8.5 18.5 H13.5" stroke="#9fb7da" strokeWidth="0.8" />
    </>
  ),
  sendrecv: (
    <>
      <rect x="3.5" y="8.5" width="13" height="9" rx="1.2" fill="rgba(255,255,255,0.88)" stroke="#5b86c4" strokeWidth="0.8" />
      <path d="M4 9 L10 13.5 L16 9" fill="none" stroke="#5b86c4" strokeWidth="1" />
      <path d="M17 4 A5 5 0 0 1 21 9" {...LS} stroke="#c8f0bf" strokeWidth="1.8" />
      <path d="M22.2 6.8 L21 9.6 L18.4 8.4" {...LS} stroke="#c8f0bf" strokeWidth="1.6" />
    </>
  ),
  find: (
    <>
      <circle cx="10" cy="10" r="5.5" fill="rgba(200,235,255,0.45)" stroke={L} strokeWidth="2" />
      <path d="M14 14 L19.5 19.5" {...LS} strokeWidth="3" />
    </>
  ),
  newdoc: (
    <>
      <path d="M6 3.5 H14.5 L18.5 7.5 V20.5 H6 Z" fill="#fff" stroke="#5b86c4" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M14.5 3.5 V7.5 H18.5" fill="#dbe8fa" stroke="#5b86c4" strokeWidth="0.8" strokeLinejoin="round" />
    </>
  ),
  open: (
    <>
      <path d="M3 7 H9 L10.5 8.5 H18 V18.5 H3 Z" fill="#ffd979" stroke="#b58a00" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M5 11 H21 L18.5 18.5 H3 Z" fill="#ffe9a8" stroke="#b58a00" strokeWidth="0.8" strokeLinejoin="round" />
    </>
  ),
  save: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1.5" fill="url(#ig-blue)" stroke="#1b4f9c" strokeWidth="0.8" />
      <rect x="7" y="4.5" width="10" height="6" fill="#f2f7ff" />
      <rect x="7.5" y="13.5" width="9" height="6" rx="0.6" fill="#1d4f9e" />
      <rect x="13.5" y="5.5" width="2" height="4" fill="#7d9fd3" />
    </>
  ),
  cut: (
    <>
      <circle cx="8" cy="17" r="2.8" fill="none" stroke={L} strokeWidth="1.6" />
      <circle cx="16" cy="17" r="2.8" fill="none" stroke={L} strokeWidth="1.6" />
      <path d="M9.5 14.8 L16 4 M14.5 14.8 L8 4" stroke={L} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  copy: (
    <>
      <rect x="4" y="4" width="10" height="12" rx="1" fill="rgba(255,255,255,0.75)" stroke="#5b86c4" strokeWidth="0.8" />
      <rect x="9.5" y="8.5" width="10" height="12" rx="1" fill="#fff" stroke="#5b86c4" strokeWidth="0.8" />
    </>
  ),
  paste: (
    <>
      <rect x="4.5" y="5" width="12" height="15" rx="1.5" fill="#e0b46a" stroke="#8a6220" strokeWidth="0.8" />
      <rect x="7.5" y="3.5" width="6" height="3" rx="1" fill="#c9d3e2" stroke="#7d8aa3" strokeWidth="0.6" />
      <rect x="10.5" y="10" width="9" height="11" rx="1" fill="#fff" stroke="#5b86c4" strokeWidth="0.8" />
    </>
  ),
  undo: (
    <>
      <path d="M8 9 H14 A5 5 0 0 1 14 19 H9" {...LS} />
      <path d="M10.5 5.5 L7 9 L10.5 12.5" {...LS} />
    </>
  ),
  redo: (
    <>
      <path d="M16 9 H10 A5 5 0 0 0 10 19 H15" {...LS} />
      <path d="M13.5 5.5 L17 9 L13.5 12.5" {...LS} />
    </>
  ),
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
  send: (
    <>
      <path d="M3 11.5 L21 4 L15 20 L11.5 13.5 Z" fill={L} stroke="#2e66b5" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M11.5 13.5 L21 4" stroke="#2e66b5" strokeWidth="0.8" />
    </>
  ),
  attach: <path d="M15.5 7.5 L8.5 14.5 A2.2 2.2 0 0 0 11.6 17.6 L18.6 10.6 A4 4 0 0 0 13 5 L6 12 A5.6 5.6 0 0 0 14 20 L19 15" fill="none" stroke={L} strokeWidth="1.6" strokeLinecap="round" />,
  folders: (
    <>
      <path d="M3 6 H9 L10.5 7.5 H19 V18 H3 Z" fill="#ffd979" stroke="#b58a00" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M3 9.5 H21 L19 18 H3 Z" fill="#ffe9a8" stroke="#b58a00" strokeWidth="0.8" strokeLinejoin="round" />
    </>
  ),
  up: (
    <>
      <path d="M3 7 H9 L10.5 8.5 H19 V19 H3 Z" fill="#ffe9a8" stroke="#b58a00" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M12 17 V10 M8.5 13 L12 9.5 L15.5 13" stroke="#2e9a24" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  go: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" fill="url(#ig-green)" stroke="#1e7a14" strokeWidth="0.8" />
      <path d="M8 12 H16 M12.5 8.5 L16 12 L12.5 15.5" {...LS} stroke="#fff" strokeWidth="2" />
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
  zoomin: (
    <>
      <circle cx="10" cy="10" r="6" fill="rgba(200,235,255,0.35)" stroke={L} strokeWidth="1.8" />
      <path d="M14.5 14.5 L20 20 M7 10 H13 M10 7 V13" {...LS} />
    </>
  ),
  zoomout: (
    <>
      <circle cx="10" cy="10" r="6" fill="rgba(200,235,255,0.35)" stroke={L} strokeWidth="1.8" />
      <path d="M14.5 14.5 L20 20 M7 10 H13" {...LS} />
    </>
  ),
  rotate: (
    <>
      <path d="M17 9 A6.5 6.5 0 1 0 18 14.5" {...LS} />
      <path d="M18.5 4.5 L18 9.5 L13 8.8" {...LS} />
    </>
  ),
  slideshow: (
    <>
      <rect x="3.5" y="5" width="17" height="12" rx="1.5" fill="rgba(255,255,255,0.25)" stroke={L} strokeWidth="1.6" />
      <path d="M10 8.5 L15 11 L10 13.5 Z" fill={L} />
      <path d="M8 21 L12 17 L16 21" stroke={L} strokeWidth="1.5" fill="none" />
    </>
  ),
}

// full-colour icons (files, folders, drives, applets), drawn at 32 and scaled
const big = {
  folder: (
    <>
      <path d="M2.5 7 H12 L14.5 9.5 H28 V26 H2.5 Z" fill="#f4c24c" stroke="#b07f10" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M2.5 12 H30 L27.5 27 H2.5 Z" fill="url(#ig-yellowl)" stroke="#b07f10" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M3.5 13 H29" stroke="#fff" strokeWidth="0.8" opacity="0.7" />
    </>
  ),
  doc: (
    <>
      <path d="M7 3 H20 L26 9 V29 H7 Z" fill="#fff" stroke="#6f86a8" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M20 3 V9 H26" fill="#e3ecf8" stroke="#6f86a8" strokeWidth="0.8" strokeLinejoin="round" />
      <rect x="3" y="13" width="13" height="12" rx="1.5" fill="url(#ig-blue)" stroke="#1b4f9c" strokeWidth="0.6" />
      <text x="9.5" y="22.5" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="9.5" fill="#fff">W</text>
      <path d="M18 13 H23 M18 16.5 H23 M18 20 H23 M10 27 H23" stroke="#a9bad3" strokeWidth="1" />
    </>
  ),
  text: (
    <>
      <path d="M7 3 H20 L26 9 V29 H7 Z" fill="#fff" stroke="#6f86a8" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M20 3 V9 H26" fill="#e3ecf8" stroke="#6f86a8" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M10 13 H23 M10 16.5 H23 M10 20 H23 M10 23.5 H19" stroke="#a9bad3" strokeWidth="1" />
    </>
  ),
  picture: (
    <>
      <rect x="3.5" y="6" width="25" height="20" rx="1.5" fill="#fff" stroke="#6f86a8" strokeWidth="0.9" />
      <rect x="6" y="8.5" width="20" height="15" fill="#8fc6f2" />
      <path d="M6 23.5 L12.5 15 L17 20 L20 17 L26 23.5 Z" fill="#4e9a3c" />
      <circle cx="21.5" cy="12.5" r="2.2" fill="#ffe36b" />
    </>
  ),
  music: (
    <>
      <path d="M7 3 H20 L26 9 V29 H7 Z" fill="#fff" stroke="#6f86a8" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M20 3 V9 H26" fill="#e3ecf8" stroke="#6f86a8" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M14 22 V11 L22 9 V20" fill="none" stroke="#7a4fc8" strokeWidth="1.6" />
      <ellipse cx="12.3" cy="22.3" rx="2.6" ry="2" fill="#7a4fc8" />
      <ellipse cx="20.3" cy="20.3" rx="2.6" ry="2" fill="#7a4fc8" />
    </>
  ),
  drive: (
    <>
      <path d="M3 14 L7 8 H25 L29 14 Z" fill="#dfe6f1" stroke="#6f7f99" strokeWidth="0.8" strokeLinejoin="round" />
      <rect x="3" y="14" width="26" height="9" rx="1.5" fill="url(#ig-greyl)" stroke="#6f7f99" strokeWidth="0.8" />
      <circle cx="24.5" cy="18.5" r="1.4" fill="#3fd23a" />
      <path d="M6 18.5 H18" stroke="#9aa7bd" strokeWidth="1.4" />
    </>
  ),
  cd: (
    <>
      <path d="M3 14 L7 8 H25 L29 14 Z" fill="#dfe6f1" stroke="#6f7f99" strokeWidth="0.8" strokeLinejoin="round" />
      <rect x="3" y="14" width="26" height="9" rx="1.5" fill="url(#ig-greyl)" stroke="#6f7f99" strokeWidth="0.8" />
      <circle cx="16" cy="11" r="6.5" fill="#e8f2ff" stroke="#8ea6c8" strokeWidth="0.8" />
      <circle cx="16" cy="11" r="1.8" fill="#fff" stroke="#8ea6c8" strokeWidth="0.6" />
      <path d="M11.5 8 A5.5 5.5 0 0 1 16 5.5" stroke="#c9a7ff" strokeWidth="1.6" fill="none" />
    </>
  ),
  floppy: (
    <>
      <rect x="6" y="5" width="20" height="22" rx="1.5" fill="#4a5f86" stroke="#2c3a55" strokeWidth="0.8" />
      <rect x="10" y="5" width="12" height="8" fill="#d6dde8" />
      <rect x="17.5" y="6.5" width="3" height="5" fill="#4a5f86" />
      <rect x="9" y="16" width="14" height="10" rx="0.8" fill="#fff" />
    </>
  ),
  shared: (
    <>
      <path d="M2.5 7 H12 L14.5 9.5 H28 V24 H2.5 Z" fill="#f4c24c" stroke="#b07f10" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M2.5 12 H30 L27.5 25 H2.5 Z" fill="url(#ig-yellowl)" stroke="#b07f10" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M4 30 C6 25 12 25 14 30 Z" fill="#4a90e2" />
      <circle cx="9" cy="23.5" r="3" fill="#f3c9a0" stroke="#a87a50" strokeWidth="0.5" />
    </>
  ),
  computer: (
    <>
      <rect x="4" y="4" width="24" height="17" rx="2" fill="#e3e9f2" stroke="#6f7f99" strokeWidth="0.8" />
      <rect x="6.5" y="6.5" width="19" height="12" fill="url(#ig-blue)" />
      <path d="M12 21 H20 L21.5 26 H10.5 Z" fill="#c9d3e2" stroke="#6f7f99" strokeWidth="0.7" />
      <rect x="8" y="26" width="16" height="2.5" rx="1" fill="#b8c4d6" />
    </>
  ),
  display: (
    <>
      <rect x="4" y="4" width="24" height="18" rx="2" fill="#e3e9f2" stroke="#6f7f99" strokeWidth="0.8" />
      <rect x="6.5" y="6.5" width="19" height="13" fill="#f7a046" />
      <path d="M6.5 19.5 L12 13 L16 17 L19 14.5 L25.5 19.5 Z" fill="#5b7d3a" />
      <rect x="11" y="22" width="10" height="4" fill="#c9d3e2" />
    </>
  ),
  clock: (
    <>
      <circle cx="16" cy="16" r="12" fill="#fff" stroke="#6f86a8" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="10" fill="url(#ig-grey)" opacity="0.4" />
      <path d="M16 8 V16 L21 19" stroke="#1d3f78" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="8" y="22" width="16" height="7" rx="1" fill="#f4f7fb" stroke="#6f86a8" strokeWidth="0.7" />
      <path d="M10 25.5 H22" stroke="#e9553a" strokeWidth="1.2" />
    </>
  ),
  sound: (
    <>
      <path d="M5 12 H11 L18 6 V26 L11 20 H5 Z" fill="url(#ig-grey)" stroke="#6f7f99" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M21 11 A6 6 0 0 1 21 21 M24 8 A10 10 0 0 1 24 24" fill="none" stroke="#3d8ef0" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  mouse: (
    <>
      <rect x="9" y="5" width="14" height="22" rx="7" fill="url(#ig-greyl)" stroke="#6f7f99" strokeWidth="0.8" />
      <path d="M9 13 H23 M16 5 V13" stroke="#6f7f99" strokeWidth="0.8" />
      <path d="M16 5 C16 2 20 2 21 0" stroke="#6f7f99" fill="none" />
    </>
  ),
  users: (
    <>
      <circle cx="12" cy="11" r="4.5" fill="#f3c9a0" stroke="#a87a50" strokeWidth="0.6" />
      <path d="M4 26 C5 18 19 18 20 26 Z" fill="#3d8ef0" />
      <circle cx="22" cy="12" r="3.8" fill="#f3c9a0" stroke="#a87a50" strokeWidth="0.6" />
      <path d="M16 26 C17 19.5 27 19.5 28 26 Z" fill="#4dbb3a" />
    </>
  ),
  network: (
    <>
      <rect x="3" y="5" width="12" height="9" rx="1" fill="#e3e9f2" stroke="#6f7f99" strokeWidth="0.7" />
      <rect x="4.5" y="6.5" width="9" height="6" fill="url(#ig-blue)" />
      <rect x="17" y="17" width="12" height="9" rx="1" fill="#e3e9f2" stroke="#6f7f99" strokeWidth="0.7" />
      <rect x="18.5" y="18.5" width="9" height="6" fill="url(#ig-blue)" />
      <path d="M9 14 V21.5 H17" stroke="#6f7f99" strokeWidth="1.3" fill="none" />
    </>
  ),
  programs: (
    <>
      <rect x="4" y="8" width="24" height="18" rx="1.5" fill="url(#ig-yellowl)" stroke="#b07f10" strokeWidth="0.8" />
      <path d="M4 8 L9 3 H23 L28 8" fill="#ffe9a8" stroke="#b07f10" strokeWidth="0.8" />
      <rect x="11" y="13" width="10" height="9" rx="1" fill="#fff" stroke="#3d8ef0" strokeWidth="1" />
      <circle cx="16" cy="17.5" r="2" fill="#3d8ef0" />
    </>
  ),
  printer: (
    <>
      <rect x="9" y="4" width="14" height="8" fill="#fff" stroke="#6f86a8" strokeWidth="0.8" />
      <rect x="4" y="11" width="24" height="11" rx="2" fill="url(#ig-greyl)" stroke="#6f7f99" strokeWidth="0.8" />
      <rect x="9" y="19" width="14" height="9" fill="#fff" stroke="#6f86a8" strokeWidth="0.8" />
    </>
  ),
  help: (
    <>
      <circle cx="16" cy="16" r="12" fill="url(#ig-blue)" stroke="#1b4f9c" strokeWidth="0.8" />
      <ellipse cx="16" cy="9" rx="8" ry="4.5" fill="#fff" opacity="0.4" />
      <text x="16" y="22" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="16" fill="#fff">?</text>
    </>
  ),
  run: (
    <>
      <rect x="4" y="6" width="24" height="20" rx="2" fill="#e3e9f2" stroke="#6f7f99" strokeWidth="0.8" />
      <rect x="4" y="6" width="24" height="5" rx="2" fill="url(#ig-blue)" />
      <path d="M9 16 L13 19 L9 22" stroke="#1d3f78" strokeWidth="1.6" fill="none" />
      <path d="M15 22 H22" stroke="#1d3f78" strokeWidth="1.6" />
    </>
  ),
  ie: (
    <>
      <circle cx="16" cy="16" r="11" fill="url(#ig-blue)" stroke="#1b4f9c" strokeWidth="0.8" />
      <text x="16.5" y="22.5" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontWeight="700" fontSize="18" fill="#fff">e</text>
      <ellipse cx="16" cy="16" rx="14.5" ry="5" transform="rotate(-25 16 16)" fill="none" stroke="#f5c542" strokeWidth="1.8" />
    </>
  ),
  mailbig: (
    <>
      <rect x="3" y="8" width="26" height="17" rx="2" fill="#fff" stroke="#5b86c4" strokeWidth="0.9" />
      <path d="M3.5 8.5 L16 18 L28.5 8.5" fill="none" stroke="#5b86c4" strokeWidth="1.2" />
    </>
  ),
  search32: (
    <>
      <circle cx="13" cy="13" r="8" fill="#dff0ff" stroke="#3d6fb5" strokeWidth="2" />
      <path d="M19 19 L27 27" stroke="#3d6fb5" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  camera: (
    <>
      <rect x="3" y="9" width="26" height="17" rx="3" fill="url(#ig-greyl)" stroke="#5f6d86" strokeWidth="0.8" />
      <path d="M10 9 L12 5.5 H20 L22 9 Z" fill="#c9d3e2" stroke="#5f6d86" strokeWidth="0.7" />
      <circle cx="16" cy="17.5" r="6" fill="#2b3b58" stroke="#dfe6f1" strokeWidth="1.5" />
      <circle cx="16" cy="17.5" r="3.4" fill="url(#ig-blue)" />
      <circle cx="14.6" cy="16" r="1" fill="#fff" opacity="0.8" />
      <rect x="23" y="11" width="4" height="2.5" rx="0.8" fill="#f5c542" />
    </>
  ),
  calc: (
    <>
      <rect x="6" y="3" width="20" height="26" rx="3" fill="url(#ig-greyl)" stroke="#6f7f99" strokeWidth="0.8" />
      <rect x="9" y="6" width="14" height="6" rx="1" fill="#dff2df" stroke="#6f7f99" strokeWidth="0.6" />
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={r + '' + c} x={9 + c * 5} y={15 + r * 4.4} width="4" height="3.4" rx="0.8" fill={c === 2 ? '#f5a623' : '#fff'} stroke="#8a97ad" strokeWidth="0.4" />))}
    </>
  ),
  charmap: (
    <>
      <rect x="4" y="4" width="24" height="24" rx="2" fill="#fff" stroke="#6f86a8" strokeWidth="0.9" />
      <path d="M4 12 H28 M4 20 H28 M12 4 V28 M20 4 V28" stroke="#c5d3e8" strokeWidth="0.8" />
      <text x="16" y="19.5" textAnchor="middle" fontFamily="Georgia, serif" fontSize="12" fill="#2c6cc4">{'\u03a9'}</text>
      <text x="8" y="11" textAnchor="middle" fontFamily="Georgia, serif" fontSize="6" fill="#5b6886">a</text>
      <text x="24" y="27" textAnchor="middle" fontFamily="Georgia, serif" fontSize="6" fill="#5b6886">{'\u00e9'}</text>
    </>
  ),
  cards: (
    <>
      <rect x="4" y="6" width="15" height="21" rx="2" fill="#fff" stroke="#6f7f99" strokeWidth="0.8" transform="rotate(-12 11 16)" />
      <rect x="12" y="5" width="15" height="21" rx="2" fill="#fff" stroke="#6f7f99" strokeWidth="0.8" transform="rotate(8 19 15)" />
      <path d="M19.5 10 C17.5 13 16 14.5 16 16.5 A2 2 0 0 0 19.5 17.5 A2 2 0 0 0 23 16.5 C23 14.5 21.5 13 19.5 10 Z" fill="#d0442c" transform="rotate(8 19 15)" />
    </>
  ),
  paint: (
    <>
      <path d="M16 4 C8 4 3 9.5 3 16 C3 22 7.5 27 13 27 C15.5 27 15.5 24.5 14.5 23 C13.5 21.5 14 19.5 16.5 19.5 H20 C25 19.5 29 16.5 29 12.5 C29 7.5 23 4 16 4 Z" fill="#f4e6c8" stroke="#a88a5a" strokeWidth="0.8" />
      <circle cx="9" cy="14" r="2.3" fill="#d0442c" />
      <circle cx="13" cy="9" r="2.3" fill="#3d8ef0" />
      <circle cx="19.5" cy="8.5" r="2.3" fill="#4dbb3a" />
      <circle cx="24.5" cy="12.5" r="2.3" fill="#f5c542" />
    </>
  ),
  recycle: (
    <>
      <path d="M8 9 H24 L22.5 28 H9.5 Z" fill="url(#ig-greyl)" stroke="#6f7f99" strokeWidth="0.8" strokeLinejoin="round" />
      <ellipse cx="16" cy="9" rx="8.5" ry="2.5" fill="#dfe6f1" stroke="#6f7f99" strokeWidth="0.8" />
      <path d="M12.5 17 L16 13.5 L19.5 17 M16 13.5 V22" stroke="#2e9a24" strokeWidth="1.6" fill="none" />
    </>
  ),
}

// The shared gradients live once in the document (a 0 x 0 svg in <body>), not in every icon:
// url(#ig-...) references resolve document-wide.
function injectDefs() {
  if (typeof document === 'undefined' || document.getElementById('ig-defs')) return
  const grad = (id, [hi, mid, lo]) =>
    `<radialGradient id="${id}" cx="0.35" cy="0.3" r="0.85"><stop offset="0" stop-color="${hi}"/><stop offset="0.55" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></radialGradient>` +
    `<linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${mid}"/></linearGradient>`
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('id', 'ig-defs')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:hidden'
  svg.innerHTML = `<defs>${Object.entries({ 'ig-blue': G.blue, 'ig-red': G.red, 'ig-green': G.green, 'ig-yellow': G.yellow, 'ig-grey': G.grey })
    .map(([id, c]) => grad(id, c))
    .join('')}</defs>`
  document.body.appendChild(svg)
}
injectDefs()

export const Ico = memo(function Ico({ kind, size = 20, style }) {
  const isBig = kind in big
  const vb = isBig ? 32 : 24
  return (
    <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} style={{ display: 'block', overflow: 'visible', ...style }}>
      {isBig ? big[kind] : glyphs[kind] || null}
    </svg>
  )
})

export const hasIcon = (kind) => kind in big || kind in glyphs
