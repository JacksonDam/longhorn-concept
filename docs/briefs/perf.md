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
