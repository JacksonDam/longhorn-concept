// The Longhorn boot screen, after builds 4015-4029 (the Plex era, spring 2003): the kernel's own
// boot bitmaps (ntoskrnl.exe BITMAP 1 = black 640x480 with the logo and the bar outline, BITMAP 4
// = the 22x9 group of three blue blocks; identical in 4015 and 4029) shown at 4:3, and its
// animation measured from a real 4015 boot recording (assets-src/longhorn-boot, SOURCES.md):
// logo and bar fade in from black over FADE s (a palette fade), then the blocks sweep through
// the bar: 18 positions STEP px apart in SWEEP s (80 ms each), clipped to the bar's inside, forever.
//
// Everything here is in the bitmap's 640x480 pixel space and plain strings, so the same artwork
// serves index.html (vite.config.js inlines it: on screen from the first paint, animated with
// compositor-only CSS while the bundle loads and the boot warms up) and the OS's own power-on
// (scenes/session/PowerScreens.jsx BootScreen: drawn from the clock like everything else).
// The flag is the XP flag's artwork (the four panes of public/img/desktop/flag.svg) in the
// bitmap's monochrome shading; the wordmark is Selawik fitted to the bitmap's letters
// (bootWordmark.js, tools/boot/wordmark.py).
import { LONGHORN, MICROSOFT, TM } from './bootWordmark.js'

export const FADE = 1.45 // s, logo and bar fade in
export const SWEEP = 1.44 // s per pass of the blocks
export const POSITIONS = 18 // per pass (80 ms each), the last one past the bar's end (hidden)
export const STEP = 8 // px between positions
export const BLOCKS_X0 = 243 // the group's left edge at the first position
export const INTERIOR = { x: 257, y: 354, w: 122, h: 9 } // where the blocks show (the bar's inside)
export const GROUP = { w: 22, h: 9 }

// group position (px from its first position) at s seconds into the sweep (s >= 0)
export const sweepOffset = (s) => STEP * Math.min(POSITIONS - 1, Math.floor(((s / SWEEP) % 1) * POSITIONS))

// the XP flag's four panes (flag units, desktop/flag.svg: clip paths XMLID_12_, _16_, _35_; the
// top-left pane is _16_ moved by the top-right pane's offset from the bottom-right one)
const PANES = [
  'M82.26 68.24C67.93 58.59 52.39 50.77 19.32 64.44L35.36 8.36c33.08-13.68 49.11-6.4 63.43 3.3l-16.53 56.57z',
  'M107.25 17.44c14.3 9.62 30.16 17.29 63.15 3.65L154.15 77.26c-27.54 12.92-49 6.28-63.28-3.4l16.39-56.42z',
  'M63.14 134.48C48.8 124.83 33.27 117.01 0.19 130.68L16.24 74.6c33.08-13.68 49.11-6.4 63.43 3.3l-16.53 56.57z',
  'M88.13 83.68c14.31 9.63 29.82 16.31 62.76 4.97l-15.7 54.58c-28.98 12.74-48.54 5.09-63.2-3.77L88.13 83.68z',
]
// flag units -> bitmap px (the bitmap's flag spans x 232-287, y 276-322)
const FLAG = 'translate(231.9 275.4) scale(0.3215)'

// the logo, the bar's outline: one SVG in the bitmap's 640x480 space (id: a prefix for its
// gradient ids, unique per copy in the document)
export const logoSVG = (id) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="100%" height="100%" style="position:absolute;left:0;top:0;overflow:visible">` +
  // each pane white, shading to grey towards the gap down the flag's middle (the bitmap's dither)
  `<defs><linearGradient id="${id}-l" x1="0" x2="1" y1="0" y2="0"><stop offset="0.5" stop-color="#efefef"/><stop offset="1" stop-color="#a9a9a9"/></linearGradient>` +
  `<linearGradient id="${id}-r" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#a9a9a9"/><stop offset="0.42" stop-color="#efefef"/></linearGradient></defs>` +
  `<g transform="${FLAG}">` +
  PANES.map((d, i) => `<path d="${d}" fill="url(#${id}-${i % 2 ? 'r' : 'l'})"/>`).join('') +
  `</g><g fill="#ededed"><path d="${MICROSOFT}"/><path d="${TM}"/><path d="${LONGHORN}"/></g>` +
  `<rect x="255.5" y="351.5" width="125" height="14" rx="2.5" fill="none" stroke="#b0b0b0"/>` +
  `<rect x="256.5" y="352.5" width="123" height="12" rx="1.5" fill="none" stroke="#404040"/></svg>`

// the three blocks (BITMAP 4: 6 px wide, 2 px apart, each with its own run of lighter rows)
const C = { a: '#2838c4', b: '#5878ec', c: '#849cf0' }
const ROWS = ['aaa', 'bbb', 'ccc', 'ccc', 'bbc', 'abb', 'aab', 'aaa', 'aaa']
export const BLOCKS_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 9" width="100%" height="100%" preserveAspectRatio="none" shape-rendering="crispEdges" style="position:absolute;left:0;top:0">` +
  ROWS.flatMap((r, y) => [...r].map((k, b) => `<rect x="${b * 8}" y="${y}" width="6" height="1" fill="${C[k]}"/>`)).join('') +
  `</svg>`

// index.html's copy: animated by CSS on the compositor (transform / opacity only), so it keeps
// moving while the main thread runs the bundle and the boot's warm-up. The page is fitted like the
// stage (core/Stage.jsx): the largest 4:3 box, centred. The whole screen is held at 0.999 opacity,
// like the boot black under it, so the compositor still draws the warm-up beneath it.
const pct = (v, of) => `${((v / of) * 100).toFixed(4)}%`
export const STATIC_CSS =
  `#lh-boot{position:fixed;inset:0;z-index:2147483000;background:#000;opacity:.999;pointer-events:none}` +
  `#lh-boot .f{position:absolute;left:50%;top:50%;width:min(100vw,133.3333vh);height:min(100vh,75vw);transform:translate(-50%,-50%)}` +
  `#lh-boot .l{position:absolute;inset:0;animation:lhb-fade ${FADE}s linear both}` +
  `#lh-boot .b{position:absolute;left:${pct(INTERIOR.x, 640)};top:${pct(INTERIOR.y, 480)};width:${pct(INTERIOR.w, 640)};height:${pct(INTERIOR.h, 480)};overflow:hidden}` +
  `#lh-boot .g{position:absolute;top:0;height:100%;left:${pct(BLOCKS_X0 - INTERIOR.x, INTERIOR.w)};width:${pct(GROUP.w, INTERIOR.w)};will-change:transform;` +
  `animation:lhb-sweep ${SWEEP}s steps(${POSITIONS},jump-none) ${FADE}s infinite,lhb-show 1ms ${FADE}s both}` +
  `@keyframes lhb-fade{from{opacity:0}to{opacity:1}}` +
  `@keyframes lhb-show{from{opacity:0}to{opacity:1}}` +
  `@keyframes lhb-sweep{from{transform:translateX(0)}to{transform:translateX(${(((POSITIONS - 1) * STEP) / GROUP.w) * 100}%)}}`
export const STATIC_HTML = `<div id="lh-boot" aria-hidden="true"><div class="f"><div class="l">${logoSVG('lhb')}</div><div class="b"><div class="g">${BLOCKS_SVG}</div></div></div></div>`
