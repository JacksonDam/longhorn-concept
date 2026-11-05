// Run...: type a program, folder, document or Internet address and Windows opens it.
import { memo } from 'react'
import { now } from '../../core/clock.js'
import { scoped, Button, TextField, wid, valueOf, C, FONT } from '../../ui/index.js'
import { Ico } from '../lib/icons.jsx'
import { openWin, openUrl, closeWin, messageBox } from '../lib/common.js'
import { lookupPath } from '../lib/fs.js'

// command -> action (returns false when Windows cannot find it)
export function runCommand(raw) {
  const s = raw.trim()
  const c = s.toLowerCase().replace(/\.exe$/, '')
  const app = {
    iexplore: () => openUrl('www.msn.com'),
    outlook: () => openWin('inbox', 'outlook'),
    msimn: () => openWin('inbox', 'outlook'),
    winword: () => openWin('doc1', 'word'),
    word: () => openWin('doc1', 'word'),
    winamp: () => openWin('winamp', 'winamp'),
    control: () => openWin('control', 'control'),
    'desk.cpl': () => openWin('display', 'display'),
    'timedate.cpl': () => openWin('cpl:datetime', 'applet', { applet: 'datetime' }),
    'mmsys.cpl': () => openWin('cpl:sound', 'applet', { applet: 'sound' }),
    'main.cpl': () => openWin('cpl:mouse', 'applet', { applet: 'mouse' }),
    'appwiz.cpl': () => openWin('cpl:programs', 'applet', { applet: 'programs' }),
    'ncpa.cpl': () => openWin('cpl:network', 'applet', { applet: 'network' }),
    explorer: () => openWin('documents', 'documents'),
    help: () => openWin('help', 'help'),
    helpctr: () => openWin('help', 'help'),
    winver: () => openWin('about', 'about'),
    search: () => openWin('search', 'search'),
    calc: () => openWin('calc', 'calc'),
    notepad: () => openWin('notepad', 'notepad'),
    charmap: () => openWin('charmap', 'charmap'),
    mspaint: () => openWin('paint', 'paint'),
    sol: () => openWin('solitaire', 'solitaire'),
  }[c]
  if (app) {
    app()
    return true
  }
  if (/^(https?:|ftp:|www\.)/i.test(s) || /^[a-z0-9-]+\.(com|net|org|edu|gov|co\.uk)(\/|$)/i.test(s)) {
    openUrl(s)
    return true
  }
  const hit = lookupPath(s)
  if (hit) {
    hit.open()
    return true
  }
  return false
}

const Intro = memo(function Intro() {
  return (
    <>
      <div style={{ position: 'absolute', left: 16, top: 16 }}>
        <Ico kind="run" size={34} />
      </div>
      <div style={{ position: 'absolute', left: 64, top: 16, right: 16, fontFamily: FONT, fontSize: 11.5, lineHeight: '16px', color: C.text }}>
        Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.
      </div>
      <div style={{ position: 'absolute', left: 16, top: 76, fontFamily: FONT, fontSize: 11.5, lineHeight: '20px', color: C.text }}>Open:</div>
    </>
  )
})

function Run({ win, t }) {
  const field = wid(win, 'open')
  const submit = () => {
    const v = valueOf(now(), field, null)?.text ?? ''
    if (!v.trim()) return
    if (runCommand(v)) closeWin(win.id)
    else
      messageBox({
        title: v.trim(),
        icon: 'error',
        text: `Windows cannot find '${v.trim()}'. Make sure you typed the name correctly, and then try again. To search for a file, click the Start button, and then click Search.`,
      })
  }
  const empty = !(valueOf(t, field, null)?.text ?? '').trim()
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body }}>
      <Intro />
      <TextField id={field} x={64} y={76} w={312} h={20} onEnter={submit} />
      <Button id={wid(win, 'ok')} label="OK" isDefault x={136} y={116} w={76} h={23} disabled={empty} onClick={submit} />
      <Button id={wid(win, 'cancel')} label="Cancel" x={218} y={116} w={76} h={23} onClick={() => closeWin(win.id)} />
      <Button id={wid(win, 'browse')} label="Browse..." x={300} y={116} w={76} h={23} onClick={() => openWin('computer', 'computer')} />
    </div>
  )
}

export default {
  id: 'run',
  title: () => 'Run',
  taskbarLabel: () => 'Run',
  icon: null,
  size: { w: 394, h: 180 },
  position: { x: 12, y: 470 },
  explorer: false,
  background: '#f6f9fe',
  Content: scoped(Run, {}),
}
