// Demo input for the desktop scene: [{ frame, type, ...data }], frames are 1-based video frames.
// Fractional frames are fine: they place an event between two video frames, as measured.
export const desktopDemo = [
  // the cursor settles on the media strip's play button; the strip lights up, then a click
  // slides the my Music flyout out of the sidebar
  { frame: 596.3, type: 'hover', id: 'sb.media', on: true },
  { frame: 599.75, type: 'desk.flyout', open: true },
  { frame: 622.3, type: 'hover', id: 'sb.media', on: false },

  // hover highlights follow the cursor down the track list
  { frame: 622, type: 'hover', id: 'fly.row.0', on: true },
  { frame: 629.5, type: 'hover', id: 'fly.row.0', on: false },
  { frame: 639, type: 'hover', id: 'fly.row.1', on: true },
  { frame: 641.3, type: 'hover', id: 'fly.row.1', on: false },
  { frame: 644, type: 'hover', id: 'fly.row.2', on: true },
  { frame: 646.8, type: 'hover', id: 'fly.row.2', on: false },
  { frame: 648, type: 'hover', id: 'fly.row.3', on: true },
  { frame: 650.8, type: 'hover', id: 'fly.row.3', on: false },
  { frame: 652, type: 'hover', id: 'fly.row.4', on: true },
  { frame: 654.5, type: 'hover', id: 'fly.row.4', on: false },
  { frame: 655, type: 'hover', id: 'fly.row.5', on: true },
  { frame: 657.8, type: 'hover', id: 'fly.row.5', on: false },
  { frame: 659, type: 'hover', id: 'fly.row.6', on: true },
  { frame: 661.8, type: 'hover', id: 'fly.row.6', on: false },
  { frame: 662.5, type: 'hover', id: 'fly.row.7', on: true },
  { frame: 664.8, type: 'hover', id: 'fly.row.7', on: false },
  { frame: 667.6, type: 'hover', id: 'fly.row.8', on: true },
  { frame: 669.8, type: 'hover', id: 'fly.row.8', on: false },

  // press and release on "Go to my Music": the flyout collapses and the window opens
  { frame: 689.8, type: 'desk.flypress', on: true },
  { frame: 693.5, type: 'desk.flypress', on: false },
  { frame: 693.5, type: 'desk.flyout', open: false },
  { frame: 693.5, type: 'music.open' },

  // the window is minimised from its title bar (music scene); a click on the taskbar's
  // My Music button restores it (the pointer reaches the button first: the window prepares)
  { frame: 1366, type: 'win.prepare', id: 'music' },
  { frame: 1402.6, type: 'tb.press', id: 'music' },
  { frame: 1402.6, type: 'music.restore' },
]
