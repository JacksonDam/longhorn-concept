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
- Only ever has the wallpaper behind it (the music window never passes under it), so the
  backdrop is precomputed from the graded wallpaper at 2x: `out = k(x) * blur2(bg) + t(x) + g(y)`
  per channel. k(x) is an alpha-like gain shared by the channels, 0.33 at the left edge
  to 0.72 at the right; t(x) a bluer-left tint; g(y) carries the tile bands and the 1-2 px
  separators (y ~23, 61, 257, 307, 517, 593, 620, 697). Fitted on the empty panel of
  frames 521-523 (RMSE 2.7) and on the clock foot rows 700-720. `glass.webp` 204x1440.
- Left border: bright line at x 859-860.

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
- Bar: per-row colour at alpha 0.55 over the wallpaper (top highlight rows 700-701), fitted
  on frames 575-592 / 1150-1350. Start end slightly darker.
- Start: flag (XP flag SVG, monochrome white-blue) 7,702 17x15; "start" Plex 600 13 px at x 29.
- Task group: light blue band (top 2 rows 172,214,223; body 110,180,250), sticks up 1 px.
  Libre Franklin 600 9.9 px white, faded on the right edge of each button.
  4 buttons: group 248-675.5, separators 379.5, 481.5, 589.5.
  5 buttons: group 185.5-730.5, separators 312.5, 412.5, 644.5 (none between My Music and
  Document, as in the video). Icon/text offsets per button in `Taskbar.jsx`.

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
