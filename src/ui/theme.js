// The Plex look, collected from the video's my Music window, sidebar flyout and taskbar
// (reference frames 640 and 800): blue glass chrome, Franklin Gothic, pale blue-white bodies.
export const FONT = "'Libre Franklin', 'Plex', Tahoma, sans-serif" // Book / Medium weights
export const HEAVY = "'Franklin Gothic', 'Libre Franklin', sans-serif" // the bold Plex words
export const TAHOMA = 'Tahoma, Verdana, sans-serif'

export const C = {
  // chrome (my Music toolbar / band)
  chromeHi: '#6eb0fa',
  chrome: '#4f8bdd',
  chromeLo: '#326ab4',
  chromeText: '#e4f4ff',
  menuText: '#86bcff',
  band: 'linear-gradient(180deg, #4c87d2 0, #3f78c4 55%, #3a71bb 100%)',
  toolbar: 'linear-gradient(180deg, #67a6f2 0, #5b98e6 45%, #4f8ad9 100%)',
  // bodies
  body: 'linear-gradient(180deg, #ffffff 0, #ffffff 40%, #eef3fc 75%, #dfe7f5 100%)',
  bodyFlat: '#f6f9fe',
  paneBg: 'linear-gradient(180deg, #f7fafe 0, #eaf0fa 100%)',
  headingLight: '#8ebbe9',
  heading: '#3b7cc6',
  text: '#4a5068',
  textDim: '#8b91a6',
  textLight: '#a9a9ab',
  textDark: '#717174',
  link: '#2c6cc4',
  border: '#9cb2d0',
  borderLight: '#c5d3e8',
  // flyout list (frame 640)
  list: 'linear-gradient(180deg, rgb(237,247,255) 0, rgb(246,252,255) 30%, rgb(234,246,255) 60%, rgb(218,230,248) 100%)',
  rowText: 'rgba(98,104,140,0.98)',
  rowHover: 'linear-gradient(180deg, rgba(214,234,255,0.75), rgba(196,228,255,0.95) 40%, rgba(212,238,255,0.85))',
  rowSel: 'linear-gradient(180deg, rgb(206,230,255), rgb(176,215,255) 45%, rgb(190,224,255))',
  rowSelEdge: 'rgba(120,170,235,0.9)',
  rowSelDim: 'linear-gradient(180deg, rgb(226,236,248), rgb(214,226,242))',
  // selection in text
  textSel: 'rgb(68,128,222)',
  textSelDim: 'rgb(200,214,236)',
  // frames (flyout)
  frame: 'rgb(68,123,216)',
  frameEdge: 'rgb(107,138,201)',
}

// text style helper for HTML text (line box = size * lh)
export const font = (size = 11, weight = 400, color = C.text, extra) => ({
  fontFamily: weight >= 600 ? HEAVY : FONT,
  fontSize: size,
  fontWeight: weight >= 600 ? 400 : weight,
  color,
  whiteSpace: 'nowrap',
  ...extra,
})

export const abs = (x, y, w, h, extra) => ({ position: 'absolute', left: x, top: y, width: w, height: h, ...extra })

// glass highlight used for chrome buttons (the my Music "Preview" toggle)
export const chromeHot = (k) => ({
  background: `linear-gradient(180deg, rgba(160,210,255,${0.55 * k}), rgba(110,170,240,${0.45 * k}))`,
  boxShadow: `inset 0 0 0 1px rgba(180,220,255,${0.45 * k})`,
})
