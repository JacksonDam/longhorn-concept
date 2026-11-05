// Demo input for the music scene: [{ frame, type, ...data }], frames are 1-based video frames.
// 'music.open' (693.5) and 'music.restore' (1402.6) come from the desktop scene's demo.
export const musicDemo = [
  // the Tweet tile (row 2, column 3) is clicked; the header turns into its album page 22.5 frames later
  { frame: 945.5, type: 'music.album', id: 10 },
  // title-bar minimise
  { frame: 1354.5, type: 'music.minimize' },
]
