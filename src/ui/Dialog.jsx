// Message box body: a glassy icon, the text and a row of buttons, on the pale Plex body.
// Fills its container (a PlexWindow client area).
//
//   <Dialog id icon="info" | "warning" | "error" | "question" | "cd" | node heading text
//           buttons={[{ label, onClick, isDefault, disabled }]} />
import { memo } from 'react'
import { Button } from './Button.jsx'
import { C, FONT, HEAVY } from './theme.js'

export const MessageIcon = memo(function MessageIcon({ kind = 'info', size = 40 }) {
  const s = size
  if (kind === 'warning') {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <defs>
          <linearGradient id="ui-warn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3a8" />
            <stop offset="0.5" stopColor="#ffd23c" />
            <stop offset="1" stopColor="#e9a000" />
          </linearGradient>
        </defs>
        <path d="M20 3 C21.5 3 22.4 3.8 23.2 5.2 L37.6 32 C38.6 34 37.6 36.5 35 36.5 L5 36.5 C2.4 36.5 1.4 34 2.4 32 L16.8 5.2 C17.6 3.8 18.5 3 20 3 Z" fill="url(#ui-warn)" stroke="#b37a00" strokeWidth="1" />
        <path d="M20 5.5 L35.5 33.5 L28 33.5 Z" fill="#fff" opacity="0.18" />
        <rect x="18" y="12" width="4" height="13" rx="2" fill="#3d2a00" />
        <circle cx="20" cy="30" r="2.3" fill="#3d2a00" />
      </svg>
    )
  }
  if (kind === 'cd') {
    return (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <defs>
          <radialGradient id="ui-cd" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.2" stopColor="#f6fbff" />
            <stop offset="0.45" stopColor="#c9dcf2" />
            <stop offset="0.62" stopColor="#f0e2ff" />
            <stop offset="0.78" stopColor="#bfe6ff" />
            <stop offset="1" stopColor="#9fb7d6" />
          </radialGradient>
          <linearGradient id="ui-cd-sheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="17.5" fill="url(#ui-cd)" stroke="#7f98bb" strokeWidth="1" />
        <circle cx="20" cy="20" r="17" fill="url(#ui-cd-sheen)" />
        <circle cx="20" cy="20" r="5.5" fill="#e9f0fa" stroke="#8ea6c8" strokeWidth="1" />
        <circle cx="20" cy="20" r="2.2" fill="#fff" stroke="#8ea6c8" strokeWidth="0.8" />
      </svg>
    )
  }
  const palette = {
    info: ['#bfe3ff', '#3d8ef0', '#1650b8', 'i'],
    question: ['#bfe3ff', '#3d8ef0', '#1650b8', '?'],
    error: ['#ffc4b8', '#ec4a2e', '#a3170a', 'x'],
  }[kind] || ['#bfe3ff', '#3d8ef0', '#1650b8', 'i']
  const [hi, mid, lo, glyph] = palette
  const gid = 'ui-mi-' + kind
  return (
    <svg width={s} height={s} viewBox="0 0 40 40">
      <defs>
        <radialGradient id={gid} cx="0.4" cy="0.32" r="0.75">
          <stop offset="0" stopColor={hi} />
          <stop offset="0.5" stopColor={mid} />
          <stop offset="1" stopColor={lo} />
        </radialGradient>
        <linearGradient id={gid + 'g'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="21" r="17" fill="#000" opacity="0.12" />
      <circle cx="20" cy="20" r="17" fill={`url(#${gid})`} stroke={lo} strokeWidth="0.8" />
      <ellipse cx="20" cy="11" rx="12" ry="7" fill={`url(#${gid}g)`} />
      {glyph === 'i' && (
        <>
          <circle cx="20" cy="11.5" r="2.6" fill="#fff" />
          <rect x="17.6" y="16" width="4.8" height="14" rx="1.6" fill="#fff" />
        </>
      )}
      {glyph === '?' && (
        <text x="20" y="29" textAnchor="middle" fontFamily={HEAVY} fontSize="22" fill="#fff">
          ?
        </text>
      )}
      {glyph === 'x' && <path d="M13.5 13.5 L26.5 26.5 M26.5 13.5 L13.5 26.5" stroke="#fff" strokeWidth="4" strokeLinecap="round" />}
    </svg>
  )
})

const Body = memo(function Body({ icon, heading, text }) {
  return (
    <>
      <div style={{ position: 'absolute', left: 20, top: 20 }}>{typeof icon === 'string' ? <MessageIcon kind={icon} /> : icon}</div>
      <div style={{ position: 'absolute', left: 76, right: 20, top: 20 }}>
        {heading && (
          <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: 17, color: C.headingLight, marginBottom: 6, whiteSpace: 'nowrap' }}>
            {heading}
          </div>
        )}
        <div style={{ fontFamily: FONT, fontSize: 11.5, lineHeight: '16px', color: C.text, whiteSpace: 'pre-wrap' }}>{text}</div>
      </div>
    </>
  )
})

export function Dialog({ id, icon = 'info', heading, text, buttons = [], children, bw = 80 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.body, overflow: 'hidden' }}>
      <Body icon={icon} heading={heading} text={text} />
      {children}
      <div style={{ position: 'absolute', right: 14, bottom: 14, display: 'flex', gap: 8 }}>
        {buttons.map((b, i) => (
          <Button key={i} id={`${id}.b${i}`} label={b.label} onClick={b.onClick} isDefault={b.isDefault} disabled={b.disabled} w={b.w || bw} h={23} />
        ))}
      </div>
    </div>
  )
}
