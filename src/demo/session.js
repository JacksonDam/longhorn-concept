// Scripted session flows for benchmarking and checking the session transitions
// (?scenario=session, with ?capture / ?bench / ?demo): log in as Tommy, log off, log in as Kelly,
// Switch User, Shut Down from the login screen, boot, log in as Angela, Shut Down from the
// desktop, boot again. [{ frame, type, ...data }] in 1-based video frames.
export const sessionScenario = [
  { frame: 10, type: 'login.select', id: 'tommy' },
  { frame: 40, type: 'login.pw', len: 1 },
  { frame: 44, type: 'login.pw', len: 2 },
  { frame: 50, type: 'login.submit', id: 'tommy' },
  { frame: 140, type: 'session.logoff' },
  { frame: 175, type: 'login.select', id: 'kelly' },
  { frame: 205, type: 'login.pw', len: 1 },
  { frame: 215, type: 'login.submit', id: 'kelly' },
  { frame: 290, type: 'session.switch' },
  { frame: 330, type: 'session.shutdown' },
  { frame: 480, type: 'session.boot' },
  { frame: 600, type: 'login.select', id: 'angela' },
  { frame: 640, type: 'login.submit', id: 'angela' },
  { frame: 730, type: 'session.shutdown' },
  { frame: 860, type: 'session.boot' },
]
export const SCENARIO_FRAMES = '1-1000'
