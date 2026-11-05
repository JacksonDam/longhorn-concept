// Demo input for the music scene: [{ frame, type, ...data }], frames are 1-based video frames.
export const musicDemo = [
  // TEMPORARY until the login/desktop scenes land (de-duplicate at merge):
  { frame: 509, type: 'login.submit' },
  { frame: 694, type: 'music.open' },
  // the Tweet tile (row 2, column 3) is clicked; the header turns into its album page 22.5 frames later
  { frame: 945.5, type: 'music.album', id: 10 },
  // title-bar minimise; the taskbar button (desktop scene) restores it
  { frame: 1354.5, type: 'music.minimize' },
  // TEMPORARY until the desktop scene's taskbar button lands (de-duplicate at merge):
  { frame: 1403.5, type: 'music.restore' },
]
