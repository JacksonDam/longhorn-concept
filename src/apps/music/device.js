// Front face of the header's glass music device, drawn on a 2D canvas used as a slab texture:
// teal glass with fine vertical stripes, a glossy blue eighth note whose head is a gridded
// sphere, and a live equaliser of pale squares. drawDevice(t) redraws the equaliser for time t.
const N = 512
const COLS = 14
const ROWS = 7
const CELL = 0.046
const GAP = 0.014
const X0 = 0.085
const Y1 = 0.9 // bottom of the lowest row (fraction of the face)

let canvas = null
let base = null
let lastKey = ''
export let deviceVersion = 0

function drawNote(g) {
  // the note: stem, flag, gridded sphere head (drawn over the equaliser)
  const blue = (a, b) => {
    const q = g.createLinearGradient(N * a, 0, N * b, N)
    q.addColorStop(0, '#9aa4f4')
    q.addColorStop(0.5, '#5664d6')
    q.addColorStop(1, '#303c9e')
    return q
  }
  g.fillStyle = blue(0.5, 0.7)
  g.beginPath()
  g.moveTo(N * 0.6, N * 0.14)
  g.lineTo(N * 0.64, N * 0.13)
  g.lineTo(N * 0.65, N * 0.74)
  g.lineTo(N * 0.6, N * 0.76)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(220,230,255,0.7)'
  g.fillRect(N * 0.605, N * 0.15, N * 0.012, N * 0.55)
  g.fillStyle = blue(0.6, 0.9)
  g.beginPath()
  g.moveTo(N * 0.63, N * 0.13)
  g.bezierCurveTo(N * 0.8, N * 0.14, N * 0.92, N * 0.24, N * 0.88, N * 0.42)
  g.bezierCurveTo(N * 0.86, N * 0.33, N * 0.76, N * 0.3, N * 0.645, N * 0.32)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(200,215,255,0.35)'
  g.beginPath()
  g.moveTo(N * 0.65, N * 0.15)
  g.bezierCurveTo(N * 0.78, N * 0.16, N * 0.86, N * 0.22, N * 0.86, N * 0.3)
  g.bezierCurveTo(N * 0.8, N * 0.22, N * 0.72, N * 0.2, N * 0.65, N * 0.21)
  g.fill()
  // sphere head
  const hx = N * 0.46, hy = N * 0.7, hr = N * 0.175
  let rg = g.createRadialGradient(hx - hr * 0.35, hy - hr * 0.45, hr * 0.1, hx, hy, hr)
  rg.addColorStop(0, '#e2e8ff')
  rg.addColorStop(0.35, '#8d9cf0')
  rg.addColorStop(0.8, '#4a58c8')
  rg.addColorStop(1, '#2e3890')
  g.fillStyle = rg
  g.beginPath()
  g.arc(hx, hy, hr, 0, Math.PI * 2)
  g.fill()
  g.save()
  g.beginPath()
  g.arc(hx, hy, hr, 0, Math.PI * 2)
  g.clip()
  g.strokeStyle = 'rgba(40,50,140,0.45)'
  g.lineWidth = 2
  for (let k = -3; k <= 3; k++) {
    g.beginPath()
    g.ellipse(hx, hy, hr * Math.abs(Math.cos((k * Math.PI) / 8)) + 0.1, hr, 0, 0, Math.PI * 2)
    g.stroke()
    g.beginPath()
    g.moveTo(hx - hr, hy + (k * hr) / 3.5)
    g.lineTo(hx + hr, hy + (k * hr) / 3.5)
    g.stroke()
  }
  g.restore()
}

function makeBase() {
  const c = document.createElement('canvas')
  c.width = c.height = N
  const g = c.getContext('2d')
  // glass body
  let gr = g.createLinearGradient(0, 0, N * 0.3, N)
  gr.addColorStop(0, '#5aaee0')
  gr.addColorStop(0.5, '#3d8cc2')
  gr.addColorStop(1, '#286a9a')
  g.fillStyle = gr
  g.fillRect(0, 0, N, N)
  // bright column at the left and fine vertical stripes
  gr = g.createLinearGradient(N * 0.04, 0, N * 0.3, 0)
  gr.addColorStop(0, 'rgba(170,230,255,0)')
  gr.addColorStop(0.12, 'rgba(170,230,255,0.6)')
  gr.addColorStop(0.7, 'rgba(150,215,250,0.4)')
  gr.addColorStop(1, 'rgba(150,215,250,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, N, N * 0.85)
  for (let x = 0; x < N; x += 7) {
    const k = 0.05 + 0.06 * Math.abs(Math.sin(x * 0.37))
    g.fillStyle = `rgba(200,240,255,${k})`
    g.fillRect(x, 0, 2.5, N * (0.55 + 0.25 * Math.abs(Math.sin(x * 0.11))))
  }
  // darker lower part
  gr = g.createLinearGradient(0, N * 0.45, 0, N)
  gr.addColorStop(0, 'rgba(20,60,85,0)')
  gr.addColorStop(1, 'rgba(20,60,85,0.45)')
  g.fillStyle = gr
  g.fillRect(0, 0, N, N)
  // rim: dark teal border with rounded inner corners
  g.strokeStyle = 'rgba(30,96,122,0.85)'
  g.lineWidth = N * 0.045
  g.strokeRect(0, 0, N, N)
  g.strokeStyle = 'rgba(120,200,225,0.35)'
  g.lineWidth = 3
  g.strokeRect(N * 0.028, N * 0.028, N * 0.944, N * 0.944)
  return c
}

// equaliser column heights (0..ROWS) at time t: smooth pseudo-random, stepped ~7 times a second
function level(col, t) {
  const step = Math.floor(t * 7)
  const f = (n) => {
    const v = Math.sin(n * 12.9898 + col * 78.233) * 43758.5453
    return v - Math.floor(v)
  }
  // two groups either side of the note head, low in the middle
  const shape = [0.5, 0.65, 0.75, 0.7, 0.55, 0.4, 0.25, 0.2, 0.3, 0.55, 0.75, 0.85, 0.7, 0.5][col]
  const v = shape * (0.55 + 0.6 * f(step)) * ROWS
  return Math.max(1, Math.min(ROWS, Math.round(v)))
}

export function drawDevice(t) {
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = canvas.height = N
    base = makeBase()
  }
  const levels = Array.from({ length: COLS }, (_, c) => level(c, t))
  const key = levels.join(',')
  if (key === lastKey) return canvas
  lastKey = key
  deviceVersion++
  const g = canvas.getContext('2d')
  g.clearRect(0, 0, N, N)
  g.drawImage(base, 0, 0)
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < levels[c]; r++) {
      const x = N * (X0 + c * (CELL + GAP))
      const y = N * (Y1 - (r + 1) * CELL - r * GAP)
      const a = 0.62 - r * 0.05
      g.fillStyle = `rgba(226,244,255,${a})`
      g.fillRect(x, y, N * CELL, N * CELL)
      g.fillStyle = 'rgba(255,255,255,0.35)'
      g.fillRect(x, y, N * CELL, N * 0.007)
    }
  }
  drawNote(g)
  return canvas
}

export const deviceCanvas = () => canvas || drawDevice(0)
