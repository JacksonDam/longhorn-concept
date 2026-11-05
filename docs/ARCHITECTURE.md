# Longhorn Plex demo rebuild: architecture and conventions

Goal: an exact, interactive web clone of the 2003 Longhorn "Plex" demo video
(YouTube z7vg9lT1scg, "lh_plex_demo\media\EFFECTS.WMV", 51 s, 960x720, 29.97 fps).
Vite + React app deployed to GitHub Pages (base `/longhorn-concept/`).

## Reference material (local only, gitignored)
- `ref/frames/fNNNNN.png`: all 1529 frames, 1-based, 960x720. Frame n is at t = (n-1)*1001/30000 s.
- `ref/effects.mp4` (with audio), `ref/sheets/` contact sheets, `ref/framediff.txt` (frame-to-frame RMSE).
- `ref/cursor_track.txt`: tracked cursor tip per frame (frame x y score; score < ~400 is reliable).
- `assets-src/`: downloaded source art (logos, font, wallpaper, account pictures) + `SOURCES.md`.

## Stage
- Everything is authored in **video pixels**: a 960x720 stage (`core/Stage.jsx`), scaled to fit the
  window. Measure positions straight off the reference frames; no unit conversion.
- Fonts: Franklin Gothic (user's personal licence, see assets-src/fonts) is the Plex UI face.

## Time, events, determinism
- `core/clock.js`: `now()` is the only time source. `?capture` freezes it; the capture tool seeks it.
  In real time (`?demo` included) it is held at 0 until the boot starts it (`startClock()`, see Boot).
  **Never use CSS transitions/animations, setTimeout-driven visuals or Date.now() for visuals**:
  every visual must be a pure function of (time, event log).
- `core/events.js`: an append-only time-stamped event log. User input calls `emit(type, data)`;
  components derive state with `last(t, pred)` / `all(t, pred)` and animate from event times.
  Hover is an event too (`emit('hover', { id, on })`), so hover animations replay exactly.
- `core/time.jsx`: `useTime()` (re-renders every frame) and `useEvents()` (re-renders on new
  events). Keep heavy static DOM in memoised components that don't read `useTime()`.
- Demo playback (`?demo`, and always under `?capture`): `src/demo/*.js` lists the video's input as
  `{ frame, type, ...data }` events per scene, plus the cursor path in `demo/cursor.js`.
  Any real input during `?demo` hands control to the user from that moment.

## Motion blur
The video uses multi-sample (accumulation) motion blur: fast moves show several discrete,
semi-transparent copies. Reproduce it the same way:
- DOM: `<MotionBlur t pose={(tt) => style} moving samples shutter phase>` (core/MotionBlur.jsx)
  renders the children `samples` times at sub-frame times with plus-lighter accumulation.
  Fit `samples`, `shutter` (seconds the shutter is open) and `phase` per animation against the
  reference (count the ghost copies, measure their spread vs the per-frame displacement).
- 3D tiles: `<Slab3D items=[{ slab, pose }] moving samples shutter phase>` (gl/Slab3D.jsx, gl/slab.js):
  glassy rounded slabs (picture face, glass edges, softbox reflection, fresnel rim) rendered by
  one shared three.js renderer, accumulated in half float, copied into a DOM canvas.

## Glass (sidebar, clock foot, taskbar)
The Plex glass is live, so it shows whatever is behind it: the wallpaper choice, windows dragged
under it, the Refresh dim.
- Sidebar panel and clock foot (`scenes/desktop/Sidebar.jsx` `Glass`):
  `out = k(x) * blur(backdrop) + tint(x, y)`. One element blurs (`backdrop-filter:
  blur(GLASS_BLUR)`, 2.4 stage px) under a black layer of alpha 1 - k(x) (a CSS gradient through
  the stops in `glassFit.js`, k 0.32-0.75 left to right); a second element adds the tint
  (`glass-tint.webp`, 102x720) with `mix-blend-mode: plus-lighter`. Both are fitted by
  `tools/desktop/fit_glass.py` against the empty panel of video frames 521-523 and the clock foot
  of the later frames (docs/desktop-spec.md has the numbers and how to refit).
- Taskbar (`Taskbar.jsx` `Bar`): its per-row colours at alpha 0.55 over the same blur.
- Rules: the glass elements carry their own opacity and transform. An ancestor with opacity < 1,
  a filter, mask, clip-path, blend mode or isolation becomes the backdrop root (the blur then
  sees nothing and the tint adds to nothing), and a transformed or isolated wrapper isolates the
  tint's plus-lighter blend. So never wrap them in a fade or slide group; and anything that should
  show through the glass must be drawn before it in the same stacking context (windows are:
  `WindowLayer` sits under the sidebar and the taskbar).

## Verifying against the video
- Dev server: `npx vite --port <port> --strictPort` (main tree uses 5299 on 127.0.0.1; another project uses 5199).
- `node tools/capture.mjs "180-200,300" --out out/cap --url http://localhost:<port>/longhorn-concept/?capture`
  writes the app's own frames at exact video times.
- `python3 tools/rmse.py "180-200" --cap out/cap [--crop x,y,w,h] [--blur 1] [--sheet out/x.png] [--grid]`
  RMSE (0-255) vs the reference + a reference|app|diff composite. Use crops for element-wise work.
- `python3 tools/sheet.py out.png start end step [cols] [scale] [crop]` makes labelled contact
  sheets of reference frames.

## The OS layer (added overnight 2026-11-05)
The video's sequence is replayed by `?demo` / `?capture`; outside it the app is a small usable
OS in the same style. Everything still derives from (time, event log).
- `src/os/session.js`: screen flow (login, desktop, shutdown, off, boot), current user, wallpaper.
  The power button's boot shows the same boot screen for one fade-in and one pass of its blocks
  (`BOOT_SCREEN`, drawn from the clock by `PowerScreens.jsx` `BootScreen`), then the login fades in;
  the page load's own boot (a log starting with `session.boot` at t = 0) only fades in.
  `src/scenes/session/` draws the power screens. App.jsx keeps the login and desktop scenes
  mounted (hidden) so switching between them never mounts a scene.
- `src/os/wm.js`: window state from 'win.*' events (legacy 'music.*' aliases); the four
  running-at-login windows exist minimised. `src/os/taskbar.js`: where each window's taskbar
  button is (the shell registers a locator), so windows minimise into their own button.
- `src/os/apps.js`: auto-registry of `src/apps/*/index.{js,jsx}`. An app is
  `{ id, title, taskbarLabel, icon, size, position, explorer, Content, usesActive?, ... }`;
  `src/os/PlexWindow.jsx` draws it (frame, title bar, drag/resize/maximise, open/minimise/restore/
  close animations with multi-sample blur), `src/os/ExplorerChrome.jsx` is the my Music-style
  toolbar block, `src/os/WindowLayer.jsx` renders all windows. Every motion-blur copy draws the
  app's full Content (memoised snapshots, re-rendered when the content settles on new state,
  `copyKey`); there are no stand-in copies. Copies mount one per frame from the open (two
  frames in) and are rasterised in their first visible pose before the window shows (an
  opening window's layers are never hidden: revealing one costs ~3 ms). Other parked layers
  (closed, never shown) carry `content-visibility: hidden`, so a session that opened many
  windows costs nothing per frame for them; a window running at login rasterises its copies one
  per step of the background mount queue, not all at once; a closed window also lets its
  compositing layers go. Idle copies of a shown window rest on its rect at opacity 1e-4 (drawn,
  so they stay painted and rasterised; at opacity 0 Chrome lets them go); the windows running at
  login rest at opacity 0 until their first restore (painted, not drawn: no GPU memory or fill
  for their full-size copies). Idle copies keep the size the window settled at while it is
  resized or maximised. Each window's layers sit in one group
  positioned by a transform, so a drag moves one transform. `usesActive: true` marks Content
  that draws differently when the window isn't active (otherwise focus changes don't re-render
  it).
  `src/os/ErrorBoundary.jsx` keeps a crash inside its window.
- Input and the log: continuous input (window drags and resizes) goes through
  `core/time.jsx nextFrame`, one event per frame at the frame's time, emitted in the same render
  as the clock tick. The log grows in place at its end (`core/events.js` epoch: bumps only when
  it is replaced or an event lands before its end), so `os/logIndex.js` (by type and type + id,
  `lastOfTypes` / `allOfTypes` / `typesKey`), the window manager's fold (`os/wm.js`, with
  checkpoints for looking back) and the per-window event times extend incrementally: an event
  costs O(1) however long the session's log is. State that only reads some event types keys its
  cache on `typesKey(types)`, not the log version, so window moves don't invalidate it.
- Window chrome rules (details in docs/briefs/os.md, "Window chrome rules"): only the window's
  outline is rounded (title bar top corners, bottom corners, radii in `src/os/frame.js`; the
  client area is clipped to them);
  every bar and edge panel inside runs square and flush. `src/os/shadow.jsx`: the drop shadow
  fitted on the video (pre-rendered nine-slice strips on one layer per window that follows the
  window, during motion blur at the shutter's middle pose; blur copies carry none; nothing is
  blurred per frame); maximised windows are square with no shadow.
  `src/os/focus.js`: which windows look active (`activeIds`: hand-over rules for open, close and
  minimise) and the 4-frame cross-fade of the look (`activeLevels`), pure functions of the log;
  `src/os/look.jsx`: the inactive look (a wash over the window's top chrome, `app.chromeTop` px,
  in one small layer per window whose opacity alone cross-fades; a lighter shadow). Blur copies
  always draw the active look.
- `src/os/media.js`: the silent media player shared by the sidebar strip, flyout, my Music, Winamp.
- `src/ui/`: Plex controls (menus, dialogs, fields, sliders, list views, tabs, scroll views,
  tooltips). Apps wrap Content in `scoped()` and use `wid(win, name)` ids.
- `src/scenes/desktop/`: wallpaper, sidebar, taskbar, Start menu, flyouts, desktop menu.
- Design sources beyond the video: docs/briefs/days-video.md (second demo video: pictures apps,
  log off), docs/briefs/start-menu-mockup.md (Start menu, my Programs & Services).

## Boot (real time only)
`core/boot.js`, started by App.jsx; `?capture` / `?bench` never boot (they wait on `__lh.ready()`).
What shows is the Longhorn boot screen of builds 4015-4029 (`scenes/session/bootScreen.js`, sources
in assets-src/SOURCES.md section 10): vite.config.js inlines it into index.html, so it is on screen
from the first paint, before the bundle has loaded, and its fade-in and progress blocks are CSS
animations of opacity and transform only (they run on the compositor while the main thread is busy).
It sits above the page at opacity 0.999 (an opaque layer would let the compositor skip drawing the
warm-up under it), and the boot removes it when the clock starts: the screen is then the session's
black at t = 0 and the login fades in (`session.boot`). App.jsx removes it at once under capture.
Under it, the clock is held and the stage shows the session's black layer (App.jsx `Scenes`, the
element the boot fade uses) at opacity 0.999 while the OS:
1. loads every font face (`document.fonts`), every file under `public/img` (the list is the
   `virtual:boot-assets` module from vite.config.js, so new images are included automatically),
   the scenes' `preload()` / `waitFor()` assets and the slab textures; the login screen is mounted
   and drawn meanwhile;
2. rehearses (`core/rehearsal.js`): a scripted session (the video's input, the shell scenario,
   every registered app from `os/apps.js` in batches (`rehearseWindows`, the place for other
   window warm-ups), log off / shut down / boot) drawn state by
   state, each state only once the GPU has caught up with the previous one (a 1 px WebGL
   readback). Every first-time cost lands here: GPU pipeline compiles (Graphite / Dawn / Metal on
   macOS: one per new kind of draw, blend or render-pass format; tens to hundreds of ms each on a
   cold shader cache), WebGL program links, texture uploads, decodes at drawn sizes, glyph
   rasterisation, the first run of each component's code, first style / layout / raster;
3. installs the start log (real OS: `session.boot` at t = 0, so `os/session.js` starts powered
   off and the login screen fades in from black; `?demo`: the video's input) and starts the clock.

A browser's first boot of a build rehearses everything (~2 s on the M4, more on a slower or
brand-new machine); later boots (localStorage `longhorn.boot` = bundle URL + user agent) rehearse
the video's path only. A 10 s deadline ends the boot whatever is left; that part then happens on
first use. `?rehearse=all|video|none` overrides the level, `?boottrace` records each rehearsed
state, `__lh.bootStats` has the timings, `__lh.booted` says whether the clock runs.
Rules: one-off work (a new asset kind, a new scripted interaction, a new app) belongs in the boot:
images in `public/img` and apps are picked up automatically; a new interaction or animation that
none of the scripts shows should get an event in `core/rehearsal.js`. The boot black must stay the
session's own black element: a separate cover changed the layers enough that the GPU compiled new
pipelines on the first frames of the fade-in. Nothing in the rehearsal may persist: it only
emits into the event log, which the boot replaces. The boot black is an overlay on top of the
scenes, never an opacity group around them (see Glass).

## Performance (144 Hz)
See docs/briefs/perf.md. Bench the production build: `npx vite build && npx vite preview --port
5398 --strictPort --host 127.0.0.1`, then `node tools/bench.mjs 1-1529 --url
http://127.0.0.1:5398/longhorn-concept/` (scripted interaction benches: `?wmbench&`, `?apps=all&`,
`?apps=opens&`, `?apps=focus&` (focus switches, frames 1530-1800), `?apps=every&` (every app
opened, minimised, restored, closed; `node tools/appbench.mjs --dpr 1.5` prints the per-app,
per-phase costs), `?scenario=shell&`, `?scenario=session&` with frames past the video's end).
Real input: `node tools/dragbench.mjs --dpr 1.5,2 --rate 144,1000 [--scenario ...] [--prefill
5000,20000] [--trace|--profile]` drags windows with CDP mouse events at a mouse's report rate in
the real-time app (vsync off) and prints each run's frame-cost percentiles.
`tools/profile.mjs` gives per-frame JS / style+paint split and the top functions.
Cold start ("the first run on a new machine"): `tools/coldstart.mjs`, see docs/briefs/perf.md.

## Usability audit
`node tools/audit.mjs --url <base> --scenarios desktop,start,flyout,music,album,app:<id>,...`
clicks every visible element of a scenario (state restored from the event log after each click)
and lists the ones that did nothing; annotated PNGs and JSON go to out/audit/. Expect a few
false positives: drag/resize strips, plain text, already-selected options, disabled buttons.

## Content rules
- Recreate Microsoft's UI faithfully (layout, chrome, icons, logos, wallpapers): it is the subject.
- Do not reproduce third-party copyrighted media: real album covers, photos of real people,
  film characters (e.g. the Totoro user tile). Use original stand-in art instead (generated
  graphics with similar colour/composition, or Windows XP/Vista account pictures for user tiles)
  and list every substitution in docs/SUBSTITUTIONS.md.
- Do not invent extra content the video doesn't show (no made-up apps, music, sounds). Text the
  video shows (names, track titles, mail subjects) is kept verbatim.

## Git
- Commit messages: one plain lower-case sentence, no trailers (e.g. "add login tile hover").
