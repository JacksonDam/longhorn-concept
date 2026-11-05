// A layer above every window and the taskbar (below the cursor) for menus, context menus and
// tooltips, so they are never clipped by the window that opened them. Stage px coordinates.
import { createPortal } from 'react-dom'
import './ui.css'

let host = null
function getHost() {
  if (host && host.isConnected) return host
  const stage = typeof document !== 'undefined' && document.getElementById('stage')
  if (!stage) return null
  host = document.createElement('div')
  host.id = 'ui-overlay'
  host.style.cssText = 'position:absolute;left:0;top:0;width:960px;height:720px;z-index:9000;pointer-events:none'
  stage.appendChild(host)
  return host
}

export function Overlay({ children }) {
  const h = getHost()
  return h ? createPortal(children, h) : null
}

// A transparent full-stage layer that eats the click which dismisses a menu.
export function Catcher({ onDismiss }) {
  return (
    <div
      style={{ position: 'absolute', left: 0, top: 0, width: 960, height: 720, pointerEvents: 'auto' }}
      onPointerDown={(e) => {
        e.stopPropagation()
        onDismiss()
      }}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}
