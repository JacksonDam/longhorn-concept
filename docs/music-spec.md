# my Music window: measurements and timings

Reference frames 694-1529. All positions are stage px (960x720); the window's own layout is
authored in window-local px (stage minus the window origin 45, 23). Frame numbers are 1-based
video frames; "rel" counts frames from an animation's reference point (see Timings).

## Window
- Settled rect: x 45..822, y 23..676 (777 x 653), corner radius ~8. Measured on f800 (ECC).
- Rows (window-local y): glass toolbar 0..72 (title bar + favourites, one continuous horizontal
  gradient #4985d7 -> #6eb0fa (x~300) -> #4a86d8); menu/address band 72..118 (darker
  #326ab4 -> #5c9ce0 -> #326ab6, rounded top, inset edge); command row ~96..118; pale cyan rule
  at 122; body from 123: white to y~190, then a vertical gradient to #cad7eb at the status bar.
- Title "my Music" (Libre Franklin 300 + Franklin Gothic heavy), equaliser glyph left of it,
  minimise/maximise/close at stage x 769-775, 785-794, 801-809, y 31-39.
- Toolbar items (glass icons with a faded reflection below, labels Franklin Gothic 11 px
  #e4f4ff with a soft dark halo): back/forward pill, Home (MSN butterfly on a glass bowl), Search,
  ofoto.com, my music (two notes), yahoo.com, google.com, Favorites (glass star). Label left
  edges: 178, 254, 336, 432, 527, 638, 740.
- Menu: File 61, Edit 103, View 146, Help 196 (Franklin Gothic 10 px, #86bcff).
  Breadcrumb pill x 243..807, y 101..118: "my Computer" (light segment) > "my Pictures" > the
  search field "search my for..." (the video's text, kept verbatim).
- Command row: Hide Music Tasks (81), Up a Folder (264), Folders (366), Find (442), Preview (508,
  in a pale rounded button).
- Task pane (x 80 text column): "enjoy music" (heading 17.5 px, light + medium weights) with
  Play All, Play Selected, Create Playlist, Copy to CD, Burn CD (11 px, the second word darker
  except for "Copy to CD" / "Burn CD"); "music guide" 365 (Shop Music on MSN, Read Music
  Reviews, Radio Stations); "other tasks" 477.
- Header (y 146..345): device slab centre ~ (276, 211), "Windows" 406..453 / 175..184,
  "my Music" 408..544 / 183..217 (34 px), Play Music / Burn CD / Share Music buttons at
  icons x 435, 508, 582 and labels 428, 508, 578 (baseline ~299), "preview" 756..791 / 157..164.
  A soft swoosh: pale peach/pink blur through the title and buttons, cyan-to-blue ring on the
  right (centre ~ (580, 224), radii ~136 x 82, tilted -8 deg, faded out to the left).
- Grid bar (baseline ~375): Group by date (246), Arrange by date (360), View by thumbnail (483),
  Size (584) + a wedge slider.
- Album grid: 8 x 4 covers, 49 px, top-left x 248, 315, 381, 448, 514, 581, 649, 717 and
  y 395, 463, 529.5, 597.5; a thin light edge right/bottom and a soft shadow below.
  Tweet is tile 10 (row 2, column 3). Selected tile: a blue glass frame (~58 px) with the cover
  tinted ~50% towards rgb(30, 95, 170).
- Scrollbar at x ~803..818 (arrows at y 368 and 630, thumb ~448..524), resize grip bottom right.
- Status bar: "1 object selected" 409..477, y 666..674.

## Album page (after the Tweet click)
- "Tweet" (red #d01a1c) 474..527 and "Southern Hummingbird" (#6c6a69) 541..734, Franklin
  Gothic 20 px, baseline ~174.5.
- Tracks: numbers at 476, titles at 495, Franklin Gothic 11 px #8e8e8e, baselines 197.5 + 15 n.
  Track 3 (title and number) and track 4's number are blue #2a9ff0. No hover feedback is
  visible in the video while the cursor crosses the list (checked frame diffs 1000-1352).

## Toolbar icons (os/icons.jsx, redrawn and fitted 2026-11-05)
- Sources: none published. The toolbar art is the demo's own prototype art (glass orbs in a
  sunken well, glass Home/Search/Favorites, the note pair, tilted page thumbnails). Longhorn
  Plex theme resources (shellstyle/msstyles bitmaps, builds 3683-4074) are not online as
  extracted images, and those builds' travel buttons differ from the demo anyway, so every icon
  is redrawn in SVG from the video (assets-src/SOURCES.md section 7). The page thumbnails stay
  abstract: blocks laid out like the video's, not the 2003 sites themselves.
- Reference: the per-pixel median of frames 800-1348 step 3 (`tools/icons/median.py`). The
  toolbar is still from 760 to 1354; the median removes the compression noise and the cursor.
- Fitting (`tools/icons/fit.mjs`, generators in `tools/icons/gen`, fitted values in
  `tools/icons/params`, JSX via `tools/icons/tojsx.mjs`): each icon is a parametric SVG (layered
  linear/radial gradients, clip paths, masks; no filters), drawn over a capture of the toolbar
  with that icon blanked and scored against the median, both blurred. Our side is blurred a little
  more (`--vblur` 1.15-1.35, the video's own softness), otherwise the fit thickens outlines and
  grows the well to imitate the blur. Geometry and colours are bounded to the measured ranges so
  the crisp drawing still reads right at the app's 1.5x, and each fit was checked by eye at 8x.
- Back / forward (stage px): the well is the hull of circles (74.1, 63.6) r 15.2 and (104.5, 64.2)
  r 10.1, filled top to bottom from the shadowed top wall (#3e79cb) to the lit lower lip
  (#7eaded); three feathered copies of the hull, 1 px apart, darken the toolbar above it. The
  back orb (75.7, 63.3) r 13.6 and the forward orb (104.1, 63.8) r 8 each have a soft dark
  outline ring (darkest at the top, fading down where the lip shows), a body lit from the upper
  right (the forward one darker), a fresnel rim, a top cap and, on the back orb, a caustic low
  left. The back arrow has a soft shadow along its base. The forward hit area moved to
  window-local (50, 32, 18, 18) over the orb. RMSE (f1300, crop 54,42,64,42) 19.15 -> 5.41.
- my music: two glass eighth notes, heads (407.3, 70.9) 12.4 x 10.1 and (416.8, 72.8) 11.5 x 10.1,
  tilted; stems at x 408.8 / 419.0 from y 52.9 / 55.5, 3.4 px tubes (navy rim, lit core); full
  wedge flags; each head has a specular spot upper left. 20.95 -> 8.29 (398,46,32,44).
- Home: MSN butterfly over a glass bowl (154.2, 68.8) r 11.1: white sail wing, navy outer wing,
  glowing ball (158.4, 61.4) r 3.1, bowl rim lit low. 24.66 -> 8.67 (132,42,40,52).
- Search: lens (236.4, 61.9) r 7.8 (light ring with a soft dark edge, lit lower crescent), a
  two-tone handle from (230.1, 67.7) to (219.2, 75.9), 3.3 px. 24.80 -> 8.17 (192,48,54,40).
- Favorites: star (719.3, 64.0), R 14.7, inner ratio 0.42, rounded tips, rim lit at the top and
  blue below, soft inner glow. 12.02 -> 7.90 (701,45,36,44).
- Pages: quads turned away to the right (ofoto (300.6, 51.9) (329.1, 53.2) (327.6, 76.6)
  (302.5, 79.1); yahoo and google alike, about 26 x 26), content mapped through the quad's
  homography, a bright left edge and a soft light halo. ofoto 35.31 -> 12.72, yahoo
  24.46 -> 10.28, google 24.65 -> 8.18 (32 x 46 crops at 298 / 487 / 596, 47).
- Title glyph: four columns of glowing cells (3, 4, 2, 3 high), cells 3.75 x 2.59 on a 4.02 x
  3.32 pitch from x 392.2, bottom 38.6. 22.89 -> 10.91 (389,26,22,15).
- Cost: the toolbar is still one SVG image per explorer window size; rasterising it at 1.5x
  takes about 4-6 ms once (copies pre-mount from session start + 1 s, so not on an animation).
- Command row, task pane and header buttons (os/taskIcons.jsx, images in public/img/music,
  sources in assets-src/SOURCES.md section 8): Up a Folder, Folders and Find are the real XP
  SP3 Explorer toolbar buttons (shell32 bitmap 214, 24 px art drawn at 19-21 stage px; Find's
  handle points bottom left, no mirroring), Play All and Create Playlist the real shell32 icons
  292 and 12 at 16 px (the design the video shows). Hide Music Tasks, Preview, Play Selected and
  the Play Music / Burn CD / Share Music buttons are redrawn as layered-gradient SVGs and
  pre-rendered to WebP at 3-4x (no filters at run time); every image is preloaded. Each sits
  inside its existing box at a fitted offset. RMSE (median ref, crop as in the branch's survey):
  hide 36.5 -> 11.6, up 33.7 -> 11.2, folders 40.1 -> 9.4, find 28.6 -> 11.5, preview 32.0 ->
  12.8, Play All 34.5 -> 7.5, Play Selected 21.7 -> 9.8, Create Playlist 24.4 -> 5.7, header
  speaker 42.0 -> 28.8, disc 34.3 -> 20.3, share 27.3 -> 19.5 (the rest there is the header's
  background, not the icons), preview circle 12.2 -> 8.9.

## Slabs (gl/Slab3D renderer, own canvas 230 x 240 at window-local 175, 118, P = 900)
- Both slabs are 136 x 136 x 26 rounded boxes (fitted size/depth: silhouette IoU grid search).
- Poses per frame are fitted from silhouettes (`tools/music/fitslab.py`: colour segmentation,
  convex hull, Powell over x, y, rx, ry, rz, z, both ry branches tried) and smoothed; tables in
  `src/scenes/music/poses.js`. Typical IoU 0.97-0.985.
- Device: spins in from edge-on (frames 700-713, ~0.31 rad/frame), settles at ry ~0.75, then
  idles: x 90..123 and ry -0.1..0.75 swing together (slow sway, ~150 frame period).
- Album: the device turns away and fades (970-974), the album turns from its back (ry ~1.75)
  through edge-on (~981) to the front (~990), then idles like the device.
- Floor reflection: the mirrored slab at 22% opacity, masked to ~45 px below the slab.

## Timings
- Open (rel 0 = f694 = music.open + 0.5): beam fan 3.2..8.2 (peak 6), sparkle 7..12.5, window
  visible from rel 5; CSS pose (perspective 1600) per frame from ECC homography fits of the
  window for rel 9..22 (ry -19 deg -> 0, small tx/tz), hand-fitted for rel 5..8 where the video
  is too blurred; motion blur 14 samples over 1 frame until rel 9, then 6 / 4 samples.
- Header intro: enjoy music 8.5..12; swoosh fades in from 10.5 and grows to full size by 24;
  "Windows" slides in 16..22.5; "my" fades 23.5..27; "Music" wipes in 25.5..31.5; the title
  drifts back 22.5..36; buttons pop in from 65.5, 67.2, 68.9 (4 frames each, scale 1.3 -> 1).
- Album click f945.5 (`music.album` id 10): the tile pops (scale/tilt, 9 frames, 6-sample blur);
  the page transition starts 22.5 frames later (f968): title, swoosh and buttons fade over
  hrel 1.5..8.5, the device spins out, the album slab appears at hrel 4..5, the track list
  slides in from the right hrel 13..20 with a 10-sample horizontal blur.
- Minimise (rel 0 = f1354.5, title bar): rises 18.5 px (rel 0.5..3.5), then stretches down into
  the taskbar and collapses towards the My Music button (top 25, 162, 316, 491, 641 at
  f1359..1363, widths 777, 737, 622, 453, 289), 16 samples over 1 frame.
- Restore (rel 0 = f1403.5 = music.restore + 0.9): the reverse (tops 587, 326, 100, 24 at
  f1404..1407), then an upward bounce with a vertical stretch (f1408..1411), settled at f1412.

## Events
`music.open`, `music.minimize`, `music.restore`, `music.close`, `music.album {id}`,
`music.track {n}`, `hover {id: 'music.album.<i>' | 'music.track.<n>', on}`. Close plays the
open backwards (1.6x). Reopening resets the selection and the page.

## Tools
- `tools/music/align.py <frame> [--spec ...]`: ink bounding boxes, reference vs capture, per
  named element (`align_spec.txt`, `align_album.txt`).
- `tools/music/fitslab.py`: slab silhouette pose fits.
- `tools/music/covers.py`: generates the stand-in covers.
- `tools/music/keyref.py`, `segments.py`: key the orange placeholder, per-segment RMSE.
- `?plate` (dev only): draws a clean desktop frame of the video behind the window for diffs.

## Results (RMSE 0-255, `--blur 1`, crop 0,0,860,698, `?capture&plate`)
Whole range 694-1529: first full pass 26.2, now 19.6 (836 frames). Floor with no window
(hidden 1365-1402, other layers and cursor only): 8.8.

| Segment | frames | mean | max |
|---|---|---|---|
| beam / glow | 694-699 | 10.0 | 14.4 |
| open swing-in | 700-716 | 24.0 | 39.0 (701; 702 37.0, 703 27.9) |
| header intro | 717-760 | 21.5 | 23.6 |
| device idle | 761-944 | 20.8 | 21.5 |
| tile select | 945-967 | 21.0 | 21.2 |
| album flip + track list | 968-990 | 20.7 | 25.4 |
| album idle | 991-1352 | 19.6 | 21.7 |
| minimise | 1353-1364 | 19.4 | 26.5 |
| restore + bounce | 1403-1413 | 20.3 | 26.5 |
| album idle 2 | 1414-1529 | 19.6 | 22.1 |

Per element on f800 / f1100: toolbar 13.8 / 14.0, menu+command rows 18.3 / 17.8, task pane
8.1 / 8.7, header 24.7 / 18.6, grid bar 8.7 / 10.5, album grid 30.5 / 31.0 (stand-in covers),
scrollbar 12.9, status bar 7.9. Element bounding boxes: 39 of 58 checked text/icon boxes
within 1 px on every side (`tools/music/align.py 960`), the rest within 2-6 px.
Before/after highlights: open f701 52 -> 39, f702 54 -> 37 (window lighting), restore f1409
66 -> 18.5 (fitted bounce), minimise f1358 30 -> 22, album slab crop 46.5 -> 29 (stand-in
fitted to the face colours), grid 43 -> 31 (cover colour fields).

Real-time playback (`?demo`, headless Chrome on the M4): open and album flip run at 60 fps
(p90 16.8 ms); minimise/restore p90 ~50 ms while the blur copies mount (copies are capped at
7 in real time, all samples under `?capture`).

## Real-time performance and open refit (follow-up)
- `tools/perf.mjs` (1440x1080, ?demo): open t=23 s p95 89 / max 200 ms -> p95 ~18 / max 29-34 ms
  (the remaining spike is the window mount at music.open, f694.5); t=24 p95 104 -> 18 ms;
  minimise/restore t=45-47 p95 135-138 / max 365 ms -> p95 18 / max 19 ms.
- Real-time-only path (copy layers kept mounted with memoised snapshots, one slab layer):
  this predates the parity rule in docs/briefs/perf.md and is superseded by the OS work.
- Open refit (f698-712, full frame, --blur 1): mean 23.6 -> 20.6; f701 38.1 -> 22.7,
  f702 35.7 -> 25.7, f703 27.7 -> 19.8. Window poses at 700-701 refitted from the measured
  edges; lighting = lit toolbar (additive) + right/downward shade over the body and its
  content; device spin-in edge-on at 703.5 and re-positioned to the silhouettes.

## Window system (src/os) and the usable my Music (src/apps/music)
- `os/apps.js` registry (auto-discovers `src/apps/*/index.{js,jsx}`), `os/PlexWindow.jsx` (frame,
  title bar, min/max/close, drag, resize grip, focus, maximise tween, open swing-in with lighting,
  minimise/restore into the window's taskbar button via `os/taskbar.js`, close = open reversed,
  multi-sample blur), `os/ExplorerChrome.jsx` (toolbar, menus, breadcrumb drop-downs, command
  row; config values may be functions of (win, t)), `os/WindowLayer.jsx`, `os/windowAnim.js`
  (the fitted tables), `os/Beam.jsx`, `os/text.jsx`, `os/icons.jsx`.
- Rendering, one path for capture and real time: each window keeps `copies` layers mounted
  (my Music: 10); copy 0 is live, the others hold memoised snapshots (`app.snapshot`,
  `app.copyKey`) and are parked when idle (shown windows: on their rect at 1e-4 opacity so their
  tiles stay rasterised; others off-stage, painted). Live content renders at a time that only
  moves while it animates (`app.settle`, `app.liveTime`), quiet windows skip re-rendering
  (`quietKey`), copies mount on one background queue from session start + 1 s, apps with
  `prewarm` (my Music) mount as hidden ghosts that the real window takes over.
- Opening a window that isn't prewarmed: frame and chrome on the open's frame, its content on the
  next, then one copy per frame (copies k > 0 draw `app.Proxy` when the app has one) while the
  beam plays; closed windows keep their composited copies, which settle back to a just-opened
  state, so a reopen only rasterises. Explorer chrome draws the toolbar icons and reflections
  from one SVG image (made once from os/icons.jsx; pixel-identical) and its static labels as one
  SVG per row; copies skip hit areas, drop-down menus and listeners. Focus changes from an open
  or a close are drawn off the heaviest frame: a closing window stays active while it animates
  out, the window an open takes the focus from loses it two frames in. `app.minSize` clamps
  resizing (my Music 777 x 520, its design width, so the header never clips).
- my Music: 96-album library (the video's 32 tiles in the middle of a fictional collection),
  thumbnail / tiles / details views, Group by / Arrange by / View by drop-downs, the Size slider,
  search (filters), scrolling (wheel, arrows, track, thumb), album pages for every album with a
  slab and a track list, track click / album double-click / Play buttons play through
  os/media.js, task-pane links and collapsible sections, Folders pane, Hide Tasks, Preview,
  Find (focuses search), Back / Forward, menus, Favorites, resize (min 777 x 520).
- Scripted interaction bench: `?wmbench` (src/demo/music.js) adds window input after frame 1540.

## Results after the OS work (prod build, tools/bench.mjs --repeat 3, ms p50 / p95 / max)
open 2.8 / 5.1 / 5.2, window idle 1.4 / 3.9 / 5.7, album flip 2.5 / 5.3 / 6.0, album idle
2.3 / 3.9 / 5.3, minimise 3.1 / 6.8 / 6.8, restore 2.4 / p95 dominated by one sporadic frame
(1410-1414, 13-55 ms in full-range runs only; 6.3 max in 1300-1440 runs). ?wmbench: every
segment p95 under 6.7 ms; reopen 13 ms on its first frame (shell taskbar insertion + live layer).
Video RMSE per segment within +0.09 of the pre-OS baseline (open 0.3 better).

## Results, window-system round 3 (prod build, 2026-11-05; shared machine, load 2-5)
Video 1-1529 (--repeat 2): 4 frames over 6.94 ms (1413 13.8, 1414 10.5, frame 1, 558);
open max 5.0, minimise max 4.9, restore p50 2.4. Video RMSE per segment unchanged (beam 12.18,
open 21.49, intro 22.27, device idle 21.72, select 21.88, flip 21.62, album idle 20.72, minimise
19.99, hidden 10.35, restore 20.71, album idle 2 20.68).
?apps=opens A/B against the previous commit (open frame 0 / copy frames / close frame 0, ms):
documents 12.0 / 6.7 / 12.5 -> 3.8 / 4.5 / 5.1, programs 8.3 / 6.7 / 7.5 -> 3.6 / 4.0 / 4.3,
pictures 8.9 / 6.3 / 8.1 -> 4.3 / 5.8 / 6.1 (its content mount, the next frame, is 7.6),
outlook / ie / im / word opens 3-5, closes 4-5.
Restore end (1412-1414): not a repaint. Blink paints nothing; cc re-rasterises all ten copies
(and the masked slab reflection canvases) a few frames after the restore's transforms settle,
having changed their raster scale while they shrank in the minimise. Warm it costs 2-3 ms over
two frames; in some full-range runs it blocks the commit (10-20 ms). Hiding the sub-0.3-scale
samples, clamping the overshoot to 1 and an identity-perspective rest transform all left it
unchanged.

## Window-system round 4 (time-boxed, nothing kept)
`?apps=opens`, load 1.5-4.6. Frame 8 after an open is 1-3 ms above frames 7 and 9: pictures
8-9 ms, ie 5-7, documents 5-6. Ruled out as its cause (A/B, no change):
- the blur-shutter switch at rel 8;
- warming the copies at full scale instead of openPose(6);
- keeping the beam layers rasterised on-stage;
- the closed window's settle-back;
- the slab canvases (disabling them changed nothing).
The window's layer count doesn't change at rel 7-8.
Restore end: re-rasterises 1-2 tiles per copy a few frames after the restore. Keeping the copies'
last restore pose instead of the rest style didn't change it. In a standalone page, will-change
copies run through the same minimise / restore transforms (2D and perspective, 1.5x stage) never
re-rasterise. So the cause is in what the copies contain, not their transforms.
