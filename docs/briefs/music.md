# Builder brief: my Music window (frames ~694 to 1529)

Own: `src/scenes/music/**`, `src/demo/music.js`, `docs/music-spec.md`, `public/img/music/**`.
Entry: `MusicWindow` and `musicWindowState(t)` in `src/scenes/music/MusicWindow.jsx` (keep the
interface documented at the top of that file; the desktop builder renders `<MusicWindow />`
between the wallpaper and the sidebar and uses `musicWindowState` for the taskbar button).
Event 'music.open' comes from the flyout's "Go to my Music" (desktop builder). While the desktop
scene is still a placeholder, add a temporary 'music.open' at frame ~694 in src/demo/music.js
so your captures work (note it in your report so it can be de-duplicated at merge).

What the video shows (verify and refine every point):
- Open (frames ~697-712): a light beam rises from the taskbar (698-699), then the window
  appears hugely blurred and swings in with 3D perspective (left edge nearer, from lower
  left), settling flat around 707-711. Heavy multi-sample motion blur. Use
  core/MotionBlur.jsx with a 3D CSS transform (perspective) on the whole window.
- Header intro (~705-770): the 3D glass music device (blue box with a music note and
  equaliser squares; render with gl/Slab3D, front-face texture drawn by you) spins in;
  "Windows my Music" title fades in; a soft blue/peach swoosh grows behind; Play Music /
  Burn CD / Share Music buttons appear. Then the device idles with a slow wobble.
- Window chrome (measure everything; read text from enlarged crops): blue Plex title bar
  with "my Music" title and min/max/close; toolbar row (back/forward pill, Home with an MSN
  butterfly, Search, ofoto.com, my music, yahoo.com, google.com, Favorites star); menu row
  (File Edit View Help) + breadcrumb address (my Computer > my Pictures > "search my f...");
  command row (Hide Music Tasks, Up a Folder, Folders, Find, Preview). Left pane: "enjoy
  music" (Play All, Play Selected, Create Playlist, Copy to CD, Burn CD), "music guide"
  (Shop: Music on MSN, Read Music Reviews, Radio Stations), "other tasks". Header with
  "preview" at the right. Grid toolbar "Group by date, Arrange by date, View by thumbnail,
  Size" slider; album grid (8 columns x 4 rows visible) with a scrollbar; status bar.
- Album click (~frame 968, find the exact tile): the device slab spins away while the title and
  buttons fade (970-977); the album slab spins in, goes edge-on (~981) and turns to face
  front (~983-990) while the track list header "Tweet  Southern Hummingbird" and 10 tracks
  wipe/slide in with horizontal blur (983-987); track 3 is highlighted in blue. Then the album
  slab idles with a slow rotation. Track list text (keep verbatim): 1 So Much To Say (Intro),
  2 My Place, 3 Smoking Cigarettes, 4 Best Friend feat. Bilal, 5 Always Will, 6 Boogie 2nite,
  7 Oops (Oh My) feat. Missy "Misdemeanor" Elliott, 8 Make Ur Move, 9 Motel, 10 Beautiful.
- Hover feedback on tracks/tiles (1000-1350) as the video shows.
- Minimise (~1353-1362): the window drops into the taskbar with a vertical-stretch multi-sample
  blur and a beam; restore (~1404-1413) reverses it. Title-bar minimise emits
  'music.minimize'; the taskbar button (desktop builder) emits 'music.restore'.
- Interactive: every album tile is hoverable/selectable; clicking the Tweet tile shows the
  page above. Other albums: select highlight only (no invented track lists). Close button:
  closes the window (reverse of the open animation is fine); 'music.open' can open it again.

Album covers and the artist photo are third-party copyrighted art: make original stand-in
covers (generated graphics that echo each tile's colours/composition at a glance, no real
logos, faces or text from the real covers) and an original stand-in for the Tweet cover
(gold-toned, so the slab still reads like the video). List them in docs/SUBSTITUTIONS.md.
Gl/slab.js is tuned by the login builder in parallel; you may add new optional slab params
but don't change existing defaults.
