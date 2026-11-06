// Demo input for the login scene: [{ frame, type, ...data }], frames are 1-based video frames.
// Measured on the reference (docs/login-spec.md): each hover change shows as a half-way frame
// one frame after the event; the first sweep (right to left) uses the enlarged hover, the
// second sweep (left to right) only the colour hover.
const hover = (frame, id, on, big) => ({ frame, type: 'login.hover', id, on, big })

export const loginDemo = [
  // sweep 1, right to left
  hover(48, 'angela', true, true),
  hover(53, 'angela', false, true),
  hover(53, 'kelly', true, true),
  hover(57, 'kelly', false, true),
  hover(57, 'tommy', true, true),
  hover(62, 'tommy', false, true),
  hover(62, 'sondra', true, true),
  hover(66.5, 'sondra', true, false),
  hover(69, 'sondra', false, true),
  hover(69, 'jenny', true, true),
  hover(73, 'jenny', false, true),
  // sweep 2, left to right
  hover(87, 'jenny', true, false),
  hover(94, 'jenny', false, false),
  hover(94, 'sondra', true, false),
  hover(100, 'sondra', false, false),
  hover(100, 'tommy', true, false),
  hover(105, 'tommy', false, false),
  hover(105, 'kelly', true, false),
  hover(111, 'kelly', false, false),
  hover(111, 'angela', true, false),
  hover(116, 'angela', false, false),
  // pick Sondra
  { frame: 168, type: 'login.select', id: 'sondra' },
  // the cursor over the go button (its pulse starts)
  { frame: 333, type: 'login.gohover', id: 'sondra' },
  // type the password, one bullet every 7 frames
  { frame: 395, type: 'login.pw', len: 1 },
  { frame: 402, type: 'login.pw', len: 2 },
  { frame: 409, type: 'login.pw', len: 3 },
  { frame: 416, type: 'login.pw', len: 4 },
  { frame: 423, type: 'login.pw', len: 5 },
  { frame: 430, type: 'login.pw', len: 6 },
  { frame: 510, type: 'login.submit', id: 'sondra' },
]
