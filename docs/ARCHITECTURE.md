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

## Verifying against the video
- Dev server: `npx vite --port <port> --strictPort` (main tree uses 5299 on 127.0.0.1; another project uses 5199).
- `node tools/capture.mjs "180-200,300" --out out/cap --url http://localhost:<port>/longhorn-concept/?capture`
  writes the app's own frames at exact video times.
- `python3 tools/rmse.py "180-200" --cap out/cap [--crop x,y,w,h] [--blur 1] [--sheet out/x.png] [--grid]`
  RMSE (0-255) vs the reference + a reference|app|diff composite. Use crops for element-wise work.
- `python3 tools/sheet.py out.png start end step [cols] [scale] [crop]` makes labelled contact
  sheets of reference frames.

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
