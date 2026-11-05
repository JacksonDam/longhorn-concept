// Hand-drawn SVG icons for the my Music window, matched to the reference frames.
// Each icon is drawn in its own small viewBox and placed by the caller.
import { asset } from '../../core/preload.js'

const svg = (w, h, children, style) => (
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', overflow: 'visible', ...style }}>
    {children}
  </svg>
)

// Mirror reflection under a toolbar icon: the same drawing flipped, faded downwards.
export function Reflected({ x, y, w, h, gap = 1, depth = 12, op = 0.35, children }) {
  return (
    <>
      <div style={{ position: 'absolute', left: x, top: y, width: w, height: h }}>{children}</div>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y + h + gap,
          width: w,
          height: h,
          transform: 'scaleY(-1)',
          opacity: op,
          WebkitMaskImage: `linear-gradient(to top, #000 0, transparent ${depth}px)`,
          maskImage: `linear-gradient(to top, #000 0, transparent ${depth}px)`,
        }}
      >
        {children}
      </div>
    </>
  )
}

// ---------------------------------------------------------------- toolbar row
export const BackForward = () =>
  svg(
    60,
    40,
    <>
      <defs>
        <radialGradient id="mw-bf" cx="0.45" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#d4e6ff" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="#8cb6f0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#3f78cc" stopOpacity="0.5" />
        </radialGradient>
        <linearGradient id="mw-bfbase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {/* the pill that joins both buttons */}
      <path d="M8 22 C8 30 14 36 24 36 L44 36 C52 36 56 31 56 27 C56 23 52 21 48 23 C44 26 40 28 34 28 L22 28 Z" fill="url(#mw-bfbase)" />
      <path d="M8 22 C8 30 14 36 24 36 L44 36 C52 36 56 31 56 27" fill="none" stroke="#dcebff" strokeOpacity="0.45" strokeWidth="1.2" />
      <circle cx="22" cy="20" r="12.5" fill="url(#mw-bf)" stroke="#e8f2ff" strokeOpacity="0.55" strokeWidth="1" />
      <ellipse cx="21" cy="14" rx="8" ry="4.5" fill="#fff" opacity="0.35" />
      <circle cx="44" cy="21" r="8" fill="url(#mw-bf)" stroke="#e8f2ff" strokeOpacity="0.5" strokeWidth="1" />
      <ellipse cx="43.5" cy="17" rx="5" ry="2.8" fill="#fff" opacity="0.3" />
      <path d="M15.5 20 L21 15.5 L21 24.5 Z" fill="#eef5ff" opacity="0.8" />
      <path d="M47 21 L42.5 17.5 L42.5 24.5 Z" fill="#eef5ff" opacity="0.75" />
    </>,
  )

export const HomeIcon = () =>
  svg(
    34,
    36,
    <>
      <defs>
        <radialGradient id="mw-bowl" cx="0.5" cy="0.35" r="0.65">
          <stop offset="0" stopColor="#bcd8ff" stopOpacity="0.6" />
          <stop offset="0.7" stopColor="#5d95e6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#dcebff" stopOpacity="0.9" />
        </radialGradient>
        <linearGradient id="mw-wing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d4e8ff" />
        </linearGradient>
      </defs>
      {/* glass bowl */}
      <circle cx="19" cy="25" r="10" fill="url(#mw-bowl)" />
      <ellipse cx="19" cy="19" rx="7" ry="3" fill="#fff" opacity="0.3" />
      <path d="M10 27 A9.5 9.5 0 0 0 28 27" fill="none" stroke="#f2f8ff" strokeOpacity="0.8" strokeWidth="1.3" />
      {/* butterfly wings */}
      <path d="M1 7 C5 6 10 9 13 14 L12 17 C8 13 4 10 1 7 Z" fill="#1d4f9a" opacity="0.85" />
      <path d="M11 4 C13 1 17 0 18 2 L17 18 C14 15 12 12 11 9 Z" fill="url(#mw-wing)" />
      <path d="M13 14 L17 19 L15 20 Z" fill="#244e8c" opacity="0.7" />
      <circle cx="24" cy="11" r="3.2" fill="#e8f3ff" />
      <circle cx="23.3" cy="10.2" r="1.3" fill="#fff" />
    </>,
  )

export const SearchIcon = () =>
  svg(
    50,
    26,
    <>
      <defs>
        <radialGradient id="mw-lens" cx="0.5" cy="0.65" r="0.6">
          <stop offset="0" stopColor="#e2f1ff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#8cbcf2" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <line x1="31" y1="14" x2="2" y2="24" stroke="#0d3d86" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="30" y1="13.3" x2="3" y2="22.6" stroke="#5a92de" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
      <circle cx="38.5" cy="9.5" r="8.4" fill="url(#mw-lens)" stroke="#eef6ff" strokeWidth="1.9" />
      <ellipse cx="38.5" cy="13" rx="6" ry="3" fill="#fff" opacity="0.5" />
    </>,
  )

// a web page thumbnail (ofoto.com / yahoo.com / google.com)
export function PageIcon({ kind }) {
  return svg(
    28,
    32,
    <>
      <defs>
        <linearGradient id={`mw-page-${kind}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d8e6f6" />
        </linearGradient>
      </defs>
      <rect x="1" y="2" width="26" height="29" fill={`url(#mw-page-${kind})`} />
      <rect x="1" y="2" width="26" height="29" fill="none" stroke="#a9c4e8" strokeWidth="0.6" />
      {kind === 'ofoto' && (
        <>
          <rect x="1" y="1" width="26" height="2.2" fill="#1b4f9a" />
          <rect x="1" y="1" width="3" height="3" fill="#0b2a5e" />
          <path d="M5 12 C6 8 11 8 12 11" stroke="#163c78" strokeWidth="1.8" fill="none" />
          <circle cx="7" cy="12.5" r="1.1" fill="#163c78" />
          <rect x="15" y="10" width="3" height="2" fill="#8aa9d6" />
          <rect x="21" y="9" width="3" height="3" fill="#9db6dc" />
          <rect x="18" y="15" width="3" height="2" fill="#7d9cc8" />
          <rect x="11" y="16" width="4" height="2" fill="#a7bfe0" />
          <circle cx="6" cy="27" r="1.6" fill="#163c78" />
          <circle cx="15" cy="26" r="1.6" fill="#163c78" />
          <circle cx="24" cy="25" r="1.6" fill="#163c78" />
        </>
      )}
      {kind === 'yahoo' && (
        <>
          <rect x="3" y="4" width="22" height="3" fill="#9bb6dd" />
          <rect x="3" y="9" width="9" height="8" fill="#b9cde8" />
          <rect x="14" y="9" width="11" height="2" fill="#a8bfe2" />
          <rect x="14" y="13" width="8" height="1.5" fill="#b3c8e6" />
          <rect x="17" y="15" width="3" height="3" fill="#1b3f7a" />
          <rect x="3" y="20" width="10" height="9" fill="#c5d6ee" />
          <path d="M5 26 L8 21 L11 26" stroke="#6f8fc0" strokeWidth="1" fill="none" />
          <rect x="15" y="21" width="9" height="1.5" fill="#b3c8e6" />
          <rect x="15" y="24" width="7" height="1.5" fill="#b3c8e6" />
        </>
      )}
      {kind === 'google' && (
        <>
          <rect x="9" y="7" width="10" height="3" fill="#9fb8de" />
          <rect x="5" y="13" width="18" height="2" fill="#c3d4ec" />
          <rect x="11" y="17" width="6" height="1.6" fill="#b0c6e6" />
          <rect x="4" y="21" width="14" height="1" fill="#c9d8ee" />
          <rect x="4" y="23" width="18" height="1" fill="#c9d8ee" />
          <rect x="4" y="25" width="12" height="1" fill="#c9d8ee" />
        </>
      )}
    </>,
  )
}

export const NotesIcon = () =>
  svg(
    26,
    30,
    <>
      <defs>
        <linearGradient id="mw-note" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a5fb0" />
          <stop offset="1" stopColor="#0a2a66" />
        </linearGradient>
      </defs>
      <path d="M8 3 L9 21" stroke="#0c2c66" strokeWidth="2.4" />
      <path d="M18 5 L18.5 21" stroke="#0c2c66" strokeWidth="2.4" />
      <path d="M8 3 C10 4 13 8 13 12 C12 9 10 8 8.5 8" fill="#0f3a7a" stroke="#0c2c66" strokeWidth="1" />
      <path d="M18 5 C21 6 24 9 23 13 C22 10 20 9 18.5 9" fill="#0f3a7a" stroke="#0c2c66" strokeWidth="1" />
      <ellipse cx="6" cy="22" rx="5" ry="4" fill="url(#mw-note)" stroke="#071f4f" strokeWidth="1.2" />
      <ellipse cx="15.5" cy="22.5" rx="5" ry="4" fill="url(#mw-note)" stroke="#071f4f" strokeWidth="1.2" />
      <ellipse cx="5" cy="21" rx="2.2" ry="1.4" fill="#9fc4ff" opacity="0.8" />
      <ellipse cx="14.5" cy="21.5" rx="2.2" ry="1.4" fill="#9fc4ff" opacity="0.8" />
    </>,
  )

export const StarIcon = () =>
  svg(
    30,
    30,
    <>
      <defs>
        <linearGradient id="mw-star" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#f2f8ff" />
          <stop offset="0.5" stopColor="#b8d6fb" />
          <stop offset="1" stopColor="#7fb0ee" />
        </linearGradient>
      </defs>
      <path
        d="M15 1 L18.6 11 L29 11.2 L20.6 17.6 L23.7 28 L15 21.8 L6.3 28 L9.4 17.6 L1 11.2 L11.4 11 Z"
        fill="url(#mw-star)"
        stroke="#e6f1ff"
        strokeOpacity="0.7"
        strokeWidth="0.8"
      />
      <path d="M15 1 L15 21.8 L6.3 28 L9.4 17.6 L1 11.2 L11.4 11 Z" fill="#fff" opacity="0.25" />
    </>,
  )

export const TitleEq = () =>
  svg(
    13,
    10,
    <g fill="#e2f1ff">
      {[3, 5, 4, 2, 4, 5].map((n, i) =>
        Array.from({ length: n }, (_, j) => <rect key={i + '-' + j} x={i * 2.1} y={9 - j * 1.9} width="1.6" height="1.4" />),
      )}
    </g>,
  )

export const WinButtons = () =>
  svg(
    36,
    12,
    <g stroke="#c9dcf7" strokeWidth="1.6" fill="none" opacity="0.9">
      <path d="M1 9.5 H7" strokeWidth="2.2" />
      <rect x="14" y="1.5" width="8.5" height="8" strokeWidth="1.3" />
      <path d="M14 2.6 H22.5" strokeWidth="2.2" />
      <path d="M27.5 1.5 L34.5 9.5 M34.5 1.5 L27.5 9.5" strokeWidth="1.8" />
    </g>,
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

export const DropArrow = ({ c = '#4c79c0' }) => svg(7, 4, <path d="M0 0 L7 0 L3.5 4 Z" fill={c} />)
