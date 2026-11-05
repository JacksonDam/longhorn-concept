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

// Home: the MSN butterfly in white and blue glass (white sail wing, navy outer wing, glowing
// ball) over a glass bowl with a lit lower rim, fitted to the median of frames 800-1348.
export const HomeIcon = () =>
  svg(
    34,
    36,
    <>
      <defs>
        <radialGradient id="hm-b" cx="0.5" cy="0.45" r="0.5">
          <stop offset="0" stopColor="#19519f" stopOpacity="0.71" />
          <stop offset="1" stopColor="#619ff5" stopOpacity="0.71" />
        </radialGradient>
        <radialGradient id="hm-r" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#83b9ef" stopOpacity="0" />
          <stop offset="0.73" stopColor="#83b9ef" stopOpacity="0" />
          <stop offset="0.91" stopColor="#83b9ef" stopOpacity="0.72" />
          <stop offset="1" stopColor="#83b9ef" stopOpacity="0.22" />
        </radialGradient>
        <linearGradient id="hm-rv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.25" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.75" stopColor="#fff" />
        </linearGradient>
        <mask id="hm-rm" maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill="url(#hm-rv)" />
        </mask>
        <radialGradient id="hm-sd" gradientUnits="userSpaceOnUse" cx="26.25" cy="28.71" r="7.11">
          <stop offset="0" stopColor="#1c61b7" stopOpacity="0.86" />
          <stop offset="1" stopColor="#1c61b7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hm-d" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1074ca" />
          <stop offset="1" stopColor="#002062" />
        </linearGradient>
        <linearGradient id="hm-s" x1="0.2" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#f0f9f8" />
          <stop offset="1" stopColor="#8bc3ff" />
        </linearGradient>
        <radialGradient id="hm-c" gradientUnits="userSpaceOnUse" cx="23.38" cy="16.38" r="5.58">
          <stop offset="0" stopColor="#d9ecff" />
          <stop offset="0.34" stopColor="#d9ecff" />
          <stop offset="0.56" stopColor="#8dcbff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#8dcbff" stopOpacity="0" />
        </radialGradient>
        <clipPath id="hm-bc">
          <circle cx="19.25" cy="23.81" r="11.06" />
        </clipPath>
      </defs>
      <circle cx="19.25" cy="23.81" r="11.06" fill="url(#hm-b)" />
      <circle clipPath="url(#hm-bc)" cx="26.25" cy="28.71" r="7.11" fill="url(#hm-sd)" />
      <circle cx="19.25" cy="23.81" r="11.06" fill="url(#hm-r)" mask="url(#hm-rm)" />
      <path d="M0.4 6.35 Q3.83 15.59 12.38 20.5 Q8.34 11.78 0.4 6.35 Z" fill="url(#hm-d)" />
      <path d="M16.79 4.51 C10.4 5.51 9.4 8.2 9.9 10.2 C10.4 14.2 14.65 20.56 16.15 21.56 C17.65 17.56 18.67 12.44 18.37 9.44 C18.07 6.44 18.79 4.51 16.79 4.51 Z" fill="url(#hm-s)" />
      <circle cx="23.38" cy="16.38" r="5.58" fill="url(#hm-c)" />
    </>,
  )

// Search: a blue glass magnifier (light ring with a soft dark edge, lit lower crescent, short
// two-tone handle down-left), fitted to the median of frames 800-1348.
export const SearchIcon = () =>
  svg(
    50,
    26,
    <>
      <defs>
        <linearGradient id="se-r" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#e6ffff" />
          <stop offset="0.55" stopColor="#73bbfd" />
          <stop offset="1" stopColor="#c6d2eb" />
        </linearGradient>
        <linearGradient id="se-i" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#427bd0" stopOpacity="0.97" />
          <stop offset="1" stopColor="#70c1ff" stopOpacity="0.97" />
        </linearGradient>
        <radialGradient id="se-c">
          <stop offset="0" stopColor="#dffaff" />
          <stop offset="0.6" stopColor="#dffaff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#dffaff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="se-h" gradientUnits="userSpaceOnUse" x1="38.07" y1="18.3" x2="34.11" y2="13.08">
          <stop offset="0" stopColor="#74abf6" />
          <stop offset="0.5" stopColor="#0c4d99" />
          <stop offset="1" stopColor="#0c4d99" />
        </linearGradient>
        <clipPath id="se-lc">
          <circle cx="42.41" cy="9.91" r="6.27" />
        </clipPath>
      </defs>
      <path d="M36.09 15.69 L25.25 23.92" stroke="url(#se-h)" strokeWidth="3.27" strokeLinecap="round" />
      <path d="M35.25 14.57 L24.4 22.8" stroke="#74abf6" strokeOpacity="0.58" strokeWidth="0.9" strokeLinecap="round" />
      <circle cx="42.41" cy="9.91" r="8.34" fill="none" stroke="#2067a5" strokeOpacity="0.75" strokeWidth="1.06" />
      <circle cx="42.41" cy="9.91" r="7.81" fill="url(#se-r)" />
      <circle cx="42.41" cy="9.91" r="6.27" fill="url(#se-i)" />
      <ellipse clipPath="url(#se-lc)" cx="42.41" cy="14.42" rx="6.27" ry="2.97" fill="url(#se-c)" />
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

// Favorites: a pale blue glass star (bright body, rim lit at the top and blue below, soft
// inner glow), fitted to the median of frames 800-1348.
export const StarIcon = () =>
  svg(
    30,
    30,
    <>
      <defs>
        <radialGradient id="st-b" gradientUnits="userSpaceOnUse" cx="15.26" cy="18.92" r="14.69">
          <stop offset="0" stopColor="#f4fffd" />
          <stop offset="0.26" stopColor="#b7d6fe" />
          <stop offset="1" stopColor="#84c6ff" />
        </radialGradient>
        <linearGradient id="st-o" gradientUnits="userSpaceOnUse" x1="0" y1="1.29" x2="0" y2="27.73">
          <stop offset="0" stopColor="#feffff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#66caec" stopOpacity="0.8" />
        </linearGradient>
        <radialGradient id="st-h">
          <stop offset="0" stopColor="#f9ffff" stopOpacity="0.68" />
          <stop offset="1" stopColor="#f9ffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M14.91 2.04 Q15.19 1.29 15.47 2.04 L18.88 10.95 L28.41 11.34 Q29.2 11.38 28.59 11.88 L21.17 17.87 L23.73 27.06 Q23.95 27.82 23.28 27.39 L15.29 22.19 L7.35 27.47 Q6.68 27.91 6.89 27.14 L9.37 17.93 L1.89 12.01 Q1.27 11.51 2.06 11.47 L11.59 10.98 Z" fill="url(#st-b)" stroke="url(#st-o)" strokeWidth="0.69" strokeLinejoin="round" />
      <clipPath id="st-sc">
        <path d="M14.91 2.04 Q15.19 1.29 15.47 2.04 L18.88 10.95 L28.41 11.34 Q29.2 11.38 28.59 11.88 L21.17 17.87 L23.73 27.06 Q23.95 27.82 23.28 27.39 L15.29 22.19 L7.35 27.47 Q6.68 27.91 6.89 27.14 L9.37 17.93 L1.89 12.01 Q1.27 11.51 2.06 11.47 L11.59 10.98 Z" />
      </clipPath>
      <ellipse clipPath="url(#st-sc)" cx="14.26" cy="11.98" rx="6.85" ry="5.14" fill="url(#st-h)" />
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
