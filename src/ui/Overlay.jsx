// A layer above every window and the taskbar (below the cursor) for menus, context menus and
// tooltips, so they are never clipped by the window that opened them. Stage px coordinates.
import { createPortal } from 'react-dom'
import './ui.css'
import { useStageScale } from '../core/Stage.jsx'

let host = null
function getHost() {
  if (host && host.isConnected) return host
  const stage = typeof document !== 'undefined' && document.getElementById('stage')
  if (!stage) return null
  host = document.createElement('div')
  host.id = 'ui-overlay'
  // a point at the stage's origin, not a stage-sized box (core/point.js: WebKit backs a layer at
  // its own box); what it holds is placed by left / top in stage px
  host.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:9000;pointer-events:none'
  stage.appendChild(host)
  return host
}

export function Overlay({ children }) {
  const h = getHost()
  return h ? createPortal(children, h) : null
}

// A transparent full-stage layer that eats the click which dismisses a menu (the stage: the
// video's frame extended to the screen's shape, core/Stage.jsx).
export function Catcher({ onDismiss }) {
  const { w, h } = useStageScale()
  return (
    <div
      style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, pointerEvents: 'auto' }}
      onPointerDown={(e) => {
        e.stopPropagation()
        onDismiss()
      }}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}
