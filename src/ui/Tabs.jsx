// Tabs: a strip of rounded tabs over a panel. The chosen tab is logged ('ui.value' { id, value }).
//
//   <Tabs id tabs={[{ key, label }]} x y w def value? onChange />   tabOf(t, id, def)
//   <TabPanel x y w h>...</TabPanel>   the white panel the strip sits on
import { memo } from 'react'
import { emit } from '../core/events.js'
import { useUITime as useTime } from './scope.jsx'
import { valueOf, hoverKeys, pt } from './state.js'
import { C, FONT, HEAVY } from './theme.js'

export const tabOf = (t, id, def) => valueOf(t, id, def)
export const TAB_H = 22

const Tab = memo(function Tab({ label, on, lit }) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: on ? '0 0 -1px 0' : '3px 0 0 0',
          borderRadius: '6px 6px 0 0',
          background: on
            ? 'linear-gradient(180deg, #ffffff 0, #f7faff 100%)'
            : lit > 0.5
              ? 'linear-gradient(180deg, #f2f8ff 0, #d8e8fb 100%)'
              : 'linear-gradient(180deg, #e6eef9 0, #cfdcef 100%)',
          boxShadow: on ? `inset 0 0 0 1px ${C.border}, inset 0 2px 0 #7fb2f0` : `inset 0 0 0 1px ${lit > 0.5 ? '#86ace0' : '#b2c3db'}`,
          clipPath: 'inset(-2px -2px 1px -2px)',
        }}
      />
      {on && <div style={{ position: 'absolute', left: 1, right: 1, bottom: -1, height: 2, background: '#f7faff' }} />}
      <div
        style={{
          position: 'absolute',
          inset: on ? '0 0 0 0' : '3px 0 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: on ? HEAVY : FONT,
          fontWeight: on ? 400 : 500,
          fontSize: 11,
          color: on ? '#2c6cc4' : '#5b6f93',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </>
  )
})

export function Tabs({ id, tabs, x, y, w, def, value, onChange, minTab = 64, t: tProp }) {
  const t0 = useTime()
  const t = tProp ?? t0
  const cur = value ?? valueOf(t, id, def ?? tabs[0]?.key)
  const lit = hoverKeys(t, id + ':tabs')
  let left = 6
  return (
    <div style={{ position: x == null ? 'relative' : 'absolute', left: x, top: y, width: w, height: TAB_H }}>
      {tabs.map((tb) => {
        const tw = Math.max(minTab, Math.round(String(tb.label).length * 6.6 + 22))
        const l = left
        left += tw + 1
        return (
          <div
            key={tb.key}
            style={{ position: 'absolute', left: l, top: 0, width: tw, height: TAB_H, zIndex: tb.key === cur ? 1 : 0 }}
            onPointerEnter={(e) => emit('hover', { id: id + ':tabs', key: tb.key, on: true, ...pt(e) })}
            onPointerLeave={() => emit('hover', { id: id + ':tabs', key: tb.key, on: false })}
            onPointerDown={(e) => {
              if (e.button !== 0 || tb.key === cur) return
              if (value === undefined) emit('ui.value', { id, value: tb.key })
              onChange?.(tb.key)
            }}
          >
            <Tab label={tb.label} on={tb.key === cur} lit={lit.get(tb.key) || 0} />
          </div>
        )
      })}
    </div>
  )
}

export const TabPanel = memo(function TabPanel({ x, y, w, h, children }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 5,
        background: 'linear-gradient(180deg, #f7faff 0, #ffffff 30%, #f1f5fc 100%)',
        boxShadow: `inset 0 0 0 1px ${C.border}`,
      }}
    >
      {children}
    </div>
  )
})
