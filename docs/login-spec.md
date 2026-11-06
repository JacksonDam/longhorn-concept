# Login scene spec (video frames 1-522)

All numbers are stage px (960x720) and 1-based video frames (29.97 fps), measured on ref/frames.
Code: src/scenes/login (layout.js holds the geometry, select.js / exit.js / TileRow.jsx the timings),
demo input: src/demo/login.js.

## Background (aurora.js, ribbons.js; fitted by tools/login/*)
- The video's background is a pre-rendered loop: frames 436.. repeat frames 41.. (period 395
  frames, 13.2 s). An extra swell of light rises from frame ~140 (before the click at 168),
  peaks ~285 and has gone by ~435; it is part of the loop, not triggered by the selection.
- auroraFrame(t): frames 1..435 once, then the 41..435 loop (seam placement may move; see aurora.js).
- Coarse colour field: cubic B-spline grid (30 px spacing) keyframed every 4 frames; thin ribbons:
  keyframed curves drawn in the shader.

## Wider and taller screens (layout.js, aurora.js, Bar.jsx)
- The stage is the frame widened or heightened to the screen's shape (core/Stage.jsx: dw, dh past
  960x720; pinned to the frame under ?capture, ?bench and ?demo, where every offset below is 0).
  The login keeps the frame's relations: logo top right (+dw), Shut Down bottom left (+dh), clock
  bottom right (+dw, +dh), the bar's band full width on the bottom (+dh), and the frame's middle
  (tiles, slab, halo, panel, the aurora's fitted field) centred across on the bottom edge
  (+dw / 2, +dh; layout.js frameOffset). Offsets are whole device pixels (Stage.jsx seam).
  'login.pointer' samples are in that middle's coordinates. The slab's exit bends over to the
  stage's top right corner (exit.js slabExit corner). The power screens and the shutting-down
  message are centred (+dw / 2, +dh / 2).
- Aurora on a taller stage (dh > 0): the fitted frame scaled up uniformly to the stage's height
  (k = h / 720), centred across, its sides cropped; ribbons wider and faster with it (Aurora.jsx
  view, aurora.js uScale). The UI stays at its offsets (the tiles, slab and panel on the bottom).
- Aurora past the frame on a wider stage: coarse lattice points outside the frame take the fitted field's colour
  where a line through them along the field's grain (slope 0.36 up to the right, its least-varying
  direction) enters the frame; lines that miss it take the nearest corner's colour, settling over
  240 px to that corner's loop-averaged colour. Ribbons run on past x 0 / 960 along their tangent
  with their colour held. Nothing is stretched.
- Bar band on a wider stage: its left 120 px and right 160 px stay at the stage's ends, the middle
  stretches across (parts joined on device pixels).
- The aurora draws at the screen's pixel density (up to 3 device px per stage px), in two passes
  where float render targets exist (per canvas column: ribbon centrelines, slopes, colours and the
  coarse rows; then per pixel lookups), else one; ?aurora=one forces the single pass.

## Logo (Logo.jsx)
- Lockup = assets-src derived XP stacked logo (535 x 356.2 units), drawn at 142.1 px wide,
  top-left (706.25, 48.4). Split by paths into flag.svg (flag + shadow, recoloured) and
  wordmark.svg ("Microsoft", "Windows", white).
- Flag colours: the video's flag is pastel. Fitted affine colour matrix (3x4, applied to every
  flag colour; black/white kept):
  R' = .290R + .118G + .001B + 168.4, G' = .094R + .430G + .060B + 144.4,
  B' = .127R + .039G + .584B + 106.5.
- VAIO: logopedia vector, white, 76.5 x 17.6 at (762.75, 168.75), strokes thickened by 1.8 units
  (the video's bloom makes it bolder).

## Bar (Bar.jsx)
- Top highlight line y 573.5-575.5 (fades out at x < 40 and x > 860); translucent light band
  below; light line at y 716, dark last row y 719.
- Shut Down orb: centre (65.2, 641.8), r 14.7: light rim, blue body lighter at the bottom,
  white top highlight, vertical power line y 637-646. Label "Shut Down" centred, y ~677,
  Franklin 600 12.5 px, rgb(214,232,255) with a soft dark drop shadow.
- Clock pill: x 826-924, y 632-658; body #2b6fea -> #4c8bf2, lighter slanted band at the left
  end, lighter rounded cap x 909-921; text "7:09 PM" (demo) / real time (interactive),
  14.5 px rgb(90,156,255).

## Tiles (Tile.jsx, TileRow.jsx)
- 55.2 px squares, top 607.2, radius ~4.5; centres 363.2 + 100 i (5 tiles). After a selection
  the 4 others sit at 341.5, 438.3, 535, 631.7.
- Picture = blue duotone (gradient map from luminance, measured ramp (24,82,164) -> white),
  2 px half-white glass frame, vertical sheen at 80% width, drop shadow down-left.
- Labels: Franklin 600 12 px, centre y ~679, rgb(214,232,255), dark soft shadow.
- Hover pictures are washed out in the video (saturation ~0.2, floor ~95): users/*-hover.webp =
  (desaturate 0.8) * 0.62 + (90, 95, 105).
- Hover (continuous across events): colour cross-fade 2 frames in / 2 out; scale grows
  linearly over 3.6 frames, shrinks over 1.6. Two hover sizes appear: the first sweep
  (frames 48-73, right to left) enlarges to 1.27 with a bold, 1.5 px larger label moved 5 px down;
  the second sweep (87-116, left to right) only colours the tile and scales it to 1.1 (Sondra
  drops from the big to the small hover at 66.5). Demo events: one frame before each half-way
  frame.

## Selection (select.js; select event at frame 168)
- k = frames since select. Neighbours spread 5 px (k 0-3). The tile hands over to the 3D slab
  (k 1.5-2.5, whitish cross-fade), pops to 1.22 (k 3), settles to 0.97 (k 6-8), a white light
  pools under it and the label glows white (k 5-17), it swells again to 1.28 (k 15.5).
- Launch at k 16 (frame 184). Flight keys (centre x, y, apparent size, spin deg):
  184 (465,622) 80; 185 (457,572) 100; 186 (447,497) 122 /12; 187 (432,432) 142 /58;
  188 (417,367) 158 /92 (edge-on); 189 (392,339) /126 (back face, mirrored); 190 /166;
  191 /196; 192 /228; 193 /262 (edge-on); 194 /292; 195 /320; 196 /340; 197 /352; 198 rest
  (380,347), ~170 px. Motion blur: 12 samples, 1-frame shutter.
- Flight lighting (face brightness / light band): darkens as it turns away (186 0.72 with a band at
  the left, 187-188 ~0.3, 192-193 0.45) and catches a white glint while coming round
  (194 band u .42 x1.5, 195 u .27 x1.3, 196 u .2 x.7, 197 x.3). The back face shows the picture
  mirrored (glass), frames 189-191.
- Rest: tilted 4 deg (top right raised). Sway (deg, + = right side toward the viewer):
  198 0, 204 +20, 210-216 +38..40 (face in shade, right glass edge lit), 228 +12, 250-280
  -20..-26 (white band on the left of the face), 288-340 ~+2, 348-394 -12..-39 (band),
  406-510 ~+2. Interactive: the turn repeats every 200 frames after k 250.
- Remaining tiles slide k 18.6-27.1 (frames 186.6-195.1), ease-out quad, measured from template
  tracking; labels fade out at once and return as they settle.
- Password panel sweeps in from behind the slab (k 25-31, frames 193-199) with long horizontal
  blur and a small overshoot (offset keys -300, -175, -10, +55, +80, +60, +15, +2, 0 px).
- Panel: "Sondra" Franklin 600 15.4 px at x 521, top ~301; "sondra_hsm@hotmail.com" 10.5 px at
  y 323-331; "Enter Password to begin" 7.8 px rgb(159,188,245) at y ~350-359; field x 516-666,
  y 366-379 (white pill); go orb centre (688.5, 371) r 12 with a dark ring.
- Bullets: one per key at frames 395, 402, 409, 416, 423, 430 (no fade); centres x 528 + 13.4 i,
  y 372.6, glass blue spheres 9.4 px.

## Exit (exit.js; submit at frame 510)
- Layer alpha (measured): 512 1, 513 .93, 514 .83, 515 .70, 516 .55, 517 .40, 518 .27, 519 .14,
  520 .06, 521 0. LOGIN_EXIT = 12 frames.
- Bar tiles flip edge-on within a frame and drop, left to right 2 frames apart (Jenny 511,
  Tommy 513, Kelly 515, Angela 517).
- Flag spins in place (512) then flies down-left fading (513-514); words/VAIO fade 513-516.
- Slab flies to the top right corner, shrinking and spinning: 512 (388,325), 513 (400,263),
  514 (440,213), 515 (488,147), 516 (541,85), 517 (657,52), 518 (771,35), 519 (860,15).
- Panel fades 512-515; Shut Down and clock fade 511-515.

## Motion blur (blur.js; fitted with tools/login/fit_blur.py, then judged by eye)
- [samples, shutter in frames, phase]: slab flight [6, 0.6, -0.5] (4-6 discrete copies ~17 px
  apart at 185-187); tile slide [6, 1.25, -0.6] (RMSE minimum); panel sweep [32, 1, -0.5]
  (continuous streak); flag and tile exit [10, 0.9-1, -0.5].

## Interactive behaviour (not in the video, built to match its language)
- Hover any tile: the enlarged hover (pointer events emit login.hover with big: true).
- Click a tile: the same selection sequence as the video. Panel shows the name; the e-mail line
  only for Sondra (the only one the video shows).
- Click another tile while one is selected: the old slab flies back (the flight reversed,
  14 frames) while the bar reopens to 5 slots (k 2-10.5), then the new one runs the normal
  sequence. Escape or a click on the background: the slab flies back and the bar reopens.
- Typing adds a bullet per key (max 10 shown), Backspace removes one, Enter or the go orb submits
  (any password). Shut Down does nothing. The clock shows the real time (h:mm AM/PM).
- Local verification aids: ?capture&refbg (reference frame behind the UI), ?capture&nobar
  (aurora without the bar, for tools/login/fit_bar.py), ?mb={...} (blur overrides),
  ?slab={...} (slab material overrides).

## Session flow (os/session.js, App.jsx, scenes/session/PowerScreens.jsx)
- Screens from the event log: login -> desktop ('login.submit' { id }), desktop -> login
  ('session.logoff', 'session.switch'), login|desktop -> shutdown ('session.shutdown') -> off
  (timed) -> boot ('session.boot', the off screen's power button) -> login (timed).
- After the second reference video (ref2 f02775-f02888): log off / switch user is a hard cut from
  the desktop to the login screen (ref2 2798 -> 2799); shutting down shows the login screen (held
  28 frames when coming from the desktop) and fades it linearly to black over 61 frames
  (ref2 2827-2888). Booting fades the login screen in from black over 30 frames (not shown in
  either video). The off screen is black with a glass power button (needed to switch back on).
- Each login visit starts afresh (loginSince: selection, password, hovers and submit count from
  the visit's start). The login scene stays mounted while hidden (aurora canvas paused), so a
  visit starts without a new GL context or shader compile.
- currentUser(t) = { id, name, email, picture, washed } on the desktop, else null.
- Any user can log in with any password. Switch User currently behaves like Log Off (wm.js clears
  the windows on every 'login.submit').
- `?scenario=session` (with ?capture, ?bench or ?demo) replaces the video's input with the
  scripted flows in demo/session.js (Tommy, log off, Kelly, switch user, shut down from the login,
  boot, Angela, shut down from the desktop, boot); bench with
  `node tools/bench.mjs 1-1000 --url http://localhost:5201/longhorn-concept/?scenario=session`.
- Debug: `__lh.emit('session.logoff')` etc. drives the flow by hand.

## Performance notes (docs/briefs/perf.md)
- One rendering path: the slab canvas is cropped to the slabs (64 px steps so render targets are
  reused), the shared slab GL canvas has no MSAA / preserved buffer, the aurora canvas is opaque
  without a preserved buffer, blur copies get their own layers (`will-change`) while moving.
- Layers that move while composited are laid out at fixed positions and moved by transforms only;
  sliding tiles move in whole device pixels, so a composited copy looks the same whatever frame
  it was first rasterised on (capture output does not depend on seek order).
- The slab halo is a pre-rendered glow image (no per-frame box-shadow blur). The panel's 32 blur
  copies mount 8 per frame ahead of the sweep (k 20.5-24.5); its soft shapes use gradients, not
  SVG blur filters.
