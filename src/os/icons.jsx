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

// a web page thumbnail (ofoto.com / yahoo.com / google.com): a glass page turned away to the right
// (perspective quad, its layout mapped through the same homography; the sites' own pages are not
// reproduced, only abstract blocks), a bright left edge and a soft light halo, fitted to the
// median of frames 800-1348.
const PAGES = {
  ofoto: (
    <>
      <defs>
        <linearGradient id="pgo-p" gradientUnits="userSpaceOnUse" x1="0.56" y1="1.88" x2="27.63" y2="26.56">
          <stop offset="0" stopColor="#a5cff2" />
          <stop offset="0.6" stopColor="#d6ecfd" />
          <stop offset="1" stopColor="#aed4f7" />
        </linearGradient>
      </defs>
      <path d="M0.56 1.88 L29.13 3.22 L27.63 26.56 L2.45 29.12 Z" fill="none" stroke="#28617e" strokeOpacity="0.14" strokeWidth="2.27" strokeLinejoin="round" />
      <path d="M0.56 1.88 L29.13 3.22 L27.63 26.56 L2.45 29.12 Z" fill="none" stroke="#28617e" strokeOpacity="0.28" strokeWidth="1.14" strokeLinejoin="round" />
      <path d="M0.56 1.88 L29.13 3.22 L27.63 26.56 L2.45 29.12 Z" fill="url(#pgo-p)" />
      <path d="M0.56 1.88 L29.13 3.22 L28.91 6.57 L0.84 5.86 Z" fill="#1861b3" />
      <path d="M0.56 1.88 L2.9 1.98 L3.11 5.62 L0.82 5.56 Z" fill="#0c316c" />
      <path d="M3.59 2.63 L5.84 2.73 L5.94 4.81 L3.71 4.74 Z" fill="#71c5ff" />
      <path d="M3.6 13.21 L3.56 11.58 L4.08 10.06 L5.09 8.89 L6.45 8.24 L7.94 8.21 L9.33 8.78 L10.44 9.86 L11.11 11.28 L11.28 12.84 L10.92 14.32 L9.49 13.56 L9.69 12.69 L9.59 11.78 L9.19 10.97 L8.55 10.35 L7.74 10.04 L6.89 10.06 L6.12 10.44 L5.55 11.1 L5.24 11.97 L5.26 12.9 Z" fill="#1861b3" />
      <path d="M6.22 14.4 L6.1 14.83 L5.73 15.15 L5.2 15.28 L4.67 15.18 L4.26 14.88 L4.09 14.45 L4.21 14.02 L4.59 13.69 L5.12 13.57 L5.66 13.68 L6.06 13.98 Z" fill="#1861b3" />
      <path d="M15.2 12.66 L18.67 12.62 L18.65 13.89 L15.2 13.95 Z" fill="#82a9e4" />
      <path d="M21.78 11.83 L24.28 11.81 L24.18 14.02 L21.71 14.07 Z" fill="#82a9e4" />
      <path d="M17.59 15.91 L20.41 15.82 L20.38 17.03 L17.57 17.14 Z" fill="#71c5ff" />
      <path d="M12.22 17.36 L16 17.21 L16 18.44 L12.24 18.61 Z" fill="#82a9e4" />
      <path d="M9.26 26.1 L9.11 26.59 L8.67 26.98 L8.06 27.16 L7.43 27.09 L6.95 26.79 L6.76 26.32 L6.91 25.82 L7.36 25.43 L7.98 25.24 L8.61 25.32 L9.08 25.63 Z" fill="#1861b3" />
      <path d="M18.36 24.39 L18.21 24.86 L17.8 25.23 L17.23 25.4 L16.67 25.33 L16.26 25.03 L16.11 24.58 L16.26 24.1 L16.68 23.73 L17.25 23.56 L17.82 23.64 L18.22 23.95 Z" fill="#1861b3" />
      <path d="M25.29 22.95 L25.13 23.4 L24.73 23.76 L24.21 23.92 L23.7 23.84 L23.33 23.55 L23.2 23.11 L23.36 22.65 L23.76 22.29 L24.29 22.13 L24.81 22.21 L25.17 22.51 Z" fill="#1861b3" />
      <path d="M1.01 1.88 L2.9 29.12" stroke="#ffffff" strokeOpacity="0.79" strokeWidth="0.9" />
    </>
  ),
  yahoo: (
    <>
      <defs>
        <linearGradient id="pgy-p" gradientUnits="userSpaceOnUse" x1="3.06" y1="4.88" x2="28.55" y2="29.5">
          <stop offset="0" stopColor="#f2fff8" />
          <stop offset="0.6" stopColor="#c8e5fc" />
          <stop offset="1" stopColor="#ddf1f8" />
        </linearGradient>
      </defs>
      <path d="M3.06 4.88 L28.83 6.69 L28.55 29.5 L2.95 31.62 Z" fill="none" stroke="#fefff2" strokeOpacity="0.17" strokeWidth="2.45" strokeLinejoin="round" />
      <path d="M3.06 4.88 L28.83 6.69 L28.55 29.5 L2.95 31.62 Z" fill="none" stroke="#fefff2" strokeOpacity="0.34" strokeWidth="1.23" strokeLinejoin="round" />
      <path d="M3.06 4.88 L28.83 6.69 L28.55 29.5 L2.95 31.62 Z" fill="url(#pgy-p)" />
      <path d="M5.14 6.89 L27.26 8.2 L27.23 10.06 L5.13 9.02 Z" fill="#c7e0fa" />
      <path d="M5.13 10.88 L14.33 11.21 L14.28 17.23 L5.1 17.24 Z" fill="#c7e0fa" />
      <path d="M16.16 11.28 L27.21 11.68 L27.2 13.07 L16.14 12.77 Z" fill="#bcdefb" />
      <path d="M16.13 14.01 L24.22 14.16 L24.21 15.11 L16.13 15 Z" fill="#c7e0fa" />
      <path d="M19.4 16.26 L21.35 16.27 L21.32 19.38 L19.37 19.41 Z" fill="#134cab" />
      <path d="M5.08 20.93 L14.78 20.72 L14.72 28.17 L5.04 28.83 Z" fill="#c7e0fa" />
      <path d="M16.84 21.66 L25.97 21.4 L25.96 22.33 L16.83 22.64 Z" fill="#c7e0fa" />
      <path d="M16.82 24.11 L24.11 23.8 L24.1 24.73 L16.81 25.09 Z" fill="#c7e0fa" />
      <path d="M22.92 25.73 L25.93 25.57 L25.91 27.41 L22.9 27.62 Z" fill="#bcdefb" />
      <path d="M3.51 4.88 L3.4 31.62" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="0.9" />
    </>
  ),
  google: (
    <>
      <defs>
        <linearGradient id="pgg-p" gradientUnits="userSpaceOnUse" x1="1.88" y1="4.67" x2="28.03" y2="28.56">
          <stop offset="0" stopColor="#cae8fe" />
          <stop offset="0.6" stopColor="#dfefff" />
          <stop offset="1" stopColor="#cddef2" />
        </linearGradient>
      </defs>
      <path d="M1.88 4.67 L27.19 6.88 L28.03 28.56 L2.05 31.27 Z" fill="none" stroke="#e3d7e9" strokeOpacity="0.11" strokeWidth="2.7" strokeLinejoin="round" />
      <path d="M1.88 4.67 L27.19 6.88 L28.03 28.56 L2.05 31.27 Z" fill="none" stroke="#e3d7e9" strokeOpacity="0.23" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M1.88 4.67 L27.19 6.88 L28.03 28.56 L2.05 31.27 Z" fill="url(#pgg-p)" />
      <path d="M10.63 8.34 L13.82 8.54 L13.88 11.4 L10.68 11.26 Z" fill="#a8cbf4" />
      <path d="M13.83 9.02 L17.37 9.23 L17.43 11.55 L13.88 11.4 Z" fill="#89b9f9" />
      <path d="M17.35 8.77 L20.7 8.99 L20.78 11.69 L17.43 11.55 Z" fill="#a8cbf4" />
      <path d="M6.47 13.37 L24.25 13.82 L24.29 15.15 L6.49 14.9 Z" fill="#adcef9" />
      <path d="M12.94 16.45 L19.02 16.46 L19.06 17.63 L12.96 17.67 Z" fill="#adcef9" />
      <path d="M5.07 20.86 L18.65 20.45 L18.67 21.16 L5.07 21.64 Z" fill="#adcef9" />
      <path d="M5.09 22.96 L22.27 22.18 L22.29 22.87 L5.1 23.75 Z" fill="#adcef9" />
      <path d="M5.11 25.07 L16.25 24.39 L16.26 25.12 L5.12 25.87 Z" fill="#adcef9" />
      <path d="M2.33 4.67 L2.5 31.27" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="0.9" />
    </>
  ),
}
export const PageIcon = ({ kind }) => svg(28, 32, PAGES[kind])

// "my music": two glass eighth notes (stems and flags are tubes, dark rim around a lit core; the
// heads are glossy with a specular spot), fitted to the median of frames 800-1348.
export const NotesIcon = () =>
  svg(
    26,
    30,
    <>
      <defs>
        <linearGradient id="mn-fl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#32a7e9" />
          <stop offset="1" stopColor="#1960a5" />
        </linearGradient>
        <radialGradient id="mn-h" cx="0.39" cy="0.19" r="0.8">
          <stop offset="0" stopColor="#94ddff" />
          <stop offset="0.29" stopColor="#5ebcff" />
          <stop offset="0.42" stopColor="#0c4992" />
          <stop offset="1" stopColor="#5bb5f6" />
        </radialGradient>
        <radialGradient id="mn-p">
          <stop offset="0" stopColor="#fff" stopOpacity="0.99" />
          <stop offset="0.45" stopColor="#f0fbff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#e0f4ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M7.8 3.92 C10.95 4.32 13.53 7.62 12.67 14.49 C11.03 11.33 9.81 8.46 7.8 9.06 Z" fill="url(#mn-fl)" stroke="#0c3a87" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7.8 4.22 L7.8 20.86" stroke="#0c3a87" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M7.8 4.22 L7.8 20.86" stroke="#42b4ee" strokeWidth="1.03" strokeLinecap="round" />
      <g transform="rotate(-10.25 6.27 21.86)">
        <ellipse cx="6.27" cy="21.86" rx="6.2" ry="5.05" fill="url(#mn-h)" stroke="#0c3a87" strokeWidth="1.3" strokeLinejoin="round" />
        <ellipse cx="4.19" cy="20.43" rx="1.88" ry="1.44" fill="url(#mn-p)" />
      </g>
      <path d="M18.02 6.52 C20.9 6.92 23.26 9.59 22.48 15.28 C21.28 12.45 19.85 10.59 18.02 11.19 Z" fill="url(#mn-fl)" stroke="#0c3a87" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M18.02 6.82 L18.02 22.77" stroke="#0c3a87" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M18.02 6.82 L18.02 22.77" stroke="#42b4ee" strokeWidth="1.03" strokeLinecap="round" />
      <g transform="rotate(-16.44 15.8 23.77)">
        <ellipse cx="15.8" cy="23.77" rx="5.74" ry="5.03" fill="url(#mn-h)" stroke="#0c3a87" strokeWidth="1.3" strokeLinejoin="round" />
        <ellipse cx="15.3" cy="21.26" rx="1.88" ry="1.44" fill="url(#mn-p)" />
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

// the title's equaliser glyph: four columns of glowing cells (3, 4, 2 and 3 high), drawn past
// its 13 x 10 box as the video shows it; fitted to the median of frames 800-1348.
export const TitleEq = () =>
  svg(
    13,
    10,
    <>
      <defs>
        <radialGradient id="eq-c" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#faf6fc" />
          <stop offset="1" stopColor="#badff5" />
        </radialGradient>
      </defs>
      <g fill="#b4ddf5" fillOpacity="0.25">
        <rect x="-1.31" y="8.5" width="4.84" height="3.68" rx="0.79" />
        <rect x="-1.31" y="5.18" width="4.84" height="3.68" rx="0.79" />
        <rect x="-1.31" y="1.86" width="4.84" height="3.68" rx="0.79" />
        <rect x="2.71" y="8.5" width="4.84" height="3.68" rx="0.79" />
        <rect x="2.71" y="5.18" width="4.84" height="3.68" rx="0.79" />
        <rect x="2.71" y="1.86" width="4.84" height="3.68" rx="0.79" />
        <rect x="2.71" y="-1.46" width="4.84" height="3.68" rx="0.79" />
        <rect x="6.73" y="8.5" width="4.84" height="3.68" rx="0.79" />
        <rect x="6.73" y="5.18" width="4.84" height="3.68" rx="0.79" />
        <rect x="10.75" y="8.5" width="4.84" height="3.68" rx="0.79" />
        <rect x="10.75" y="5.18" width="4.84" height="3.68" rx="0.79" />
        <rect x="10.75" y="1.86" width="4.84" height="3.68" rx="0.79" />
      </g>
      <g fill="url(#eq-c)">
        <rect x="-0.76" y="9.04" width="3.75" height="2.59" rx="0.25" />
        <rect x="-0.76" y="5.72" width="3.75" height="2.59" rx="0.25" />
        <rect x="-0.76" y="2.4" width="3.75" height="2.59" rx="0.25" />
        <rect x="3.26" y="9.04" width="3.75" height="2.59" rx="0.25" />
        <rect x="3.26" y="5.72" width="3.75" height="2.59" rx="0.25" />
        <rect x="3.26" y="2.4" width="3.75" height="2.59" rx="0.25" />
        <rect x="3.26" y="-0.92" width="3.75" height="2.59" rx="0.25" />
        <rect x="7.28" y="9.04" width="3.75" height="2.59" rx="0.25" />
        <rect x="7.28" y="5.72" width="3.75" height="2.59" rx="0.25" />
        <rect x="11.3" y="9.04" width="3.75" height="2.59" rx="0.25" />
        <rect x="11.3" y="5.72" width="3.75" height="2.59" rx="0.25" />
        <rect x="11.3" y="2.4" width="3.75" height="2.59" rx="0.25" />
      </g>
    </>,
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
