// The Plex window's outline: corner radii of the title bar's top corners and of the window's
// bottom corners (stage px), fitted on the video's my Music window by RMSE over 32 px crops of the
// four corners in eight settled frames (760-1340, blur 1): the body's top corners (from 3 px down)
// 11.5, the rim's outer edge above them 13.5 (from 1 px down), the bottom corners 14.5. Only the
// outline is rounded; everything inside runs square to it (docs/briefs/os.md, window chrome
// rules). Used by the frame and its clip (PlexWindow), the rim, the open's lighting, the shadow
// (shadow.jsx) and the inactive wash (look.jsx).
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
export const WORK = { x: 0, y: 0, w: 858, h: 699 }
export const MAX_RECT = { x: WORK.x, y: WORK.y - BODY_TOP, w: WORK.w, h: WORK.h + BODY_TOP }

// The vertical centre of the title bar's minimise / maximise / close glyphs (window px: the glyphs
// span y 7.7-15.8, PlexWindow WinButtonsIcon). Title text is centred on it by its cap height:
// baseline = TITLE_MID + capHeight / 2 (titleBaseline).
export const TITLE_MID = 11.75
// cap heights of the Plex faces (per em): Franklin Gothic 2732 / 4096, Libre Franklin 742 / 1000
export const CAP_HEAVY = 0.667
export const CAP_BOOK = 0.742
export const titleBaseline = (size, cap = CAP_HEAVY) => TITLE_MID + (cap * size) / 2
