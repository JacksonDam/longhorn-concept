// Hand-drawn SVG icons for the my Music window, matched to the reference frames.
// Each icon is drawn in its own small viewBox and placed by the caller.

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
// Back / forward: two glass orbs sunk in a well pressed into the toolbar (the hull of a circle
// around each orb). The well's top wall is in shadow (a feathered dark edge above it), its floor
// brightens to a lit lower lip; each orb has a soft dark outline, a body lit from the upper right,
// a fresnel rim, a top cap and (back) a caustic low left. Fitted to the median of frames 800-1348
// (tools: docs/music-spec.md "Toolbar icons"); gradients only, no filters.
export const BackForward = () =>
  svg(
    60,
    40,
    <>
      <defs>
        <linearGradient id="bf-w" gradientUnits="userSpaceOnUse" x1="0" y1="6.41" x2="0" y2="36.74">
          <stop offset="0" stopColor="#3e79cb" />
          <stop offset="0.51" stopColor="#477bca" />
          <stop offset="0.76" stopColor="#7eaded" />
          <stop offset="1" stopColor="#81ace6" />
        </linearGradient>
        <linearGradient id="bf-se" gradientUnits="userSpaceOnUse" x1="0" y1="3.41" x2="0" y2="36.74">
          <stop offset="0" stopColor="#3e79cb" stopOpacity="0.15" />
          <stop offset="0.5" stopColor="#3e79cb" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="bf-ad" gradientUnits="userSpaceOnUse" x1="22.13" y1="0" x2="24.87" y2="0">
          <stop offset="0" stopColor="#3264bc" stopOpacity="0.63" />
          <stop offset="1" stopColor="#3264bc" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="bf-k" gradientUnits="userSpaceOnUse" cx="15.31" cy="33.59" r="8.63">
          <stop offset="0" stopColor="#9ac7ff" stopOpacity="0.96" />
          <stop offset="1" stopColor="#9ac7ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bf-a" gradientUnits="userSpaceOnUse" x1="15.41" y1="0" x2="22.13" y2="0">
          <stop offset="0" stopColor="#ccf6ff" />
          <stop offset="1" stopColor="#aec6ec" />
        </linearGradient>
        <radialGradient id="bf-oB" cx="0.5" cy="0.5" r="0.5" fx="0.94" fy="0.27">
          <stop offset="0" stopColor="#d4d9e3" />
          <stop offset="0.25" stopColor="#acccf2" />
          <stop offset="1" stopColor="#336fcd" />
        </radialGradient>
        <radialGradient id="bf-oR">
          <stop offset="0" stopColor="#c0e4ff" stopOpacity="0" />
          <stop offset="0.66" stopColor="#c0e4ff" stopOpacity="0" />
          <stop offset="0.93" stopColor="#c0e4ff" stopOpacity="0.66" />
          <stop offset="1" stopColor="#c0e4ff" stopOpacity="0.26" />
        </radialGradient>
        <linearGradient id="bf-oH" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eaf9ff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#eaf9ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="bf-oD">
          <stop offset="0.83" stopColor="#2a60bc" stopOpacity="0" />
          <stop offset="0.9" stopColor="#2a60bc" stopOpacity="0.91" />
          <stop offset="0.94" stopColor="#2a60bc" stopOpacity="0.91" />
          <stop offset="1" stopColor="#2a60bc" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bf-oD2">
          <stop offset="0.83" stopColor="#639be1" stopOpacity="0" />
          <stop offset="0.9" stopColor="#639be1" stopOpacity="0.91" />
          <stop offset="0.94" stopColor="#639be1" stopOpacity="0.91" />
          <stop offset="1" stopColor="#639be1" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bf-oV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="bf-ov" maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill="url(#bf-oV)" />
        </mask>
        <radialGradient id="bf-fB" cx="0.5" cy="0.5" r="0.5" fx="0.3" fy="0.37">
          <stop offset="0" stopColor="#003eb0" />
          <stop offset="0.83" stopColor="#6b96da" />
          <stop offset="1" stopColor="#1040ce" />
        </radialGradient>
        <radialGradient id="bf-fR">
          <stop offset="0" stopColor="#aae2ff" stopOpacity="0" />
          <stop offset="0.68" stopColor="#aae2ff" stopOpacity="0" />
          <stop offset="0.93" stopColor="#aae2ff" stopOpacity="0.81" />
          <stop offset="1" stopColor="#aae2ff" stopOpacity="0.32" />
        </radialGradient>
        <linearGradient id="bf-fH" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8e5ff" stopOpacity="0.69" />
          <stop offset="1" stopColor="#b8e5ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="bf-fD">
          <stop offset="0.69" stopColor="#3974ce" stopOpacity="0" />
          <stop offset="0.81" stopColor="#3974ce" stopOpacity="0.73" />
          <stop offset="0.88" stopColor="#3974ce" stopOpacity="0.73" />
          <stop offset="1" stopColor="#3974ce" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bf-fD2">
          <stop offset="0.69" stopColor="#5184d0" stopOpacity="0" />
          <stop offset="0.81" stopColor="#5184d0" stopOpacity="0.73" />
          <stop offset="0.88" stopColor="#5184d0" stopOpacity="0.73" />
          <stop offset="1" stopColor="#5184d0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bf-fV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="bf-fv" maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill="url(#bf-fV)" />
        </mask>
        <clipPath id="bf-oc">
          <circle cx="20.74" cy="21.3" r="12.84" />
        </clipPath>
      </defs>
      <path d="M22.25,2.2 L51.65,7.79 A11.57 11.57 0 0 1 51.22,30.59 L21.63,35.06 A16.67 16.67 0 1 1 22.25,2.2 Z" fill="url(#bf-se)" />
      <path d="M22.15,3.69 L51.55,9.28 A11.07 11.07 0 0 1 51.14,31.09 L21.55,35.56 A16.17 16.17 0 1 1 22.15,3.69 Z" fill="url(#bf-se)" />
      <path d="M22.06,5.18 L51.46,10.77 A10.57 10.57 0 0 1 51.07,31.6 L21.48,36.07 A15.67 15.67 0 1 1 22.06,5.18 Z" fill="url(#bf-se)" />
      <path d="M21.97,6.67 L51.37,12.26 A10.07 10.07 0 0 1 50.99,32.1 L21.4,36.57 A15.17 15.17 0 1 1 21.97,6.67 Z" fill="url(#bf-w)" />
      <circle cx="20.74" cy="21.3" r="12.84" fill="url(#bf-oB)" />
      <circle clipPath="url(#bf-oc)" cx="15.31" cy="33.59" r="8.63" fill="url(#bf-k)" />
      <circle cx="20.74" cy="21.3" r="12.84" fill="url(#bf-oR)" />
      <ellipse cx="20.74" cy="13.52" rx="11.04" ry="5.05" fill="url(#bf-oH)" />
      <circle cx="20.74" cy="21.3" r="14.52" fill="url(#bf-oD2)" />
      <circle cx="20.74" cy="21.3" r="14.52" fill="url(#bf-oD)" mask="url(#bf-ov)" />
      <path d="M15.41 21.86 L22.13 16.61 L22.13 27.11 Z" fill="url(#bf-a)" />
      <rect x="22.13" y="16.61" width="2.74" height="10.5" fill="url(#bf-ad)" />
      <circle cx="49.13" cy="21.83" r="7.12" fill="url(#bf-fB)" />
      <circle cx="49.13" cy="21.83" r="7.12" fill="url(#bf-fR)" />
      <ellipse cx="49.13" cy="19.7" rx="6.12" ry="4.98" fill="url(#bf-fH)" />
      <circle cx="49.13" cy="21.83" r="9.06" fill="url(#bf-fD2)" />
      <circle cx="49.13" cy="21.83" r="9.06" fill="url(#bf-fD)" mask="url(#bf-fv)" />
      <path d="M52.17 22 L46.96 18.3 L46.96 25.7 Z" fill="#c2e7fe" />
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

// "my music": two glass eighth notes (stems and flags are tubes, dark rim around a lit core; the
// heads are glossy with a specular spot), fitted to the median of frames 800-1348.
export const NotesIcon = () =>
  svg(
    26,
    30,
    <>
      <defs>
        <linearGradient id="mn-fl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38b9f5" />
          <stop offset="1" stopColor="#1a70be" />
        </linearGradient>
        <radialGradient id="mn-h" cx="0.4" cy="0.19" r="0.8">
          <stop offset="0" stopColor="#9ee0ff" />
          <stop offset="0.3" stopColor="#5ebeff" />
          <stop offset="0.41" stopColor="#0f4992" />
          <stop offset="1" stopColor="#58b0f5" />
        </radialGradient>
        <radialGradient id="mn-p">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.45" stopColor="#f0fbff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#e0f4ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M7.86 4.22 C11.1 4.62 13.74 7.97 12.86 14.94 C12.27 10.65 9.92 7.61 7.86 8.21 Z" fill="url(#mn-fl)" stroke="#0c3a87" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7.86 4.52 L7.86 21.11" stroke="#0c3a87" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M7.86 4.52 L7.86 21.11" stroke="#40b3ee" strokeWidth="0.97" strokeLinecap="round" />
      <g transform="rotate(-7.81 5.82 22.11)">
        <ellipse cx="5.82" cy="22.11" rx="6.05" ry="4.9" fill="url(#mn-h)" stroke="#0c3a87" strokeWidth="1.3" strokeLinejoin="round" />
        <ellipse cx="4.35" cy="20.36" rx="1.69" ry="1.3" fill="url(#mn-p)" />
      </g>
      <path d="M18.02 6.52 C20.9 6.92 23.26 9.59 22.48 15.28 C21.95 11.78 19.85 10.11 18.02 10.71 Z" fill="url(#mn-fl)" stroke="#0c3a87" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M18.02 6.82 L18.02 22.52" stroke="#0c3a87" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M18.02 6.82 L18.02 22.52" stroke="#40b3ee" strokeWidth="0.97" strokeLinecap="round" />
      <g transform="rotate(-16.44 15.77 23.52)">
        <ellipse cx="15.77" cy="23.52" rx="5.75" ry="5.03" fill="url(#mn-h)" stroke="#0c3a87" strokeWidth="1.3" strokeLinejoin="round" />
        <ellipse cx="14.86" cy="21.74" rx="1.69" ry="1.3" fill="url(#mn-p)" />
      </g>
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

// minimise / maximise / close, measured from f800 (placed at window-local 723, 7)
export const WinButtons = () =>
  svg(
    43,
    10,
    <g fill="none" stroke="#b9d5ff" opacity="0.92">
      <path d="M1.5 7.2 H7.5" strokeWidth="2.2" />
      <rect x="17.6" y="1.4" width="8.3" height="6.6" strokeWidth="1.2" />
      <path d="M17.6 2.1 H25.9" strokeWidth="2" />
      <path d="M33.6 1 L40.6 8.6 M40.6 1 L33.6 8.6" strokeWidth="1.9" />
    </g>,
  )

export * from './taskIcons.jsx'

export const DropArrow = ({ c = '#4c79c0' }) => svg(7, 4, <path d="M0 0 L7 0 L3.5 4 Z" fill={c} />)
