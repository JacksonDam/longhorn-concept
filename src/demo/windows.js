// Scripted session for memory and load checks (?scenario=windows, with ?demo for real time;
// tools/memory.mjs): log in, my Music (album page, minimise, restore), every launcher app opened
// one after another and left open (fifteen windows), then three minutes of use: windows
// minimised, restored, closed and reopened in turn, my Music's album page changed, a drag.
// [{ frame, type, ...data }] in 1-based video frames (29.97 a second).
const APPS = [
  ['inbox', 'outlook'], ['doc1', 'word'], ['ie', 'ie', { url: 'www.msn.com' }], ['winamp', 'winamp'], ['pictures', 'pictures'],
  ['documents', 'documents'], ['computer', 'computer'], ['control', 'control'], ['help', 'help'], ['search', 'search'],
  ['programs', 'programs'], ['im:Hank', 'im', { buddy: 'Hank' }], ['notepad', 'notepad'], ['paint', 'paint'],
]
const open = (frame, [id, app, props]) => ({ frame, type: 'win.open', id, app, ...(props ? { props } : {}) })

// the phases, for reports: [name, first frame]
export const WINDOWS_PHASES = [['login', 1], ['my Music', 150], ['album', 260], ['minimise, restore', 340], ['open every app', 480], ['use', 1380], ['end', 6800]]

const use = []
for (let i = 0, f = 1380; f < 6700; i++, f += 120) {
  const a = APPS[i % APPS.length]
  const b = APPS[(i * 5 + 3) % APPS.length]
  use.push({ frame: f, type: 'win.minimize', id: a[0] })
  use.push({ frame: f + 30, type: 'win.close', id: b[0] })
  use.push({ frame: f + 60, type: 'win.restore', id: a[0] })
  use.push(open(f + 90, b))
  if (i % 4 === 0) use.push({ frame: f + 100, type: 'win.focus', id: 'music' }, { frame: f + 104, type: 'music.album', id: ['x5', 10, 'x12', 3][(i / 4) % 4] })
  if (i % 6 === 2) for (let k = 0; k <= 10; k++) use.push({ frame: f + 40 + k, type: 'win.move', id: a[0], x: 120 + k * 8, y: 80 + k * 4 })
}

export const windowsScenario = [
  { frame: 10, type: 'login.select', id: 'sondra' },
  { frame: 30, type: 'login.submit', id: 'sondra' },
  { frame: 150, type: 'music.open' },
  { frame: 260, type: 'music.album', id: 10 },
  { frame: 340, type: 'music.minimize' },
  { frame: 400, type: 'tb.press', id: 'music' },
  { frame: 400, type: 'music.restore' },
  ...APPS.map((a, i) => open(480 + i * 60, a)),
  ...use,
]
