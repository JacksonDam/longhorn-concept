// Message box body: XP's message box icon, the text and a row of buttons, on the pale Plex body.
// Fills its container (a PlexWindow client area).
//
//   <Dialog id icon="info" | "warning" | "error" | "question" | "cd" | node heading text
//           buttons={[{ label, onClick, isDefault, disabled }]} />
import { memo } from 'react'
import { Button } from './Button.jsx'
import { C, FONT } from './theme.js'
import { XpIcon } from '../os/xp.jsx'

// XP's message box icons (user32.dll) and a blank disc (shell32 302) for the burn dialogs
const MSG = { info: 'msg-info', warning: 'msg-warning', error: 'msg-error', question: 'msg-question', cd: 'disc' }
export const MessageIcon = memo(function MessageIcon({ kind = 'info', size = 40 }) {
  return <XpIcon name={MSG[kind] || 'msg-info'} size={size} />
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
