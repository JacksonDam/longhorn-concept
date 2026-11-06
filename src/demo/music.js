// Demo input for the music scene: [{ frame, type, ...data }], frames are 1-based video frames.
// 'music.open' (693.5) and 'music.restore' (1402.6) come from the desktop scene's demo.
import { withPrepares } from '../apps/lib/benchScript.js'

const VIDEO = [
  // the Tweet tile (row 2, column 3) is clicked; the header turns into its album page 22.5 frames later
  { frame: 945.5, type: 'music.album', id: 10 },
  // title-bar minimise (the pointer reaches the button first: the window prepares its copies)
  { frame: 1344, type: 'win.prepare', id: 'music' },
  { frame: 1354.5, type: 'music.minimize' },
]

// ?wmbench: scripted window-system input after the video's end (frames 1540-1960), so
// tools/bench.mjs can step and measure it: open a second window, drag it, maximise and restore
// it, minimise / restore, change my Music's page, view and scroll, close and reopen windows.
// ui-kit ids of the my Music window opened by the demo (wid(): `${id}@${openedAt}/${name}`)
const mid = (name) => `music@${((693.5 - 1) * 1001) / 30000}/${name}`
const drag = (id, f0, f1, x0, y0, x1, y1) =>
  Array.from({ length: f1 - f0 + 1 }, (_, i) => {
    const k = i / (f1 - f0)
    const e = 1 - Math.pow(1 - k, 2)
    return { frame: f0 + i, type: 'win.move', id, x: Math.round(x0 + (x1 - x0) * e), y: Math.round(y0 + (y1 - y0) * e) }
  })
const WMBENCH = [
  { frame: 1540, type: 'win.open', id: 'ie', app: 'ie', props: { url: 'www.msn.com' } },
  ...drag('ie', 1580, 1600, 160, 120, 90, 60),
  { frame: 1610, type: 'win.maximize', id: 'ie' },
  { frame: 1630, type: 'win.unmaximize', id: 'ie' },
  { frame: 1650, type: 'win.minimize', id: 'ie' },
  { frame: 1680, type: 'win.restore', id: 'ie' },
  { frame: 1700, type: 'win.focus', id: 'music' },
  { frame: 1710, type: 'music.album', id: 'x5' },
  { frame: 1760, type: 'music.album', id: 'x12' },
  { frame: 1800, type: 'ui.value', id: mid('mv.view'), value: 'tiles' },
  { frame: 1815, type: 'ui.value', id: mid('grid.scroll'), value: 300 },
  { frame: 1830, type: 'ui.value', id: mid('mv.view'), value: 'thumbnail' },
  ...drag('music', 1840, 1860, 45, 23, 20, 10),
  { frame: 1880, type: 'win.close', id: 'ie' },
  { frame: 1900, type: 'win.close', id: 'music' },
  { frame: 1930, type: 'win.open', id: 'music', app: 'music' },
]

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams()
export const musicDemo = params.has('wmbench') ? [...VIDEO, ...withPrepares(WMBENCH, 'frame')] : VIDEO
