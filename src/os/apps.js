// App registry. Every folder src/apps/<name>/ with an index.js(x) default-exporting an app is
// registered automatically (no shared list to edit). An app:
//
//   {
//     id: 'music',                       // the `app` of 'win.open' events
//     title: (props) => 'my Music',      // window title
//     taskbarLabel: (props) => 'My Music',
//     icon: url,                         // taskbar / title icon
//     size: { w, h }, position: { x, y },// default window rect (stage px)
//     explorer: false | true | {...},    // draw os/ExplorerChrome above the content (see there)
//     Content: ({ win, t, active, live, w, h }) =>  // the client area (below the title bar / explorer
//                                        // chrome); live: true only on the window's live layer
//     // optional:
//     minSize: { w, h },                 // drag-resize limits (default 320 x 200)
//     chrome: 'plex' | 'none',           // 'none': Content draws the whole window (my Music)
//     settle: seconds,                   // how long the app's own animations run after an event
//                                        // (motion-blur copies show the settled content), default 1
//     Overlay: ({ win, t }) =>           // live layer drawn once above the blur copies (3D slabs)
//     liveTime: (win, t, base) => time   // see os/PlexWindow liveContentT (long app animations)
//     copyKey: (win, t) => string        // the copies' visual state at t: equal keys skip re-rendering
//     copies: n                          // blur copies (default 6); my Music uses 10. Every copy draws
//                                        // the full Content (memoised snapshots; os/PlexWindow.jsx)
//     usesActive: true                   // Content draws differently when the window isn't active
//                                        // (otherwise focus changes don't re-render it)
//     relevant: (e, win) => bool         // events (besides its ui-kit ids and '<app>.*') that change
//                                        // the content, so it animates `settle` s after them
//   }
//
// Content gets `win` (the wm record: id, props, state, maximized, rect...), `t` (clock time; the
// motion-blur copies pass a frozen snapshot time, so keep Content a pure function of win/t/events)
// and `active` (focused window).
//
// Mount timing: a window opened later (not prewarmed) mounts its frame and chrome on the open's
// frame, its Content on the next frame and one copy per frame after that, while the beam plays
// (it shows from 5 frames in). Explorer chrome is cheap in copies by itself (one toolbar image,
// grouped labels, no hit areas or menus); an explorer `Search` component gets `copy` there.
// `active` follows the focus, except that a closing or minimising window keeps it while it
// animates out (the next window gets it after the animation) and the window an open takes the
// focus from loses it two frames into the open (os/focus.js). The window's look (title bar and top
// chrome, shadow) cross-fades to match (os/look.jsx).
// More optional fields: `chromeTop: px | (win, w) => px`: how far the window's top chrome reaches
// from its top (title bar + the app's own bars; an inactive window's wash covers it; default the
// title bar or the explorer chrome; apps using lib/chrome.jsx AppTop use its chromeTop(opts));
// `shadow: false` turns the window's drop shadow off.
const mods = import.meta.glob('../apps/*/index.{js,jsx}', { eager: true })
const APPS = new Map()
for (const m of Object.values(mods)) {
  const a = m.default
  if (a && a.id) APPS.set(a.id, a)
}

const fallback = new Map()
function fallbackApp(id) {
  let a = fallback.get(id)
  if (!a) {
    const name = String(id || 'Window')
    a = {
      id: name,
      title: () => name,
      taskbarLabel: () => name,
      icon: null,
      size: { w: 420, h: 300 },
      position: { x: 160, y: 120 },
      explorer: false,
      Content: () => null,
    }
    fallback.set(id, a)
  }
  return a
}

export const getApp = (id) => APPS.get(id) || fallbackApp(id)
export const hasApp = (id) => APPS.has(id)
export const listApps = () => [...APPS.values()]
