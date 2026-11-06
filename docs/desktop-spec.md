# Desktop scene: measurements

All coordinates are stage (video) pixels; frames are 1-based video frames (29.97 fps).
The scene mounts at `login.submit` (video frame 509 in the demo); entrance times below are
absolute frames, the code adds them to `since` (see `timing.js`, `ramp(f, a, b)`).
Measured on medians of clean frames (540-566, 575-592, 1150-1350, 612-621) and per frame
with projection/coverage fits; scripts were throwaway Python in the scratchpad.

## Wallpaper
- Source: `assets-src/wallpaper-stonehenge/stonehenge-sunset-1536x1024-magas.su.jpg`, the
  exact photo (SIFT + RANSAC: scale 0.70315, offset -65.93, +0.58; no rotation or stretch).
- Shipped as the 4:3 crop x 94..1459 (1365x1024) with a fitted colour grade baked in
  (cubic + cross-term polynomial per channel, RMSE vs the video 7.2 -> 5.3 on the
  uncovered wallpaper; residual is compression noise, no spatial vignette).
  `public/img/desktop/wallpaper.webp`, placed at (0.16, 0.58) size 959.8x720.04.

## Sidebar glass (x 858-960, y 0-720)
Live: it blurs and tints whatever is behind it (the wallpaper choice, windows dragged under the
sidebar, the Refresh dim), `out = k(x) * blur(backdrop) + t(x) + g(y)` per channel.
- Blur: CSS `backdrop-filter: blur(2.4px)` (`GLASS_BLUR`, stage px, so 3.6 device px at 1.5x).
  Chrome mirrors the backdrop at the element's edges (scipy `reflect`); its blur matches a
  Gaussian of the same sigma to within 1 grey level. Sigma sweep of the panel fit (simulated
  backdrop, `fit_glass.py --sweep`): 0 -> 3.47, 1 -> 3.08, 2 -> 2.84, 2.2 -> 2.83, **2.4 -> 2.83**,
  2.6 -> 2.84, 3 -> 2.87, 4 -> 3.03. That includes the video's own softness (~0.85 px on
  uncovered wallpaper).
- k(x): transmission shared by the channels (a per-channel k only gets 2.81 -> 2.72), drawn as
  a black layer with alpha 1 - k(x) on the blurring element, a CSS gradient through stops every
  5 columns (`glassFit.js`): 0.32 at x 858, 0.23-0.26 under the bright border line (859-861),
  then 0.34 at 862 rising to 0.47 at 908 and 0.75 at 958 (0.66 in the last column).
- t(x) + g(y): an additive tint, `glass-tint.webp` (102x720 RGB, lossless) drawn over the blur
  with `mix-blend-mode: plus-lighter`. t is bluish and fades to the right ((61,95,136) at 863,
  (47,76,113) at 908, (22,38,60) at 958; the border line (102,121,148)); g carries the tile bands
  and the 1-2 px separators (y ~23, 61, 257, 307, 517, 593, 620, 697) and darkens the bottom
  rows (~-25 at 664-693). A single alpha overlay can't hold it: on the right the glass passes
  ~70 % of the backdrop and still adds more blue than the remaining 30 % alpha allows (it would
  clip 4 % of the pixels, RMSE 2.81 -> 3.00).
- Fitted by `tools/desktop/fit_glass.py` against Chrome's own blur of the wallpaper (frame 522
  captured with the glass layers emptied): the empty panel of frames 521-523 (header picture
  masked, Seattle rows from 521-522), RMSE 2.81; the clock foot (rows 700-719) on the median of
  frames 580-1528 with the clock text and chevron masked, sharing the panel's k(x), its own t(x)
  interpolated under them (RMSE 3.44 on the visible columns). The foot reads as the taskbar band
  running on under the clock: no border line, darker to the right.
- Compositing rules: the glass layers carry their own opacity (entrance fade) and their own
  translateX (chevron slide). Any ancestor with opacity < 1, a filter, mask, clip-path, blend
  mode or isolation (or a transform around the plus-lighter layer, which isolates its blend)
  becomes the backdrop root: the blur then sees nothing and the tint adds to nothing.
- Left border: bright line at x 859-860.
- Result vs the precomputed image it replaced (all 1529 frames, blur 1): sidebar x 858-960
  20.11 -> 20.07 (desktop frames 515-1529: 28.02 -> 27.98), clock foot 14.36 -> 14.22,
  taskbar 12.72 -> 12.71, full frame 17.58 -> 17.57; no frame worse by more than 0.3 (foot,
  entrance frame 518).

## Sidebar tiles (text: Libre Franklin 500, white 90 %; baselines)
| tile | contents |
|---|---|
| header | picture 864,4 19x18 (washed yellow until 568.5, colour by 574); "Sondra" 11.2 px at x 887.5, baseline 17 |
| Seattle | "Seattle" 10.7 px at 866.3 / 42; skyline art 878,31 82x30 (Space Needle at x ~921) |
| Mail | "Mail" 10.5 px 867 / 81.2; 9 rows 9 px at x 888, baselines 99.4 + 18.8 i; icons closed (rows 0-2) at 867, open diamonds at 866; row 1 selected band y 103-121 |
| media | title 8 px at 867 / 272 ("U2 - One more Voice Wit..." clipped); play 865,278 (25 px with halo); stop/prev/next 14 px at 894/914/932, y 284; translucent capsule 888,281 64x20 |
| Buddies | "Buddies" 10.2 px 866.5 / 333.5; rows 9 px at 888, baselines 351.5 + 18.75 i (row 1 has a picture only); pictures 16x17 at 866, top = baseline - 14.5 |
| photo | 862,519 96x73 |
| Go Online | orb 864,599.5 16 px; text 10.3 px 886.2 / 616.5 |
| thumbs | 33x29 at (875,627) (912,627) (875,661) (912,661) |
| clock foot | "11:31 am" Libre Franklin 600 11.2 px right-aligned to 934; chevron disc 943,702 15 px |

Row pitches were fitted by template alignment (all labels within +-0.75 px).

## Taskbar (y 699-720)
- Bar: per-row colour at alpha 0.55 over the blurred backdrop (top highlight rows 700-701),
  fitted on frames 575-592 / 1150-1350. Start end slightly darker. The bar blurs what is behind
  it with the glass's radius (`backdrop-filter`, opacity on the bar itself): the video's grass
  texture under it is attenuated more than the 0.45 transmission explains (amplitude 0.73 vs
  1.06; uncovered wallpaper of that amplitude survives the compression at ratio ~1.0), and its
  correlation with the wallpaper's texture peaks at blur 2.5-3 where the regression slope reaches
  the bar's 0.45 (x 75-180; the plain bar right of the task group agrees, weaker). Row fit
  RMSE: blur 0 -> 2.95, 2 -> 2.71, 3 -> 2.68.
- Start: flag (XP flag, white-blue; settled: icons/flag-start.webp) 8,702.25 17x15; "start" Plex 600 13 px at x 29.
- Task group: light blue band (top 2 rows 172,214,223; body 110,180,250), sticks up 1 px.
  Libre Franklin 600 9.9 px white, faded on the right edge of each button.
  4 buttons: group 248-675.5, separators 379.5, 481.5, 589.5.
  5 buttons: group 185.5-730.5, separators 312.5, 412.5, 644.5 (none between My Music and
  Document, as in the video). Icon/text offsets per button in `Taskbar.jsx`.

## Icons (redrawn and fitted 2026-11-05; scenes/desktop/icons.jsx, appIcons.jsx, public/img/desktop/icons)
- Sources in assets-src/SOURCES.md section 9. Real art: the taskbar My Music button is XP
  shell32 icon 237 (16 px on the taskbar, 48 px in the Start menu); the settled Start flag is
  the XP flag (Commons, CC0) recoloured white-blue, pre-rendered to WebP at 4x (the pastel
  entrance flag is still flag.svg). Everything else is redrawn as layered-gradient SVG files
  (no filters) fitted to medians of the video: sidebar 1100-1400, taskbar 1200-1395, flyout
  612-688.
- Icons are placed on whole pixels with the fitted sub-pixel remainder as a translate (Chrome
  snaps an <img> box to whole pixels); the task button layers sit on whole pixels too
  (TaskGroup.jsx), which had pushed every taskbar icon 1 px right. Row offsets the video shows
  (mail rows up to 2 px, Kathy's away icon 4 px high) live in the icon components.
- RMSE (1 px blur, before -> after): mail list 11.0 -> 8.4 (closed 13.6 -> 9.5, hot 18.7 ->
  15.4, open 10.3 -> 7.7), away buddies 25.6-30.1 -> 14.1-15.4, media strip 21.9 -> 13.0,
  Go Online 24.6 -> 13.5, thumbnails 19.7 / 20.6 / 44.1 / 20.7 -> 10.6 / 12.0 / 18.6 / 14.2,
  clock chevron 35.0 -> 10.5, Start flag 25.4 -> 16.4, taskbar Outlook 22.1 -> 20.2, IE
  17.4 -> 13.0, My Music 23.3 -> 16.9, Word 44.5 -> 15.5, Winamp 22.4 -> 19.0, flyout note
  13.5 -> 11.0, flyout title buttons 10.9 -> 7.3, footer arrow 15.3 -> 14.9.

## XP icon art (2026-11-06; os/xp.jsx, os/xpSheet.js, public/img/xp, tools/icons/xpicons.py)
Everything the video doesn't show is real Windows XP (SP3) or Office 2003 icon art, read out of
the binaries (assets-src/SOURCES.md section 13) by `python3 -I tools/icons/xpicons.py` into one
sprite per size design (xp16/24/32/48.webp, lossless, cells of size + 4 px) and an index
(`src/os/xpSheet.js`, generated). `<XpIcon name size />` draws the design nearest the drawn size by
ratio (14-19 px: 16, 20-27: 24, 28-39: 32, 40+: 48) scaled to the box; `crisp` keeps 16-colour
pixel art hard-edged. To add an icon: add it to the manifest in xpicons.py (icon group, toolbar
strip cell or bitmap), rebuild, use its name.
- Users: apps' `<Ico kind>` (apps/lib/icons.jsx maps each kind to an XP name: files, folders,
  drives, places, applets, the IE6 / Explorer / Outlook Express toolbars, the Picture and Fax
  Viewer tools; the Winamp transport, Messenger and format-bar letter glyphs stay SVG), the
  explorer task panes (XP's own task icons: Make a new folder 319, Publish to the Web 244, View
  as a slide show 249, Order prints 251, Print pictures 252, ...), the Start menu (pinned 32 px,
  MFU 16 px, right column 24 px as in XP, shut down / log off = shell32 28 / 45 at 24 px),
  Control Panel (category view: shell32 270-279 category art; classic view: each .cpl's own
  icon), Paint's tool box (mspaint.exe bitmap 859, 16 px at 16 px, crisp), message boxes
  (user32 101-104), Outlook's folder list and message icons (Office 2003 outllib.dll), the
  taskbar buttons of windows the video doesn't show (scenes/desktop/appIcons.jsx).
- The video's own taskbar icons keep their fitted 16 px images: scored against the median of
  frames 1200-1395 (24 x 22 crop, 1 px blur), XP's real 16 px IE6 icon is 19.2 against the
  redraw's 12.5 (the video's is washed out), and Office 2003's Outlook icon, even colour-mapped
  by least squares, 17.9 against 18.6 with a wild map. Above 20 px (Start menu) IE, Word and
  Outlook use XP's / Office 2003's own 32 px designs (the video's blue Outlook is a pre-release
  colouring; its 32 px design isn't available).
- my Pictures task pane: the second reference's icons, matched with WMP 9 library art (wmploc 601
  album, 605 burn, 504 video) and shell32 249 (slide show).

## Entrance (absolute frames; each tile fades in over ~1 frame)
Measured by projecting each tile's pixels onto (final - glass): every tile reads 0.5 on its
first frame and 1.0 on the next.
- Login fades 512.5-521 (login builder). Panel glass 515-520.5 plus a faint haze 516-520.5.
- Header picture 520.4-521.2 (washed), Seattle 522.5-523.5, Mail 523.5-524.5, media
  524.5-525.5, Buddies 525.5-526.5, photo 526.4-527.5, Go Online 527.4-528.5, thumbs 528.4-529.5.
- Taskbar: bar 516-520 (the login bar shrinks onto it), shut-down dot 519.4-520.4,
  "7:09 PM" 519.5-520.5 (dim, 10.6 px), flag 520.3-521.3 (washed colours), task buttons
  rise 20 px from 522.3 over 1.6 frames (ease-out cubic, vertical motion blur, group fades
  521.6-523). Until 568 the bar glows around the group and is darker at both ends.
- Build-up 567.6-575: chevron 567.6-574.2, "11:31 am" 568.3-574.3, dot out 568.3-574.3,
  "7:09 PM" out 569.3-574, "start" 569.4-574.8, name + coloured picture + white flag +
  normal bar 568.5-574.

## my Music flyout (x 665-858, y 258-499)
- Frame: 2 px dark top edge, title bar 262-287 (68,123,216), light bands 288-290, list
  668-842 x 293-475 (white -> 196,212,236 at the bottom), scrollbar 844-858, footer
  476-496 with "Go to my Music" (arrow at 719, text at 731, "my Music" bold).
- Rows: Libre Franklin 600 9.4 px (112,118,152), text x 690, durations right-aligned to
  834.5, row tops 294 + 19.19 i. Row 4 ("Gomez", with album picture 672,370.5) selected.
- Open: the media strip lights up (hover, 596.3 + 3.1 frames, blue 95,172,250 at 0.6),
  click at 599.75. Ghost-coverage fits of frames 600-603 give the left/right edges: the
  panel shoots in from the right screen edge over the sidebar, squashed, overshoots to
  L ~602 while R pulls in to ~780 (602.5), springs back and snaps to rest at 603.5
  (`OPEN_L/OPEN_R`). 1-frame shutter, 24 samples.
- Hovers (video): row 0 622-629.5, 1 639-641.3, 2 644-646.8, 3 648-650.8, 4 652-654.5,
  5 655-657.8, 6 659-661.8, 7 662.5-664.8, 8 667.6-669.8 (in 1.5 frames, out 1).
  Media strip hover off 622.3 (out over 5.5 frames).
- Close: press on "Go to my Music" 689.8 (footer lightens over 3.5 frames), release
  693.5 -> 'music.open' + close: L accelerates right (723 at +1, 800 at +1.5, 960 at +2.7)
  while R jumps back to the screen edge (`CLOSE_L/CLOSE_R`).

## My Music task button (from 'music.open' + 8 frames = 701.5)
- Group edges tracked per frame (50 % crossings) and icon template matches: the left
  buttons slide by OFF_L (+64 -> -95, hold 709-712.4, -> 0 at 716 with a +5 overshoot),
  the right ones by OFF_R (-55 -> +84 -> 0, -5 overshoot); 1-frame shutter, 12 samples.
- Birth flare 700.5-711.5 on the button: sharp X of two rays (701-703), then a two-lobed glow.
- Restore click (video 1402.6): 'tb.press' + 'music.restore'; the button lightens, strongest
  over the icon, peaking 1.4 frames later and decaying with tau 3.2 frames (1403-1412).

## Interactive mode
Media strip click toggles the flyout; clicks elsewhere close it; flyout rows emit hover
events; press/release on "Go to my Music" opens the window; the My Music task button
minimises/restores. The clock shows the real time ("h:mm am", and "h:mm PM" during the
entrance) outside ?demo / ?capture.

## RMSE (0-255, both blurred 1 px; login placeholder hidden; music window not in this branch)
Before = the scene's initial flat-orange placeholder.
| frames / region | before | after |
|---|---|---|
| 590 wallpaper (0-850 x 0-690) | 82.6 | 4.5 |
| 590 sidebar (858-960) | 92.5 | 28.1 (17.5 without the substituted photo tile) |
| 590 taskbar (0-858 x 699-720) | 119.6 | 16.8 |
| 640 flyout (665-858 x 258-499) | 139.5 | 12.5 |
| 521-545 entrance, sidebar without photo / taskbar | - | 14.7 / 19.0 |
| 597-605 flyout opening, flyout region 600-960 x 250-505 | - | 15.0 |
| 693-697 flyout closing, same region | - | 14.9 |
| 698-716 My Music insertion, taskbar | - | 20.0 |
| 1402-1415 restore click, taskbar | - | 18.5 |
Per tile at 590: mail 10.3, buddies 17.2, media 18.5, Go Online 18.0, header 22.7 (stand-in
picture), Seattle 26.1 (drawn skyline), thumbs 23.6, clock 20.1, start 20.4, task group 21.5.

## Shell (the usable OS on top of the video's desktop)
Files (src/scenes/desktop unless noted):
- `DesktopScene.jsx`: composition. Mounted once by App.jsx from the first frame (since =
  Infinity between sessions renders a cached tree; shell state counts from the session start via
  `shellState.setSessionFloor`), so a login never mounts it.
- Taskbar: `taskbarModel.js` (order, layout, transitions from `os/wm.js` windows; registers the
  button locator in `os/taskbar.js`), `TaskGroup.jsx` (per-button pre-mounted blur copies via
  `Blur.jsx`, insertion with the video's curves scaled to the actual gap, 6-frame removal, birth
  flare, click flash, hover), `Taskbar.jsx` (visuals), `TaskbarLayer.jsx` (entrance, Start
  button, clock + date tooltip + calendar, chevron), `appInfo.jsx` (labels/icons: the video's
  buttons keep their measured look, others come from `os/apps.js`; launchers; XP click rules).
  New windows are inserted in the middle of the group, as My Music is in the video.
- Popups: `shellState.js` ('shell.popup' { id, open }: one open at a time; 'shell.sidebar'),
  `Popup.jsx` (rise / drop / left / fade, pre-mounted, motion-blurred), `StartMenu.jsx` (after
  ref3/insp1.png), `Flyouts.jsx` (Seattle weather, calendar), `Flyout.jsx` (my Music flyout;
  rows play their track). Menus use the UI kit: desktop context menu (`deskMenu.js`), sidebar
  header menus (`sidebarMenus.js`), task button menu (`TaskGroup.jsx`).
- Sidebar: `Sidebar.jsx` (visuals; the glass is split into the sliding panel and the static clock
  foot), `SidebarHits.jsx` (every tile's action and hover).
- `src/os/session.js` (shared with the session builder): currentUser / userInfo / wallpaper;
  `src/os/media.js`: the silent player; `src/os/logIndex.js`: indexed event lookups.
- `src/apps/display`: Display Properties (Stonehenge, the leaf stand-in, plain colours).
- `src/demo/shell.js` + `?scenario=shell`: scripted shell input for bench/capture (frames 1-720;
  520-720: a window dragged under the sidebar glass, the sidebar hidden and shown over it,
  Refresh, the window dragged back out, the leaf, blue, black and photo wallpapers).
- Details: task buttons show their full label as a tooltip and have a Restore / Minimize /
  Maximize / Close menu on right-click; the calendar pages through months and selects days;
  a mail row moves the sidebar's selection, marks the mail read and opens it; Windows Tour and
  Top 10 Tasks open Help on their pages; the Start header opens Control Panel > User Accounts.

Bench (prod build, ?scenario=shell, 1-520): p50 0.6 ms, p95 3.5 ms, max 6.1 ms.
Glass section (520-720, machine load ~8, 4 repeats): window drag under the glass p50 2.8 / max
5.0 ms, sidebar hide and show over it max 3.4, Refresh max 2.6, wallpapers max 2.6. Its task
button insertion frame (528, 8 frames after the window opens) costs ~8 ms, as its twin frame 128
does on the build without live glass at the same load. The video
replay's RMSE is unchanged by the shell (every segment within 0.01 of the pre-shell capture).
