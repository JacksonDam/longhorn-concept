// Windows Picture and Video Acquisition (second reference, f00078-f00520): Welcome (Auto / Manual
// Capture), Capture in Progress (each copied picture flies into the preview), "Please name and
// describe these events" (thumbnails fly in from a stack into the grid; name, keywords), Done
// imports the events ('pics.import' { events: [{ id, name, keywords }] }) and opens my Pictures
// & Videos on the first new picture. Pages are logged ('ui.value' <win>/page { page, at }).
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { clamp, ease } from '../../core/anim.js'
import { scoped, wid, valueOf, lastOf, Radio, Checkbox, checkedOf, Button, Tabs, TextField, textOf, MessageIcon, C, FONT, HEAVY } from '../../ui/index.js'
import { Ico } from '../lib/icons.jsx'
import { CAMERA_EVENTS, photoUrl } from '../lib/pictures.jsx'
import { openWin, closeWin, messageBox } from '../lib/common.js'

const STEP = 0.22 // s per copied picture
const KEYWORDS = ['Anniversary', 'Birthday', 'Family', 'Friends', 'Favorites', 'Party', 'Vacation', 'Weekend trips']
const ALL = CAMERA_EVENTS.flatMap((g) => g.photos)

const pageOf = (t, win) => valueOf(t, wid(win, 'page'), { page: 'welcome', at: win.openedAt })
const setPage = (win, page) => emit('ui.value', { id: wid(win, 'page'), value: { page, at: now() } })
const count = (t, win) => (valueOf(t, wid(win, 'mode'), 'auto') === 'manual' ? 12 : ALL.length)

// the framed photo the wizard shows (a generated stand-in in a CSS 3D frame)
const Frame = memo(function Frame({ size }) {
  return (
    <div style={{ width: size, height: size * 1.12, transform: 'perspective(400px) rotateY(18deg) rotateZ(-2deg)', transformOrigin: '50% 100%' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: size / 14, background: 'linear-gradient(135deg, #f7fbff 0, #c9d5e6 40%, #eef3fa 60%, #a9b8cc 100%)', boxShadow: 'inset 0 0 0 1px #8796ad, 0 3px 8px rgba(30,60,120,0.35)' }}>
        <img src={photoUrl('meadow', 77)} alt="" draggable={false} style={{ position: 'absolute', left: size / 13, top: size / 13, right: size / 13, bottom: size / 13, width: size - (2 * size) / 13, height: size * 1.12 - (2 * size) / 13, objectFit: 'cover' }} />
      </div>
    </div>
  )
})

const Header = memo(function Header({ title, sub }) {
  return (
    <>
      <div style={{ position: 'absolute', left: 24, top: 8 }}>
        <Frame size={50} />
      </div>
      <div style={{ position: 'absolute', left: 92, top: 12, fontFamily: FONT, fontSize: 18, color: '#2c6cc4', whiteSpace: 'nowrap' }}>{title}</div>
      <div style={{ position: 'absolute', left: 94, top: 38, fontFamily: FONT, fontSize: 11, color: '#4a5068', whiteSpace: 'nowrap' }}>{sub}</div>
    </>
  )
})

const panel = (x, y, w, h) => ({ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 4, background: '#fff', boxShadow: `inset 0 0 0 1px ${C.borderLight}` })
const txt = { fontFamily: FONT, fontSize: 11, color: C.text, whiteSpace: 'nowrap' }

function Welcome({ win, t, w }) {
  return (
    <>
      <div style={{ position: 'absolute', left: 48, top: 22 }}>
        <Frame size={112} />
      </div>
      <div style={{ position: 'absolute', left: 240, top: 28, fontFamily: FONT, fontSize: 15, color: '#4f86d6' }}>Welcome</div>
      <div style={{ position: 'absolute', left: 238, top: 44, fontFamily: FONT, fontSize: 26, color: '#2c6cc4', whiteSpace: 'nowrap', letterSpacing: -0.3 }}>Pictures and Video Acquisition</div>
      <div style={{ position: 'absolute', left: 240, top: 92, width: w - 270, fontFamily: FONT, fontSize: 11, lineHeight: '15px', color: C.text }}>
        This wizard helps you transfer video and pictures from a device (like a camcorder, webcam, or digital camera) to your computer.
      </div>
      <div style={panel(240, 130, w - 270, 168)} />
      <Radio group={wid(win, 'mode')} option="auto" def="auto" label={<span style={{ fontFamily: HEAVY, color: '#3a4260' }}>Auto Capture</span>} x={252} y={142} />
      <div style={{ position: 'absolute', left: 272, top: 160, ...txt, color: '#8b91a6' }}>All the pictures and video on the device will be copied.</div>
      <Radio group={wid(win, 'mode')} option="manual" def="auto" label={<span style={{ fontFamily: HEAVY, color: '#3a4260' }}>Manual Capture</span>} x={252} y={186} />
      <div style={{ position: 'absolute', left: 272, top: 204, width: w - 310, fontFamily: FONT, fontSize: 11, color: '#8b91a6' }}>You select which pictures and which parts of the video are copied to your computer.</div>
      <Checkbox id={wid(win, 'remove')} label="Remove video and pictures from the camera once copied" x={252} y={270} />
      <div style={{ position: 'absolute', left: 240, top: 318, ...txt, color: '#2c6cc4' }}>To continue, click Next.</div>
      {void t}
    </>
  )
}

// a copied picture flies into the preview: from far right and turned away, to flat
function flyPose(k) {
  const e = ease.out(clamp(k))
  return { transform: `perspective(600px) translate3d(${(1 - e) * 160}px, ${(1 - e) * -30}px, ${(1 - e) * -260}px) rotateY(${(1 - e) * -55}deg)`, opacity: clamp(k * 3) }
}

function Capture({ win, t, w, pg }) {
  const n = count(t, win)
  const el = Math.max(0, t - pg.at)
  const i = Math.min(n - 1, Math.floor(el / STEP))
  const k = (el - i * STEP) / (STEP * 0.7)
  const done = Math.min(n, Math.floor(el / STEP) + (el >= n * STEP ? 0 : 0))
  const p = ALL[i]
  const ev = p.group === 'cam1' ? 1 : 2
  const remain = Math.max(0, Math.ceil((n * STEP - el) * 4))
  const bar = (x, y, f) => (
    <div style={{ position: 'absolute', left: x, top: y, width: 110, height: 9, borderRadius: 5, background: '#eef4ee', boxShadow: 'inset 0 0 0 1px #6dbb6a' }}>
      <div style={{ width: `${clamp(f) * 100}%`, height: 9, borderRadius: 5, background: 'linear-gradient(180deg, #b6f0a8, #4dbb3a)' }} />
    </div>
  )
  return (
    <>
      <Header title="Capture in Progress" sub="Please wait while the video and pictures are being copied to your computer." />
      <div style={panel(60, 80, w - 90, 220)} />
      <div style={{ position: 'absolute', left: 72, top: 90, ...txt, fontFamily: HEAVY }}>Currently copying...</div>
      <div style={{ position: 'absolute', left: 72, top: 112, ...txt, color: '#8b91a6' }}>Location: my Pictures &amp; Videos\Event {ev === 1 ? 'one' : 'two'} 11.0{ev}.03</div>
      <div style={{ position: 'absolute', left: 72, top: 128, ...txt, color: '#8b91a6' }}>Title: Picture{String(i + 1).padStart(4, '0')}</div>
      <div style={{ position: 'absolute', left: 72, top: 150, ...txt }}>Copying picture {i + 1} of {n}</div>
      {bar(80, 168, (i + clamp(k)) / n)}
      <div style={{ position: 'absolute', left: 72, top: 186, ...txt }}>Progress</div>
      {bar(80, 204, el / (n * STEP))}
      <div style={{ position: 'absolute', left: 72, top: 222, ...txt, color: '#8b91a6' }}>Time remaining: {remain} seconds</div>
      <div style={{ position: 'absolute', left: 300, top: 92, width: w - 342, height: 196, overflow: 'hidden', background: '#e9eef6', boxShadow: '0 0 0 1px #c5d3e8' }}>
        {i > 0 && <img src={ALL[i - 1].url} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <img src={p.url} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', boxShadow: '0 0 0 2px #fff', ...flyPose(k) }} />
      </div>
      <div style={{ position: 'absolute', left: w - 250, top: 312, display: 'flex', gap: 6, alignItems: 'center', ...txt, color: '#2c6cc4' }}>
        <MessageIcon kind="warning" size={14} />
        Adjustments: on
        <Ico kind="camera" size={18} style={{ marginLeft: 20 }} />
        <span style={{ fontFamily: HEAVY, color: '#3a4260' }}>Digital Camera</span>
      </div>
      {void done}
    </>
  )
}

// thumbnails fly in from a stack at the top right into the grid
function thumbPose(el, i, x, y) {
  const k = ease.out(clamp((el - i * 0.045) / 0.32))
  const sx = 390
  const sy = -10
  return { left: sx + (x - sx) * k, top: sy + (y - sy) * k, transform: `rotate(${(1 - k) * ((i % 5) - 2) * 6}deg) scale(${0.85 + 0.15 * k})`, opacity: el > i * 0.045 ? 1 : 0 }
}

function NameEvents({ win, t, w, h, pg }) {
  const ev = valueOf(t, wid(win, 'ev'), 'cam1')
  const g = CAMERA_EVENTS.find((x) => x.id === ev)
  const n = count(t, win)
  const photos = g.photos.filter((p) => ALL.indexOf(p) < n)
  const kws = valueOf(t, wid(win, 'kw:' + ev), g.keywords)
  const el = Math.max(0, t - Math.max(pg.at, lastOf(t, 'ui.value', wid(win, 'ev'))?.t ?? 0))
  const extra = textOf(t, wid(win, 'addkw:' + ev)).trim()
  const toggle = (k) => emit('ui.value', { id: wid(win, 'kw:' + ev), value: kws.includes(k) ? kws.filter((x) => x !== k) : [...kws, k] })
  return (
    <>
      <Header title="Please name and describe these events" sub="Windows has grouped your pictures and video into events based on time." />
      <Tabs id={wid(win, 'ev')} tabs={CAMERA_EVENTS.map((x, i) => ({ key: x.id, label: `Event ${i + 1}` }))} x={64} y={66} w={300} def="cam1" />
      <div style={panel(60, 87, w - 90, h - 87 - 92)} />
      <div style={{ position: 'absolute', left: 72, top: 97, ...txt, color: '#2c6cc4' }}>1. Name:</div>
      <TextField key={ev} id={wid(win, 'name:' + ev)} def={g.caption} x={124} y={94} w={150} h={18} size={10.5} />
      <div style={{ position: 'absolute', left: 286, top: 97, ...txt, color: '#8b91a6' }}>{g.when}</div>
      <div style={{ position: 'absolute', left: 70, top: 120, width: 380, height: h - 120 - 130, overflow: 'hidden' }}>
        {photos.map((p, i) => {
          const x = (i % 5) * 74
          const y = Math.floor(i / 5) * 58
          return (
            <div key={p.id} style={{ position: 'absolute', width: 64, height: 48, ...thumbPose(el, i, x, y) }}>
              <img src={p.url} alt="" draggable={false} style={{ width: 64, height: 48, objectFit: 'cover', display: 'block', boxShadow: '0 0 0 1px #fff, 0 0 0 2px #b9c7dc, 0 2px 4px rgba(40,70,130,0.3)' }} />
              {i % 4 === 1 && (
                <svg width="12" height="12" style={{ position: 'absolute', right: -4, top: -4 }}>
                  <circle cx="6" cy="6" r="5.5" fill="#f5a623" stroke="#fff" />
                  <text x="6" y="9.5" textAnchor="middle" fontFamily={HEAVY} fontSize="9" fill="#fff">!</text>
                </svg>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ position: 'absolute', left: 72, top: h - 124, ...txt, color: '#2c6cc4' }} onPointerDown={(e) => e.button === 0 && messageBox({ title: 'Change Event', icon: 'info', text: 'Drag pictures between the Event tabs to move them to another event.' })}>
        To add or remove images from this event, click here.
      </div>
      <div style={{ position: 'absolute', left: 464, top: 120, ...txt, color: '#2c6cc4' }}>2. Keywords</div>
      <div style={{ position: 'absolute', left: 464, top: 136, ...txt, fontSize: 10, color: '#8b91a6' }}>Add keywords:</div>
      <TextField key={'k' + ev} id={wid(win, 'addkw:' + ev)} x={464} y={150} w={w - 500} h={18} size={10.5} onEnter={(v) => v.trim() && !kws.includes(v.trim()) && emit('ui.value', { id: wid(win, 'kw:' + ev), value: [...kws, v.trim()] })} />
      {[...KEYWORDS, ...kws.filter((k) => !KEYWORDS.includes(k))].slice(0, 10).map((k, i) => (
        <Checkbox key={ev + k} id={wid(win, 'kwbox:' + ev + ':' + k)} label={k} x={466} y={176 + i * 18} checked={kws.includes(k)} onChange={() => toggle(k)} />
      ))}
      <div style={{ position: 'absolute', left: 72, top: h - 104, display: 'flex', gap: 6, alignItems: 'center', ...txt, fontSize: 10.5, color: '#c06a10' }}>
        <MessageIcon kind="warning" size={14} />
        Indicates that Windows has adjusted this image and kept the original.
      </div>
      <div style={{ position: 'absolute', left: w - 140, top: h - 104, display: 'flex', gap: 6, alignItems: 'center', ...txt, fontSize: 10.5, color: '#2c6cc4' }} onPointerDown={(e) => e.button === 0 && messageBox({ title: 'Voice Annotation', icon: 'info', text: 'Speak into the microphone to add a voice note to this event.\nNo microphone is connected.' })}>
        <Ico kind="volume" size={14} style={{ filter: 'invert(0.6)' }} />
        Voice annotation
      </div>
      {void extra}
    </>
  )
}

function Acquire({ win, t, w, h }) {
  const pg = pageOf(t, win)
  const n = count(t, win)
  // the copy runs by itself, then the events page follows
  const page = pg.page === 'capture' && t - pg.at >= n * STEP + 0.4 ? 'name' : pg.page
  const pgAt = page === 'name' && pg.page === 'capture' ? pg.at + n * STEP + 0.4 : pg.at
  const done = () => {
    const evs = CAMERA_EVENTS.filter((g) => g.photos.some((p) => ALL.indexOf(p) < count(now(), win))).map((g) => ({
      id: g.id,
      name: textOf(now(), wid(win, 'name:' + g.id), g.caption).trim() || g.caption,
      keywords: valueOf(now(), wid(win, 'kw:' + g.id), g.keywords),
    }))
    emit('pics.import', { events: evs })
    if (checkedOf(now(), wid(win, 'remove'), false)) emit('camera.emptied', {})
    closeWin(win.id)
    openWin('pictures', 'pictures', { photo: CAMERA_EVENTS[0].photos[0].id })
  }
  const cancel = () =>
    page === 'capture'
      ? messageBox({ title: 'Picture and Video Acquisition', icon: 'question', text: 'Stop copying? The pictures copied so far will be deleted.', buttons: [{ label: 'Yes', isDefault: true, emit: ['win.close', { id: win.id }] }, { label: 'No' }] })
      : closeWin(win.id)
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #ffffff 0, #ffffff 60%, #e9f0fa 100%)', overflow: 'hidden' }}>
      {page === 'welcome' && <Welcome win={win} t={t} w={w} />}
      {page === 'capture' && <Capture win={win} t={t} w={w} pg={pg} />}
      {page === 'name' && <NameEvents win={win} t={t} w={w} h={h} pg={{ ...pg, at: pgAt }} />}
      <div style={{ position: 'absolute', left: 0, top: h - 44, width: w, height: 44, background: 'linear-gradient(180deg, #8dbcf0 0, #5b98e6 50%, #4f8ad9 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }} />
      {page === 'welcome' && <Button id={wid(win, 'next')} label={'Next ▸'} isDefault x={w - 196} y={h - 33} w={84} h={23} onClick={() => setPage(win, 'capture')} />}
      {page === 'name' && <Button id={wid(win, 'done')} label="Done" isDefault x={w - 196} y={h - 33} w={84} h={23} onClick={done} />}
      <Button id={wid(win, 'cancel')} label="Cancel" x={w - 102} y={h - 33} w={84} h={23} onClick={cancel} />
    </div>
  )
}

const busy = (win, t) => {
  const pg = pageOf(t, win)
  const n = count(t, win)
  if (pg.page === 'capture') return t - pg.at < n * STEP + 0.4 + 1.2
  return false
}

export default {
  id: 'acquire',
  title: () => 'Windows Picture and Video Acquisition',
  taskbarLabel: () => 'Windows Picture and Video Acquisition',
  icon: null,
  size: { w: 683, h: 480 },
  position: { x: 100, y: 110 },
  explorer: false,
  background: '#ffffff',
  // the copy and the thumbnails' flight run on their own
  Content: scoped(Acquire, { watch: ['pics'], settle: 1.3, alive: busy }),
  liveTime: (win, t, base) => (win.state === 'open' && busy(win, t) ? t : base),
}
