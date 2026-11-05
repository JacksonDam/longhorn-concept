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
