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
