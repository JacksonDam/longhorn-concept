# Builder brief: login scene (frames 1 to ~530)

Own: `src/scenes/login/**`, `src/demo/login.js`, `docs/login-spec.md`, `public/img/login/**`.
Entry: `LoginScene` and `LOGIN_EXIT` exported from `src/scenes/login/LoginScene.jsx`
(currently a smoke-test placeholder; replace it). App.jsx mounts the desktop at
'login.submit' time beneath the login layer and unmounts the login layer at submit + LOGIN_EXIT.

What the video shows (verify and refine every point):
- Background: an animated aurora of thin, glowing light ribbons over a blue gradient (dark navy
  top-left to light cyan-blue bottom-right). The ribbons drift and undulate continuously and
  brighten / multiply after a user is selected (around frames 220-330), then calm down.
  Recreate it procedurally (WebGL shader or canvas), crisp at any size, matching colours,
  ribbon count/width/glow, flow direction and speed. Fit it against the reference over time
  (mask out the logo, tiles, panel and cursor when diffing). It must run indefinitely.
- Top right: XP flag + "Microsoft Windows" wordmark (~x 705-845, y 45-145) and a VAIO logo
  below (~x 765-840, y 170-190). Use vector art from assets-src (see SOURCES.md).
- Bottom bar (~y 575-720): translucent light band with a thin highlight line on top.
  "Shut Down" round blue button + label at the left; five user tiles with names
  (Jenny, Sondra, Tommy, Kelly, Angela) centred around x 335-790, y ~607-662, labels ~y 678;
  a clock pill "7:09 PM" at the right (~x 825-925). Show the real current time in the same
  format in interactive mode, "7:09 PM" in demo/capture mode.
- Unselected tiles show their picture as a blue duotone in a white rounded frame. Hover
  (Tommy, around frames 50-75): full colour, slightly larger, label emphasised. Measure the
  timing of the hover in and out.
- Click Sondra (around frame 182): the tile turns into a 3D glass slab (gl/Slab3D) that flies
  from its slot to its resting place left of centre while spinning about its vertical axis
  with heavy multi-sample motion blur (see frames 183-198: discrete ghost copies), with a
  horizontal light-streak glint around frames 193-196; it settles ~198 and then keeps a slow
  idle rotation/wobble with a reflection band sweeping across the face and a soft white halo.
  The remaining tiles slide together to close the gap (motion blurred, ~186-192). The
  password panel appears ~196-199: "Sondra", "sondra_ham@hotmail.com",
  "Enter Password to begin", a white rounded field and a round blue go button.
  Tune gl/slab.js's material for the glass look (you own that tuning; keep its params API
  backwards compatible, the music scene uses the same component for its 3D tiles).
- Typing: bullets appear one by one (around frames 400-430); find the exact frames.
- Submit (around frame 509, Enter or go button): element-wise exit, ~frames 510-522: the
  flag spins/flies off and the wordmark fades, the slab flies up-right and away blurred,
  the bar tiles flip/drop away left to right (staggered), the panel fades, and the login layer
  dissolves to reveal the desktop (the desktop builder owns the wallpaper/sidebar/taskbar
  entrance; you own the login layer's exit). Emit 'login.submit' at submit time.
- Interactive behaviour: any user can be selected (name in the panel; only Sondra's email is
  known, so others show the name and the prompt without an email line), clicking another
  tile while one is selected swaps them (the old slab returns to the bar), Escape or clicking
  the background deselects, any password is accepted. Shut Down does nothing visible.

User pictures: Sondra's flower and Tommy's dog look like Windows XP account pictures; use the
real Microsoft ones if assets-src has them. Jenny (photo of a child), Kelly (a Totoro plush:
a film character) and Angela (photo of a woman) must be replaced by other Windows XP/Vista
account pictures; list them in docs/SUBSTITUTIONS.md.

The demo cursor path is handled separately; ignore the cursor when diffing (or mask it using
ref/cursor_track.txt).
