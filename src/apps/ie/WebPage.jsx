// An archived 2003 web page (public/web/<site>/, made static from the Wayback Machine: see web.js)
// shown in Internet Explorer's page area: a same-origin iframe sandboxed without scripts, sized to
// the area, its own scrollbars hidden and the Plex scrollbars beside it, IE6-style (the vertical one
// always, the horizontal one when the page is wider).
//
// Everything the page does goes through the event log, like the rest of the OS:
//   scrolling (wheel over the page, the scrollbars)  'ui.value' { id: <sid>:scroll / :scrollx }
//   a link under the pointer (the status bar shows it)  'hover' { id: <win>/web.link, key: url }
//   a link click                                     onNavigate(url) (IE logs 'ie.go')
//   a form submitted                                 onNavigate(action?fields) (no such page: IE's
//                                                    "The page cannot be displayed")
// The page's own pointer moves are passed on to the OS (its drawn cursor; a click focuses the
// window). Motion-blur copies (live = false) draw the page area blank: an iframe per copy would
// load the page again, and it costs a document's memory each.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { asset } from '../../core/preload.js'
import { Scrollbar, BAR_W, valueOf, wid } from '../../ui/index.js'
import { stageScale } from '../../core/Stage.jsx'
import { clamp } from '../../core/anim.js'

// what the OS adds to every page: no scrollbars of its own (the Plex ones scroll it) and no
// system cursor (the OS draws its own over the stage)
const PAGE_STYLE = 'html{overflow:hidden!important;scrollbar-width:none}html::-webkit-scrollbar{display:none}*,a,a *{cursor:none!important}'

export function WebPage({ win, page, sid, x, y, w, h, t, zoom = 1, live, active, onNavigate, onHoverLink }) {
  const ref = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const sx = clamp(valueOf(t, sid + ':scrollx', 0), 0, Math.max(0, size.w - w))
  const vbar = BAR_W + 1
  const hbar = size.w > w - vbar ? BAR_W + 1 : 0
  const vw = w - vbar
  const vh = h - hbar
  const maxY = Math.max(0, size.h - vh)
  const maxX = Math.max(0, size.w - vw)
  const sy = clamp(valueOf(t, sid + ':scroll', 0), 0, maxY)
  const cur = useRef({})
  cur.current = { sid, maxX, maxY, onNavigate, onHoverLink, active, win }

  // the page's own events, handled by the OS (listeners from this realm run in the sandboxed page)
  useEffect(() => {
    const frame = ref.current
    if (!frame || !live) return
    let doc = null
    const measure = () => {
      if (!doc?.documentElement) return
      const z = zoom || 1
      const el = doc.documentElement
      const nw = Math.ceil(Math.max(el.scrollWidth, doc.body?.scrollWidth || 0) * z)
      const nh = Math.ceil(Math.max(el.scrollHeight, doc.body?.scrollHeight || 0) * z)
      setSize((s) => (s.w === nw && s.h === nh ? s : { w: nw, h: nh }))
    }
    const scrollBy = (dx, dy) => {
      const c = cur.current
      const t0 = now()
      if (dy) {
        const y0 = clamp(valueOf(t0, c.sid + ':scroll', 0), 0, c.maxY)
        const ny = clamp(Math.round(y0 + dy), 0, c.maxY)
        if (ny !== y0) emit('ui.value', { id: c.sid + ':scroll', value: ny })
      }
      if (dx) {
        const x0 = clamp(valueOf(t0, c.sid + ':scrollx', 0), 0, c.maxX)
        const nx = clamp(Math.round(x0 + dx), 0, c.maxX)
        if (nx !== x0) emit('ui.value', { id: c.sid + ':scrollx', value: nx })
      }
    }
    // a page px -> the viewport px the OS's pointer listeners read
    const toParent = (e) => {
      const r = frame.getBoundingClientRect()
      const k = r.width / (frame.clientWidth || 1)
      return { clientX: r.left + e.clientX * k, clientY: r.top + e.clientY * k }
    }
    const linkOf = (e) => {
      const a = e.target?.closest?.('a[href], area[href]')
      if (!a) return null
      const href = a.getAttribute('href')
      return href && href !== '#' && !/^javascript:/i.test(href) ? href : null
    }
    let hovered = null
    const handlers = {
      wheel: (e) => {
        e.preventDefault()
        const k = (e.deltaMode === 1 ? 16 : 1) / stageScale()
        scrollBy((e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX) * k, e.shiftKey && !e.deltaX ? 0 : e.deltaY * k)
      },
      click: (e) => {
        const a = e.target?.closest?.('a[href], area[href]')
        if (!a) return
        e.preventDefault()
        const href = linkOf(e)
        if (href && e.button === 0) cur.current.onNavigate(href)
      },
      submit: (e) => {
        e.preventDefault()
        const f = e.target
        const action = f.getAttribute('action') || cur.current.win.props?.url || ''
        let qs = ''
        try {
          qs = new URLSearchParams(new FormData(f, e.submitter || undefined)).toString()
        } catch {
          qs = ''
        }
        cur.current.onNavigate(action.replace(/[?#].*$/, '') + (qs ? '?' + qs : ''))
      },
      pointermove: (e) => {
        dispatchEvent(new PointerEvent('pointermove', { ...toParent(e), pointerId: e.pointerId, pointerType: e.pointerType, buttons: e.buttons, bubbles: true }))
        const href = linkOf(e)
        if (href !== hovered) {
          if (hovered) cur.current.onHoverLink(hovered, false)
          hovered = href
          if (href) cur.current.onHoverLink(href, true)
        }
      },
      pointerdown: (e) => {
        dispatchEvent(new PointerEvent('pointerdown', { ...toParent(e), pointerId: e.pointerId, pointerType: e.pointerType, button: e.button, buttons: e.buttons, bubbles: true }))
        if (!cur.current.active) emit('win.focus', { id: cur.current.win.id })
      },
      pointerout: (e) => {
        // (out of the page altogether)
        if (e.relatedTarget || !hovered) return
        cur.current.onHoverLink(hovered, false)
        hovered = null
      },
      keydown: (e) => {
        // (the page's keyboard scrolling, logged like the wheel's; not while typing in a field)
        if (/^(input|textarea|select)$/i.test(e.target?.tagName || '')) return
        const step = { ArrowDown: 40, ArrowUp: -40, PageDown: vh * 0.9, PageUp: -vh * 0.9, ' ': vh * 0.9, Home: -1e6, End: 1e6 }[e.key]
        if (step != null) {
          e.preventDefault()
          scrollBy(0, step)
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault()
          scrollBy(e.key === 'ArrowRight' ? 40 : -40, 0)
        }
      },
    }
    const attach = () => {
      doc = frame.contentDocument
      if (!doc || !doc.documentElement || doc.location.href === 'about:blank') return
      const st = doc.createElement('style')
      st.textContent = PAGE_STYLE
      doc.head ? doc.head.appendChild(st) : doc.documentElement.appendChild(st)
      for (const [k, fn] of Object.entries(handlers)) doc.addEventListener(k, fn, { capture: true, passive: k !== 'wheel' && k !== 'keydown' && k !== 'click' && k !== 'submit' })
      measure()
      doc.defaultView?.addEventListener('load', measure)
      for (const img of doc.images) if (!img.complete) img.addEventListener('load', measure, { once: true })
    }
    const onLoad = () => attach()
    frame.addEventListener('load', onLoad)
    if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.location.href !== 'about:blank') attach()
    return () => {
      frame.removeEventListener('load', onLoad)
      if (doc) for (const [k, fn] of Object.entries(handlers)) doc.removeEventListener(k, fn, { capture: true })
      if (hovered) cur.current.onHoverLink(hovered, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.site, live])

  // re-measure when the area or the text size changes (the page reflows)
  useLayoutEffect(() => {
    const doc = ref.current?.contentDocument
    if (!doc?.documentElement || !live) return
    doc.documentElement.style.zoom = zoom === 1 ? '' : String(zoom)
    const el = doc.documentElement
    const nw = Math.ceil(Math.max(el.scrollWidth, doc.body?.scrollWidth || 0) * zoom)
    const nh = Math.ceil(Math.max(el.scrollHeight, doc.body?.scrollHeight || 0) * zoom)
    setSize((s) => (s.w === nw && s.h === nh ? s : { w: nw, h: nh }))
  }, [vw, vh, zoom, live])

  // the logged scroll position, applied to the page
  useLayoutEffect(() => {
    const win2 = ref.current?.contentWindow
    if (!win2 || !live) return
    try {
      const z = zoom || 1
      if (Math.round(win2.scrollX * z) !== sx || Math.round(win2.scrollY * z) !== sy) win2.scrollTo(sx / z, sy / z)
    } catch {
      /* (not loaded yet) */
    }
  })

  const setY = (v) => emit('ui.value', { id: sid + ':scroll', value: v })
  const setX = (v) => emit('ui.value', { id: sid + ':scrollx', value: v })
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: '#fff', overflow: 'hidden' }}>
      {live && (
        <iframe
          ref={ref}
          title={page.title}
          src={asset(`web/${page.site}/index.html`)}
          sandbox="allow-same-origin allow-forms"
          referrerPolicy="no-referrer"
          style={{ position: 'absolute', left: 0, top: 0, width: vw, height: vh, border: 0, background: '#fff' }}
        />
      )}
      {live && <Scrollbar id={wid(win, 'webbar')} x={w - BAR_W} y={0} h={vh} viewH={vh} contentH={Math.max(size.h, vh)} pos={sy} onScroll={setY} t={t} />}
      {live && hbar > 0 && <Scrollbar id={wid(win, 'webbarx')} horizontal x={0} y={h - BAR_W} h={vw} viewH={vw} contentH={size.w} pos={sx} onScroll={setX} t={t} />}
      {hbar > 0 && <div style={{ position: 'absolute', left: vw, top: vh, width: vbar, height: hbar, background: '#eef3fa' }} />}
    </div>
  )
}
