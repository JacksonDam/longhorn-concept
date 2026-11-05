# Builder brief: common part

You are one of three builders recreating, as an exact interactive web clone, the 51-second
Longhorn "Plex" demo video. Read `docs/ARCHITECTURE.md` first: it defines the stage (video
pixels), the clock/event-log determinism rule, the motion-blur primitives, the capture/RMSE
tools and the content rules. Follow it strictly.

Your working copy is a git worktree on your own branch (path given in your task). `ref/` and
`assets-src/` there are symlinks to the main project's reference frames and source art.
Run your own dev server on your assigned port and pass `--url` to tools/capture.mjs.

How to work:
1. Survey your frame range with tools/sheet.py and full-resolution crops (enlarge with
   NEAREST to read small text). Write down measurements (positions, sizes, colours, fonts,
   per-element animation timings and curves in frames) in your spec file under docs/.
2. Build the static layout first and get its RMSE down on still frames (use --crop per
   element and --blur 1; the reference is a soft 960x720 video, so judge crispness by eye
   and layout/colour by RMSE). Then animations: compare frame by frame, element by element,
   fit timing, easing, travel, rotation, opacity, and motion-blur sample count/shutter.
   Pay particular attention to the motion blur (discrete ghost copies) and to the fact
   that elements animate individually with staggered timings.
3. Add your segment's input to `src/demo/<scene>.js` (frame numbers), so `?capture` replays
   the video and your RMSE runs reflect the real sequence.
4. Make it interactive too: real clicks/keys/hover go through `emit()`, and the interactive
   result must look exactly like the demo result.
5. Report RMSE before/after for representative frames of every element/animation you did.

Assets: use crisp sources (SVG / high-res) from assets-src/ where they exist; copy what you
use into `public/img/<scene>/` (convert/optimise as needed; keep files small, prefer SVG/WebP).
Where nothing exists, draw the element yourself (SVG/CSS) to match the reference at
high resolution; don't ship upscaled video crops for UI elements. Only list in
docs/SUBSTITUTIONS.md the places where original stand-in art replaces third-party media.

Don't edit files outside your scene folder, your demo file and your docs, except where your
task says so; if you need a change in shared code (src/core, src/gl, App.jsx, index.css),
keep it small and backwards compatible and mention it in your report.

Commit early and often on your branch (one plain lower-case sentence per message, no
trailers): at least after the static layout and after each animation. Long sessions can be
cut off, and unpushed work in progress must not be lost.

At the end, report: what's done, RMSE numbers, known gaps, shared-code changes, and any
substitutions.
