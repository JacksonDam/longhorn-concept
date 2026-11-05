// The command-row, task-pane and header-button icons of the my Music window (re-exported by
// os/icons.jsx). Each icon is drawn in its own small viewBox and placed by the caller.
import { asset } from '../core/preload.js'

const svg = (w, h, children, style) => (
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', overflow: 'visible', ...style }}>
    {children}
  </svg>
)

// ---------------------------------------------------------------- command row
export const HideTasksIcon = () =>
  svg(
    14,
    14,
    <>
      <circle cx="7" cy="7" r="6.4" fill="#f4f8ff" stroke="#a9c4ea" strokeWidth="0.6" />
      <path d="M4 6 L7 9 L10 6 Z" fill="#3e66a6" />
    </>,
  )

export const UpFolderIcon = () =>
  svg(
    20,
    20,
    <>
      <path d="M1 6 L7 6 L8.5 8 L16 8 L16 18 L1 18 Z" fill="#e7b82e" />
      <path d="M2 10 L18 10 L15 18.5 L1 18.5 Z" fill="#f8d65a" />
      <path d="M2 10 L18 10" stroke="#fff3b0" strokeWidth="0.8" />
      <path d="M9 13 L9 6 L6.5 6 L10.5 1 L14.5 6 L12 6 L12 13 Z" fill="#3fae2a" stroke="#1d6e14" strokeWidth="0.6" />
    </>,
  )

export const FolderIcon = ({ size = 20 }) => (
  <img
    src={asset('img/music/folder.png')}
    width={size}
    height={size}
    style={{ position: 'absolute', left: 0, top: 0 }}
    alt=""
    draggable={false}
  />
)

export const FindIcon = () => (
  <img
    src={asset('img/music/find.png')}
    width={24}
    height={24}
    style={{ position: 'absolute', left: 0, top: 0, transform: 'scaleX(-1)' }}
    alt=""
    draggable={false}
  />
)

export const PreviewIcon = () =>
  svg(
    18,
    18,
    <>
      <rect x="1" y="1" width="16" height="16" rx="1.5" fill="#f2f6fc" stroke="#2c5ca8" strokeWidth="1" />
      <rect x="1.5" y="1.5" width="15" height="4" fill="#2a63c4" />
      <rect x="3" y="2.5" width="12" height="1.6" fill="#f7cf3a" />
      {[0, 1, 2, 3].map((i) =>
        [0, 1, 2].map((j) => <rect key={i + '' + j} x={3 + i * 3.2} y={7.5 + j * 3} width="2.2" height="2" fill="#5b82c4" />),
      )}
    </>,
  )

// ---------------------------------------------------------------- left pane
export const PlayAllIcon = () =>
  svg(
    18,
    18,
    <>
      <defs>
        <radialGradient id="mw-pa" cx="0.6" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#c9d4f4" />
          <stop offset="0.6" stopColor="#5a64b8" />
          <stop offset="1" stopColor="#2a2c7a" />
        </radialGradient>
      </defs>
      <circle cx="9" cy="9" r="8" fill="url(#mw-pa)" />
      <circle cx="9" cy="9" r="2" fill="#e6ecff" />
      <circle cx="6" cy="12" r="4.2" fill="#3c9a3a" />
      <path d="M4.5 9.8 L8.6 12 L4.5 14.2 Z" fill="#d8ffd0" />
    </>,
  )

export const PlaySelectedIcon = () =>
  svg(
    16,
    18,
    <>
      <path d="M1.5 1 L10.5 1 L14.5 5 L14.5 17 L1.5 17 Z" fill="#e3ebfb" stroke="#4e6fae" strokeWidth="1" />
      <path d="M10.5 1 L10.5 5 L14.5 5" fill="#b8c9ec" stroke="#4e6fae" strokeWidth="0.8" />
    </>,
  )

export const PlaylistIcon = () =>
  svg(
    20,
    18,
    <>
      <ellipse cx="10" cy="14" rx="9" ry="3.5" fill="#9aa0a8" />
      <ellipse cx="10" cy="13" rx="8" ry="3" fill="#d8dce2" />
      <circle cx="10" cy="7" r="5.5" fill="#c9ced6" stroke="#8a9098" strokeWidth="0.8" />
      <circle cx="10" cy="7" r="1.6" fill="#f4f6f8" />
      <path d="M6.5 4.5 A4 4 0 0 1 12 3.2" stroke="#fff" strokeWidth="1" fill="none" />
    </>,
  )

// ---------------------------------------------------------------- header buttons
export const SpeakerIcon = () =>
  svg(
    30,
    36,
    <>
      <defs>
        <linearGradient id="mw-spk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b3f9a" />
          <stop offset="0.45" stopColor="#c6c9dc" />
          <stop offset="1" stopColor="#5a5d6e" />
        </linearGradient>
        <radialGradient id="mw-cone" cx="0.4" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#8a8c98" />
          <stop offset="1" stopColor="#24262e" />
        </radialGradient>
      </defs>
      <path d="M3 12 L9 12 L19 2 L19 34 L9 24 L3 24 Z" fill="url(#mw-spk)" />
      <ellipse cx="19" cy="18" rx="8" ry="16" fill="url(#mw-cone)" stroke="#d6d8e4" strokeWidth="1.4" />
      <ellipse cx="19.5" cy="18" rx="3" ry="6" fill="#4a4c58" />
      <ellipse cx="17" cy="10" rx="2" ry="4" fill="#fff" opacity="0.4" />
    </>,
  )

export const DiscIcon = () =>
  svg(
    32,
    32,
    <>
      <defs>
        <radialGradient id="mw-disc" cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#c9ced8" />
          <stop offset="1" stopColor="#8e96a6" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#mw-disc)" stroke="#b6bcc8" strokeWidth="0.8" />
      <circle cx="16" cy="13" r="5" fill="#b0b6c2" stroke="#9aa0ac" strokeWidth="0.8" />
      <circle cx="16" cy="13" r="1.6" fill="#eef0f4" />
      <rect x="8" y="20" width="16" height="5" rx="1" fill="#2a2c34" />
      <text x="16" y="24.2" fontSize="5" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="Arial, sans-serif">
        DVD
      </text>
    </>,
  )

export const ShareIcon = () =>
  svg(
    40,
    30,
    <>
      <defs>
        <radialGradient id="mw-share" cx="0.45" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#c8c8d4" />
          <stop offset="1" stopColor="#5c5c6c" />
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="15" rx="19" ry="13" fill="url(#mw-share)" />
      <ellipse cx="20" cy="15" rx="5" ry="4" fill="#9a9aa8" />
      {[
        [20, 5],
        [9, 13],
        [31, 13],
        [20, 24],
        [12, 22],
        [28, 22],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="4" ry="2.8" fill="#4a4a58" stroke="#d0d0dc" strokeWidth="0.6" />
      ))}
    </>,
  )

export const PreviewCircle = () =>
  svg(
    11,
    11,
    <>
      <circle cx="5.5" cy="5.5" r="4.8" fill="#fff" stroke="#8aa6d0" strokeWidth="0.9" />
      <path d="M3.4 4.6 L5.5 6.8 L7.6 4.6 Z" fill="#5a78a8" />
    </>,
  )
