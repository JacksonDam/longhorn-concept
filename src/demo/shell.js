// Scripted shell input for benchmarking and checking the desktop shell (?scenario=shell, with
// ?capture / ?bench / ?demo): log in, Start menu (hover, close), open my Documents (taskbar
// insertion), weather and calendar flyouts, hide / show the sidebar, the media strip, the my
// Music flyout, the desktop context menu, close my Documents (taskbar removal), a taskbar
// restore click, a second login after Log Off, then the live sidebar glass over a window and each
// kind of wallpaper. [{ frame, type, ...data }] in 1-based video frames.
export const shellScenario = [
  { frame: 10, type: 'login.select', id: 'sondra' },
  { frame: 20, type: 'login.submit', id: 'sondra', running: ['inbox', 'yahoo', 'doc1', 'winamp'] },
  // Start menu
  { frame: 95, type: 'hover', id: 'tb.start', on: true },
  { frame: 98, type: 'shell.popup', id: 'start', open: true },
  { frame: 104, type: 'hover', id: 'sm.r0', on: true },
  { frame: 108, type: 'hover', id: 'sm.r0', on: false },
  { frame: 108, type: 'hover', id: 'sm.r1', on: true },
  { frame: 112, type: 'hover', id: 'sm.r1', on: false },
  { frame: 112, type: 'shell.popup', id: 'start', open: false },
  { frame: 112, type: 'hover', id: 'tb.start', on: false },
  // a new window: the taskbar inserts its button 8 frames later
  { frame: 120, type: 'win.open', id: 'documents', app: 'documents' },
  // weather flyout, then the calendar (opening one closes the other)
  { frame: 150, type: 'shell.popup', id: 'weather', open: true },
  { frame: 170, type: 'shell.popup', id: 'calendar', open: true },
  { frame: 190, type: 'shell.popup', id: 'calendar', open: false },
  // the chevron hides and shows the sidebar
  { frame: 200, type: 'shell.sidebar', visible: false },
  { frame: 215, type: 'shell.sidebar', visible: true },
  // the media strip plays, skips, pauses
  { frame: 225, type: 'media.play' },
  { frame: 255, type: 'media.next' },
  { frame: 280, type: 'media.pause' },
  // the my Music flyout with row hovers
  { frame: 290, type: 'desk.flyout', open: true },
  { frame: 298, type: 'hover', id: 'fly.row.2', on: true },
  { frame: 302, type: 'hover', id: 'fly.row.2', on: false },
  { frame: 302, type: 'hover', id: 'fly.row.3', on: true },
  { frame: 306, type: 'hover', id: 'fly.row.3', on: false },
  { frame: 318, type: 'desk.flyout', open: false },
  // the desktop context menu (UI kit)
  { frame: 330, type: 'ui.menu', id: 'desk.ctx', open: true, x: 300, y: 300 },
  { frame: 345, type: 'ui.menu', id: 'desk.ctx', open: null },
  // closing my Documents removes its button
  { frame: 355, type: 'win.close', id: 'documents' },
  // a restore click on a taskbar button
  { frame: 372, type: 'tb.press', id: 'inbox' },
  { frame: 372, type: 'win.restore', id: 'inbox' },
  // log off and log in again: the entrance plays again
  { frame: 400, type: 'session.logoff' },
  { frame: 420, type: 'login.select', id: 'tommy' },
  { frame: 430, type: 'login.submit', id: 'tommy' },
  // the live sidebar glass over other things: a window dragged under the sidebar, the sidebar
  // hidden and shown over it, Refresh, the window dragged back out, each kind of wallpaper
  { frame: 520, type: 'win.open', id: 'documents', app: 'documents' },
  ...drag('documents', 540, 560, 70, 36, 600, 140),
  { frame: 575, type: 'shell.sidebar', visible: false },
  { frame: 590, type: 'shell.sidebar', visible: true },
  { frame: 605, type: 'desk.refresh' },
  ...drag('documents', 615, 635, 600, 140, 70, 36),
  { frame: 650, type: 'desk.wallpaper', kind: 'image', key: 'leaf' },
  { frame: 665, type: 'desk.wallpaper', kind: 'color', color: '#3a6ea5' },
  { frame: 680, type: 'desk.wallpaper', kind: 'color', color: '#000000' },
  { frame: 695, type: 'desk.wallpaper', kind: 'photo' },
  { frame: 705, type: 'win.close', id: 'documents' },
]
export const SHELL_FRAMES = '1-720'

// a window drag: one 'win.move' per frame, easing out
function drag(id, f0, f1, x0, y0, x1, y1) {
  return Array.from({ length: f1 - f0 + 1 }, (_, i) => {
    const k = 1 - Math.pow(1 - i / (f1 - f0), 2)
    return { frame: f0 + i, type: 'win.move', id, x: Math.round(x0 + (x1 - x0) * k), y: Math.round(y0 + (y1 - y0) * k) }
  })
}
