# Performance and parity rules (every builder)

Target: the app renders at **144 fps** on the user's machine (Apple M4, 1920x1080 display at
144 Hz, so the stage is 1440x1080 at devicePixelRatio 1), with **parity**: real-time playback
draws exactly what `?capture` draws for the same time.

## Parity
- One rendering path. `CAPTURE` may only change the time source and input (seeked clock, demo
  events), never what is drawn: no capture-only sample counts, crops, frozen content, quality
  switches or layer hints. If a real-time shortcut is good enough to ship, it is the capture path
  too; if it isn't good enough for capture, it isn't good enough to ship.
- After a perf change, re-run the RMSE of the affected frames (tools/capture.mjs + tools/rmse.py)
  and keep it within +0.3 of before per segment (better is fine). Say which frames you checked.

## Measuring
- **Bench the production build**, not the dev server: dev React (jsxDEV, prop validation,
  render logging) costs 2-4x more per frame and hides the real numbers. In your worktree:
  `npx vite build && npx vite preview --port <your dev port + 100> --strictPort` (re-run the build
  after changes; preview serves dist/ fresh), then pass that URL to bench/profile.
- `node tools/profile.mjs 800-900 --url <base>` prints per-frame JS / style+layout+paint time and
  the top functions by self time on the bench path.
- `node tools/bench.mjs [frames] --url http://localhost:<port>/longhorn-concept/` steps the
  capture path one video frame per animation frame with vsync off at 1440x1080 and prints
  per-segment p50/p95/max frame cost and the frames over 6.94 ms. Use all frames of your segments
  (e.g. `694-716,1353-1415`), not every 3rd.
- `UNCAPPED=1 node tools/perf.mjs <base url>` plays `?demo` in real time with vsync off.
- Interactive features (new windows, menus, drags) must be benched too: add a short scripted
  input to the bench (or a demo-like event list behind a URL flag) for what you build, so its
  animations can be stepped and measured the same way.
- Goal: every frame under 6.94 ms on the bench, with headroom (aim for p95 under 5 ms). One-off
  costs (first use of a shader, image decode, DOM mount) must happen before the animation that
  needs them (preload/pre-mount/warm up at load or when the window opens), not on its first frame.

## Techniques that fit this codebase
- Don't re-render big React trees per frame. Keep static DOM memoised and outside `useTime()`;
  animate with transforms/opacity on a few wrappers. Never mount DOM at the start of a motion:
  pre-mount motion-blur copies (hidden) while the element exists.
- Motion-blur copies: one rasterisation, many transforms. Give each copy its own compositing
  layer (`will-change: transform`) and keep its content static during the move, so a frame is a
  composite, not a repaint. If copies must show changing content, render it to a texture once
  per frame and draw the copies in WebGL instead.
- Slabs (gl/slab.js): render once per frame per distinct slab and share the result between DOM
  copies; crop canvases to the slab's bounds; keep accumulation samples only where the video
  shows blur.
- Filters (`filter: blur()`, SVG filters, backdrop-filter) on large or moving elements are
  expensive: prefer pre-blurred images or WebGL.
- You may change the tech (WebGL / three.js / WebGPU / OffscreenCanvas / canvas 2D) for any part
  if that's what it takes; keep text crisp at any scale.

## Cold start (the first run on a new machine)
A warm session holding 144 Hz says nothing about the first run: there every kind of draw is new
to the GPU, and the first appearance of each costs a pipeline compile (Chrome on macOS: Skia
Graphite on Dawn / Metal, compiled on worker threads, but the frame that needs it waits; tens to
hundreds of ms each with an empty system shader cache, ~160 for the login-to-my-Music path),
besides first decodes, first runs of code and first layouts. The boot (ARCHITECTURE.md, Boot)
pays all of that under the black screen before the clock starts; keep it that way:
- New one-off costs go into the boot. Images in `public/img` and registered apps are picked up
  automatically; a new interaction or animation that no script shows needs an event in
  `core/rehearsal.js` (its frames: the first frames of the motion, the motion-blur copies,
  settled). Don't add work that runs after the boot on a timer or idle callback: the login
  screen animates the whole time, and a GPU compile stalls every frame until it is done.
- The boot screen above the warm-up (index.html, `scenes/session/bootScreen.js`) stays at opacity
  0.999 and animates only opacity and transform: an opaque cover would let the compositor cull
  everything under it (no pipelines compiled), and anything else would stop animating while the
  main thread is busy. Check a change to it with `--trace` and `TRACE_CATS=blink.user_timing,gpu.dawn`
  (the GPU pipelines compiled after the boot should stay a handful of small ones).
- Measure with `tools/coldstart.mjs` on the production build served by `tools/pages.mjs`
  (HTTP/2, gzip and the live site's cache headers; `vite preview` sends no-cache and no gzip):
  `npx vite build && node tools/pages.mjs --dir dist --port <your prod port>`, then
  `node tools/coldstart.mjs --url https://127.0.0.1:<port>/longhorn-concept/ --runs cold,warm`.
  A fresh `--user-data-dir` per cold run (cold HTTP cache, GPU program cache, V8 code cache), the
  real interactive flow at real speed (the tools/interact.mjs steps, then every app from the
  Start menu twice), per-phase frame stats: missed frames, frames over 25 / 50 ms, stall ms (the
  display time lost). `--cpu 4` (weaker laptop), `--net 20,40` (Mbit/s, RTT ms), `--flow login`
  (to my Music only), `--shots`, `--trace` (with `--trace-secs`: attributes every frame over
  25 ms: main-thread events, JS functions via the source map, GPU pipelines compiled with their
  labels), `--compare a.json b.json` (side-by-side), `--page` (table of a raw run).
- The display: headless Chrome has no 144 Hz vsync, so the tool runs it unpaced (vsync and the
  frame-rate limit off) and paces the page's requestAnimationFrame to a 144 Hz grid (a 1 px
  change on every native frame keeps Chrome from idling down to ~55 Hz between ticks). A missed
  vsync is then a 14 ms interval. Unpaced (`--hz 0`, like bench.mjs) the aurora renders ~1000 fps
  and saturates the GPU process: other GPU work queues behind hundreds of WebGL frames and shows
  as 500 ms stalls a real display never has.
- A fresh profile alone keeps the system's shader cache warm (macOS keeps compiled Metal
  functions per app in the user cache dir), so it hides most of the GPU cost. `--new-machine
  --chrome <Chrome for Testing binary>` empties that build's own Metal cache before each cold run
  (the installed Chrome's is never touched): a brand-new Chrome install, the worst case. Get the
  binary matching the installed version from
  storage.googleapis.com/chrome-for-testing-public/<version>/mac-arm64/chrome-mac-arm64.zip.
- Results, 2026-11-05 (M4, full flow: login to my Music, then every app from the Start menu;
  stall = display time lost to missed frames; before = main, after = the boot):
  | variant | before: visible / stall / frames > 50 ms | after: boot / stall / frames > 50 ms |
  |---|---|---|
  | fresh profile, cold | 0.42 s / 163 ms / 0 (intro 46 ms) | 2.5 s / 21 ms / 0 |
  | same profile, warm | 0.44 s / 208 ms / 0 | 1.3 s / 45 ms / 0 |
  | brand-new Chrome (`--new-machine`), cold | 2.9 s (first 2.8 s of the intro lost) / 11.8 s / 35 | 7.9 s / 0.7 s / 1 |
  | brand-new Chrome, warm | 1.1 s / 0.9 s / 0 | 1.4 s / 0.25 s / 0 |
  | `--cpu 4`, cold | 1.1 s / 11.0 s / 13 (intro 198 ms) | 5.5 s / 7.2 s / 0 |
  | `--net 20,40`, cold (login flow) | 0.6 s / 170 ms / 0 | 2.6 s / 158 ms / 0 |
  At 4x CPU most of the stall is steady state (my Music and the app windows miss 144 Hz on
  every motion), which the boot doesn't change. `__lh.bootStats` (printed by coldstart.mjs)
  splits the boot into fonts, images and the rehearsal's parts.

## Memory (phones)
A phone's browser kills a page whose memory passes the OS's limit (iOS counts the WebContent
process, with what the GPU process allocates for it), and Safari then reloads it: the live site
did that on iPhones at boot, with my Music open and with many windows open. Budget: under
500 MB peak for the heaviest scenario at iPhone size (390x844, DPR 3).
- `node tools/memory.mjs --engine chrome|webkit|ios --url <prod build> [--device
  iphone|land|ipad|desktop] [--quick] [--query rehearse=all] [--json out.json] [--shots dir]`
  plays `?demo&scenario=windows` (src/demo/windows.js: boot, log in, my Music, an album,
  minimise / restore, every launcher app opened and left open, three minutes of use) and prints
  the peak footprint (phys_footprint, what iOS's limit counts) per phase and per process kind,
  the long frames per phase, the boot's timings, the page's layout and page errors. chrome:
  headless Chrome emulating the device; webkit: Playwright WebKit (`npx playwright install
  webkit` once); ios: Mobile Safari on an iOS Simulator (Xcode with an iOS runtime). `--quick`
  stops after the apps have opened (~50 s). The page reports to the harness through `?report=`
  (core/report.js). Runs on the same engine queue behind a lock file.
- The simulator allocates the page's IOSurfaces and Metal memory in host processes
  (SimRenderServer, SimMetalHost), not in its WebContent or GPU process: the harness counts their
  growth since before the page opened as `render`. Without it a simulator run shows a quarter of
  the real footprint.
- What WebKit backs (vmmap of its GPU process): every composited layer at its size before any
  CSS transform, times the device pixel ratio (an ancestor's downscale doesn't shrink it: the
  reason for the viewport fit, ARCHITECTURE.md, Stage); a layer at opacity 0 or 1e-4, or under
  visibility: hidden, still has its backing store; backing stores are double-buffered while they
  change; a canvas is its own surface at its pixel size. So on a phone every mounted layer costs
  memory whether it shows or not.
- `node tools/layers.mjs [--url <prod build>] [--query ...] [--at s] [--emit js] [--all]` lists
  WebKit's own layer tree at a state (Web Inspector's LayerTree through Playwright WebKit): every
  composited layer with its backing memory, WebKit's reasons and the element. Most of the
  desktop's layers were `overlap` ones: anything that paints above a composited layer (the
  glass, a window, a canvas) and overlaps it is composited too, and backed at its own box, so a
  full-stage `inset: 0` wrapper around a clock cost a stage-sized backing store. Wrappers of
  content placed by left / top are points (`core/point.js` POINT: 0x0 at the stage's origin):
  the settled desktop's layers went from 63 to 25 MB (one buffer each). A hidden subtree that
  stays mounted skips rendering (`content-visibility: hidden`, the login scene under the desktop).
- Canvas sizes: devicePixelRatio already includes the page zoom on a phone (index.html), so
  size canvases by `stage scale x devicePixelRatio` (`core/Stage.jsx deviceScale(s)`: capped at 3
  on phones, 4 on desktops) and never multiply by `visualViewport.scale` as well (that drew the
  my Music slabs at 0.17 of their shown pixels).
- No rehearsal on WebKit (ARCHITECTURE.md, Boot): its long frames per phase were the same with
  a full, a video or no rehearsal (Playwright WebKit and the simulator), and a full one ran to
  the 10 s deadline on the simulator. Chrome keeps it (its GPU pipeline compiles are what the
  rehearsal moves), three apps at a time.
- Decoded images aren't kept by a preload (nothing holds them; the login's memory measured the
  same with and without the public/img preload in both engines). What was kept: the 150 photo
  stand-ins, each rasterised through its own SVG image and canvas, all at once (~85 MB in
  WebKit); they now go four at a time and free both when done.
