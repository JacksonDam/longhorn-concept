// Where each window's taskbar button is, so windows can minimise into it and restore out of it.
// The shell (scenes/desktop) owns the taskbar and registers a locator; until it does, buttons
// are assumed at the video's my Music slot.
//
//   setButtonLocator((id, t) => ({ x, y, w, h }) | null)   shell: stage px rect of id's button
//   buttonRect(id, t)                                       window system: the rect (or default)
const DEFAULT = { x: 412.5, y: 698, w: 118, h: 22 } // the video's "My Music" button (LAYOUT5)
let locator = null
export function setButtonLocator(fn) {
  locator = fn
}
export function buttonRect(id, t) {
  return (locator && locator(id, t)) || DEFAULT
}
// the point a window collapses towards / rises from (measured for my Music: x 440, the taskbar top)
export function dockPoint(id, t) {
  const b = buttonRect(id, t)
  return { x: b.x + b.w * 0.233, y: b.y }
}
