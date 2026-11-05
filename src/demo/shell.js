// Scripted shell input for benchmarking and checking the desktop shell (?scenario=shell, with
// ?capture / ?bench / ?demo): log in, Start menu (hover, close), open my Documents (taskbar
// insertion), weather and calendar flyouts, hide / show the sidebar, the media strip, the my
// Music flyout, the desktop context menu, close my Documents (taskbar removal), a taskbar
// restore click, a second login after Log Off. [{ frame, type, ...data }] in 1-based video frames.
export const shellScenario = [
  { frame: 10, type: 'login.select', id: 'sondra' },
  { frame: 20, type: 'login.submit', id: 'sondra' },
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
]
export const SHELL_FRAMES = '1-520'
