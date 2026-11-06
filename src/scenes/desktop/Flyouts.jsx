// Shell flyouts in the my Music flyout's style (blue title bar, pale list, blue footer):
// the Seattle weather flyout (slides out of the sidebar) and the clock's calendar (rises out
// of the taskbar). Content the video doesn't show is fictional and neutral (late 2003).
// On a stage extended to the screen's shape (core/Stage.jsx) they move with what they belong to:
// the weather with the sidebar (dw), the calendar with the clock (dw, dh); Popup's offset.
import { memo } from 'react'
import { CAPTURE } from '../../core/clock.js'
import { Popup } from './Popup.jsx'
import { hover, hoverOn, hoverOff, closePopups, popupState } from './shellState.js'
import { setValue, lastOf } from '../../ui/index.js'
import { launch } from './appInfo.jsx'

const DEMO = CAPTURE || new URLSearchParams(location.search).has('demo')
const font = "'Libre Franklin', Tahoma, sans-serif"
const title = 'linear-gradient(to bottom, rgba(70,80,120,0.45) 0px, rgba(70,80,120,0.45) 2px, rgb(107,138,201) 2px, rgb(118,148,212) 4px, rgb(92,148,229) 4px, rgb(68,124,219) 30px, rgb(87,147,233) 30px, rgb(116,165,247) 32px, rgb(76,125,208) 33px, rgb(114,142,195) 34px)'
const list = 'linear-gradient(to bottom, rgb(227,245,255), rgb(243,251,255) 20%, rgb(246,252,255) 40%, rgb(228,240,255) 75%, rgb(205,220,240))'
const foot = 'linear-gradient(to bottom, rgb(78,128,220), rgb(52,119,222) 3px, rgb(62,118,220) 12px, rgb(56,114,199) 16px, rgb(97,155,242) 18px, rgb(89,144,216) 20px, rgb(27,76,161) 21px, rgb(8,50,116) 23px)'

function Frame({ x, y, w, h, head, children, footLabel }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, boxShadow: '-2px 3px 8px rgba(0,20,60,0.3)' }}>
      <div style={{ position: 'absolute', inset: 0, background: title, backgroundSize: '100% 35px', backgroundRepeat: 'no-repeat' }} />
      <div style={{ position: 'absolute', left: 0, top: 35, width: w, height: h - 35 - 23, background: list }} />
      <div style={{ position: 'absolute', left: 0, top: h - 23, width: w, height: 23, background: foot }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: 35 }}>{head}</div>
      {children}
      <svg width="10" height="14" viewBox="0 0 10 14" style={{ position: 'absolute', left: w / 2 - 50, top: h - 20 }}>
        <path d="M1.5 1.5 L8.5 7 L1.5 12.5 Z" fill="#cfe6ff" opacity="0.9" />
      </svg>
      <div style={{ position: 'absolute', left: w / 2 - 38, top: h - 21, fontFamily: font, fontWeight: 600, fontSize: 10, lineHeight: '17px', color: '#fff', whiteSpace: 'nowrap' }}>{footLabel}</div>
    </div>
  )
}

// ---- weather ------------------------------------------------------------------------------
export const WEATHER = { x: 665, y: 26, w: 193, h: 214 }
const FORECAST = [
  ['Today', 'rain', 51, 43],
  ['Thu', 'rain', 50, 44],
  ['Fri', 'cloud', 52, 41],
  ['Sat', 'sun', 54, 40],
  ['Sun', 'rain', 50, 42],
]
function Wx({ kind, x, y, s = 1 }) {
  return (
    <svg width={22 * s} height={18 * s} viewBox="0 0 22 18" style={{ position: 'absolute', left: x, top: y }}>
      {kind !== 'cloud' && kind !== 'rain' && <circle cx="9" cy="8" r="5" fill="#f5c542" stroke="#e0a020" strokeWidth="0.6" />}
      {kind === 'sun' && <path d="M12 13 Q10 10.5 12.6 9.4 Q13.6 7.4 16.2 8 Q18.6 8.6 18.4 10.8 Q20.6 11.2 20.2 13 Z" fill="#eef2f8" stroke="#9aa6bb" strokeWidth="0.5" />}
      {kind !== 'sun' && <path d="M4 14 Q1 14 1.4 11.4 Q1.8 9 4.6 9.4 Q5.6 6.4 9 6.8 Q12 7.2 12.6 9.6 Q16.8 9.2 17 12 Q17 14 14.8 14 Z" fill={kind === 'rain' ? '#c9d2e0' : '#eef2f8'} stroke="#8d9ab0" strokeWidth="0.6" />}
      {kind === 'rain' && <path d="M5 15.5 L4 17.5 M9 15.5 L8 17.5 M13 15.5 L12 17.5" stroke="#3b7bd8" strokeWidth="1.2" strokeLinecap="round" />}
    </svg>
  )
}
const WeatherPanel = memo(function WeatherPanel() {
  const { x, y, w, h } = WEATHER
  const head = (
    <>
      <Wx kind="rain" x={8} y={8} />
      <div style={{ position: 'absolute', left: 36, top: 9, fontFamily: font, fontWeight: 600, fontSize: 12.2, lineHeight: '17px', color: '#fff', whiteSpace: 'nowrap' }}>
        Seattle<span style={{ fontWeight: 500, color: 'rgba(205,225,255,0.85)' }}>, WA</span>
      </div>
    </>
  )
  const row = (i) => 92 + i * 19
  const txt = (extra) => ({ position: 'absolute', fontFamily: font, fontWeight: 600, fontSize: 9.4, lineHeight: '18px', whiteSpace: 'nowrap', color: 'rgba(112,118,152,0.95)', ...extra })
  return (
    <Frame x={x} y={y} w={w} h={h} head={head} footLabel="Go to MSN Weather">
      <Wx kind="rain" x={12} y={44} s={1.6} />
      <div style={txt({ left: 54, top: 40, fontSize: 22, lineHeight: '28px', fontWeight: 500, color: 'rgb(60,90,150)' })}>48°</div>
      <div style={txt({ left: 98, top: 41, fontSize: 10.4, color: 'rgb(70,90,140)' })}>Showers</div>
      <div style={txt({ left: 98, top: 55, fontSize: 8.6, fontWeight: 500 })}>Wind S 9 mph</div>
      <div style={txt({ left: 12, top: 70, fontSize: 8.6, fontWeight: 500 })}>Feels like 45°, Humidity 86%</div>
      {FORECAST.map(([d, k, hi, lo], i) => (
        <div key={i}>
          <div style={txt({ left: 12, top: row(i) })}>{d}</div>
          <Wx kind={k} x={70} y={row(i) + 0.5} />
          <div style={txt({ left: 120, top: row(i), width: 30, textAlign: 'right' })}>{hi}°</div>
          <div style={txt({ left: 150, top: row(i), width: 30, textAlign: 'right', color: 'rgba(140,146,175,0.95)' })}>{lo}°</div>
        </div>
      ))}
    </Frame>
  )
})
const WEATHER_PANEL = <WeatherPanel />

function FootHit({ id, x, y, w, h = 22, go }) {
  return (
    <div
      style={{ position: 'absolute', left: x, top: y, width: w, height: h, pointerEvents: 'auto' }}
      onPointerEnter={hoverOn(id)}
      onPointerLeave={hoverOff(id)}
      onPointerDown={(e) => {
        e.stopPropagation()
        closePopups()
        go()
      }}
    />
  )
}
const panelEater = (b) => (
  <div style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, pointerEvents: 'auto' }} onPointerDown={(e) => e.stopPropagation()} />
)
function FootLive({ t, id, b }) {
  const lv = hover(t, id)
  return <div style={{ position: 'absolute', left: b.x + 2, top: b.y + b.h - 23, width: b.w - 4, height: 20, opacity: lv, background: 'linear-gradient(to bottom, rgba(140,200,255,0.55), rgba(120,190,255,0.35))' }} />
}

const WEATHER_HITS = (
  <>
    {panelEater(WEATHER)}
    <FootHit id="wx.body" x={WEATHER.x} y={WEATHER.y + 35} w={WEATHER.w} h={WEATHER.h - 35 - 23} go={() => launch.internet('weather.msn.com')} />
    <FootHit id="wx.go" x={WEATHER.x} y={WEATHER.y + WEATHER.h - 23} w={WEATHER.w} go={() => launch.internet('weather.msn.com')} />
  </>
)

// (offsets are cached so the popup's wrappers hold frame to frame)
const offsets = new Map()
const offsetOf = (x, y) => {
  const k = x + ',' + y
  let o = offsets.get(k)
  if (!o) offsets.set(k, (o = { x, y }))
  return o
}

export function WeatherFlyout({ t, dw = 0 }) {
  const b = WEATHER
  return (
    <Popup t={t} id="weather" kind="left" n={10} box={{ left: b.x - 6, top: b.y, width: 960 - b.x + 6, height: b.h + 6 }} offset={offsetOf(dw, 0)} live={<FootLive t={t} id="wx.go" b={b} />} hits={WEATHER_HITS}>
      {WEATHER_PANEL}
    </Popup>
  )
}

// ---- calendar -----------------------------------------------------------------------------
export const CAL = { x: 744, y: 476, w: 210, h: 223 }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// the demo's clock says 11:31 am; its date is fictional (late 2003). Live: the real date.
export function calendarDate() {
  return DEMO ? new Date(2003, 10, 5, 11, 31) : new Date()
}
export function clockText(d, upper) {
  let h = d.getHours() % 12
  if (h === 0) h = 12
  const ap = d.getHours() < 12 ? 'am' : 'pm'
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${upper ? ap.toUpperCase() : ap}`
}

const CELL = 26
const GX = 12
const GY = 80
const dayCell = (first, i) => ({ x: GX + ((first + i) % 7) * CELL, y: GY + Math.floor((first + i) / 7) * 17 })
const CalendarPanel = memo(function CalendarPanel({ y, m, d, time, dow, today, sel }) {
  const { x, y: top, w, h } = CAL
  const first = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const cell = CELL
  const gx = GX
  const head = (
    <>
      <div style={{ position: 'absolute', left: 10, top: 6, fontFamily: font, fontWeight: 600, fontSize: 15, lineHeight: '22px', color: '#fff', whiteSpace: 'nowrap' }}>{time}</div>
    </>
  )
  const txt = (extra) => ({ position: 'absolute', fontFamily: font, fontWeight: 600, fontSize: 9.4, lineHeight: '16px', whiteSpace: 'nowrap', color: 'rgba(112,118,152,0.95)', textAlign: 'center', ...extra })
  const cells = []
  for (let i = 0; i < days; i++) {
    const { x: cx, y: cy } = dayCell(first, i)
    const isToday = today && i + 1 === d
    const isSel = sel === i + 1
    cells.push(
      <div key={i}>
        {(isToday || isSel) && <div style={{ position: 'absolute', left: cx + 2, top: cy, width: cell - 4, height: 16, borderRadius: 3, background: isToday ? 'linear-gradient(to bottom, rgb(206,230,255), rgb(176,215,255))' : 'rgba(214,234,255,0.8)', boxShadow: `inset 0 0 0 1px ${isToday ? 'rgba(120,170,235,0.9)' : 'rgba(150,190,240,0.8)'}` }} />}
        <div style={txt({ left: cx, top: cy, width: cell, color: isToday ? 'rgb(36,71,127)' : txt().color })}>{i + 1}</div>
      </div>,
    )
  }
  return (
    <div style={{ position: 'absolute', left: x, top }}>
      <div style={{ position: 'absolute', left: 0, top: 0 }}>
        <Frame x={0} y={0} w={w} h={h} head={head} footLabel="Date and Time Properties" />
        <div style={txt({ left: 26, top: 39, width: w - 52, fontSize: 10.2, color: 'rgb(60,90,150)' })}>
          {today ? `${DAYS[dow]}, ${MONTHS[m]} ${d}, ${y}` : `${MONTHS[m]} ${y}`}
        </div>
        {[0, 1].map((k) => (
          <svg key={k} width="8" height="10" viewBox="0 0 8 10" style={{ position: 'absolute', left: k ? w - 18 : 10, top: 42 }}>
            <path d={k ? 'M1.5 1 L6.5 5 L1.5 9 Z' : 'M6.5 1 L1.5 5 L6.5 9 Z'} fill="rgb(59,124,198)" />
          </svg>
        ))}
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((s, i) => (
          <div key={i} style={txt({ left: gx + i * cell, top: 60, width: cell, color: 'rgb(59,124,198)' })}>
            {s}
          </div>
        ))}
        <div style={{ position: 'absolute', left: 10, top: 76, width: w - 20, height: 1, background: 'rgba(110,145,205,0.4)' }} />
        {cells}
      </div>
    </div>
  )
})

// month arrows ('ui.value' cal.month: months from today's) and day selection (cal.sel)
const CalHits = memo(function CalHits({ first, days, off }) {
  const cell = (x, y, w, h, go, key) => (
    <div key={key} style={{ position: 'absolute', left: CAL.x + x, top: CAL.y + y, width: w, height: h, pointerEvents: 'auto' }} onPointerDown={(e) => (e.stopPropagation(), go())} />
  )
  const cells = []
  for (let i = 0; i < days; i++) {
    const c = dayCell(first, i)
    cells.push(cell(c.x, c.y, CELL, 17, () => setValue('cal.sel', { off, day: i + 1 }), 'd' + i))
  }
  return (
    <>
      {panelEater(CAL)}
      {cell(4, 38, 20, 18, () => setValue('cal.month', off - 1), 'prev')}
      {cell(CAL.w - 24, 38, 20, 18, () => setValue('cal.month', off + 1), 'next')}
      {cells}
      <FootHit id="cal.go" x={CAL.x} y={CAL.y + CAL.h - 23} w={CAL.w} go={() => launch.control({ applet: 'datetime' })} />
    </>
  )
})

export function CalendarFlyout({ t, dw = 0, dh = 0 }) {
  const now = calendarDate()
  const st = popupState(t, 'calendar')
  // the shown month resets each time the calendar opens
  const offE = lastOf(t, 'ui.value', 'cal.month')
  const off = offE && offE.t >= st.at && st.open ? offE.value : 0
  const selE = lastOf(t, 'ui.value', 'cal.sel')
  const sel = selE && selE.t >= st.at && st.open && selE.value.off === off ? selE.value.day : 0
  const shown = new Date(now.getFullYear(), now.getMonth() + off, 1)
  const y = shown.getFullYear()
  const m = shown.getMonth()
  return (
    <Popup
      t={t}
      id="calendar"
      kind="rise"
      n={10}
      box={{ left: CAL.x - 6, top: CAL.y - 4, width: CAL.w + 12, height: CAL.h + 4 }}
      offset={offsetOf(dw, dh)}
      live={<FootLive t={t} id="cal.go" b={CAL} />}
      hits={<CalHits first={new Date(y, m, 1).getDay()} days={new Date(y, m + 1, 0).getDate()} off={off} />}
    >
      <CalendarPanel y={y} m={m} d={now.getDate()} dow={now.getDay()} time={clockText(now, false)} today={off === 0} sel={sel} />
    </Popup>
  )
}
