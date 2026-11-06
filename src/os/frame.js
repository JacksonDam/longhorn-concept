// The Plex window's outline: corner radii of the title bar's top corners and of the window's
// bottom corners (stage px), fitted on the video's my Music window by RMSE over 32 px crops of the
// four corners in eight settled frames (760-1340, blur 1): the body's top corners (from 3 px down)
// 11.5, the rim's outer edge above them 13.5 (from 1 px down), the bottom corners 14.5. Only the
// outline is rounded; everything inside runs square to it (docs/briefs/os.md, window chrome
// rules). Used by the frame and its clip (PlexWindow), the rim, the open's lighting, the shadow
// (shadow.jsx) and the inactive wash (look.jsx).
import { stageSize } from '../core/Stage.jsx'

export const RADIUS_TOP = 11.5
export const RADIUS_BOTTOM = 14.5

// the radii part-way through a maximise (mk: 0 normal .. 1 maximised, which is square)
const q = (v) => Math.round(v * 4) / 4
export const radiiAt = (mk) => (mk <= 0 ? RADII : mk >= 1 ? SQUARE : { top: q(RADIUS_TOP * (1 - mk)), bottom: q(RADIUS_BOTTOM * (1 - mk)) })
const RADII = { top: RADIUS_TOP, bottom: RADIUS_BOTTOM }
const SQUARE = { top: 0, bottom: 0 }

// The body (title bar and everything under it) starts BODY_TOP px below the window layer's top:
// the rim's light top edge lies above it (PlexWindow bodyClip, Rim).
export const BODY_TOP = 3
// A maximised window's body fills the work area exactly: from the top of the screen down to the
// taskbar's top row (699) and across to the sidebar's edge (858). Its layer starts BODY_TOP px
// above the screen, so the rim's top edge lies off-screen and the title bar keeps its look.
// It reaches TUCK px further, under the sidebar's glass and the taskbar (both drawn above it):
// at a phone's page zoom an edge falls inside a device pixel and Safari rounds each layer's edges
// on its own, so two layers that only met left a column neither fully covered, the wallpaper
// showing through as a seam beside the sidebar.
export const WORK = { x: 0, y: 0, w: 858, h: 699 }
const TUCK = 1
export const MAX_RECT = { x: WORK.x, y: WORK.y - BODY_TOP, w: WORK.w + TUCK, h: WORK.h + BODY_TOP + TUCK }

// On a stage extended to the screen's shape (core/Stage.jsx: dw, dh past the video's 960 x 720)
// the sidebar sits at 858 + dw and the taskbar at 699 + dh, so the work area grows by both; WORK
// and MAX_RECT are its size on the video's frame. (Read at render and in input handlers: the
// window layer redraws every frame, so a resize or rotation re-places windows on the next one.)
const workCache = { w: -1, h: -1, work: WORK, max: MAX_RECT }
function sized() {
  const { dw = 0, dh = 0 } = stageSize()
  if (workCache.w !== dw || workCache.h !== dh) {
    const work = { x: 0, y: 0, w: WORK.w + dw, h: WORK.h + dh }
    workCache.w = dw
    workCache.h = dh
    workCache.work = dw || dh ? work : WORK
    workCache.max = dw || dh ? { x: work.x, y: work.y - BODY_TOP, w: work.w + TUCK, h: work.h + BODY_TOP + TUCK } : MAX_RECT
  }
  return workCache
}
export const workArea = () => sized().work
export const maxRect = () => sized().max

// Where a window opens on an extended stage: its centre keeps its place in the work area (the
// app's position is authored on the video's frame, WORK), so a window the video's screen centres
// is centred on a wide one and one placed near a corner stays near it. Unchanged on the frame.
export function placeDefault(p, s) {
  const { dw = 0, dh = 0 } = stageSize()
  if (!dw && !dh) return p
  const fx = Math.min(1, Math.max(0, (p.x + s.w / 2) / WORK.w))
  const fy = Math.min(1, Math.max(0, (p.y + s.h / 2) / WORK.h))
  return { x: Math.round(p.x + dw * fx), y: Math.round(p.y + dh * fy) }
}

// A dragged window stays reachable however the stage changes (a resize or a rotation shrinks it
// under a window placed on a bigger one): its title bar keeps KEEP px of its drag handle in the
// work area and its top between the screen's top and TITLE px above the taskbar. Applied when
// drawing, never written to the log; drags clamp the same way, so dragging can't lose a window.
const KEEP = 60 // the drag handle ends 60 px before the window's right edge (PlexWindow)
const TITLE = 24
export function keepReachable(x, y, w) {
  const a = workArea()
  return {
    x: Math.min(a.w - KEEP, Math.max(KEEP + 60 - w, x)),
    y: Math.min(a.h - TITLE, Math.max(0, y)),
  }
}

// The vertical centre of the title bar's minimise / maximise / close glyphs (window px: the glyphs
// span y 7.7-15.8, PlexWindow WinButtonsIcon). Title text is centred on it by its cap height:
// baseline = TITLE_MID + capHeight / 2 (titleBaseline).
export const TITLE_MID = 11.75
// cap heights of the Plex faces (per em): Franklin Gothic 2732 / 4096, Libre Franklin 742 / 1000
export const CAP_HEAVY = 0.667
export const CAP_BOOK = 0.742
export const titleBaseline = (size, cap = CAP_HEAVY) => TITLE_MID + (cap * size) / 2
