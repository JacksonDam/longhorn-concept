// Microsoft Word: Document 12 (the video's taskbar) or a file from my Documents, as an editable
// page. A hidden textarea takes the keyboard; the document (text + formatting runs + paragraph
// attributes, word/rich.js) and the selection are logged ('ui.value' doc / sel), the page is drawn
// from them. The formatting bar works on the selection (or the next typed text), File > Save
// logs 'word.save' and clears the modified mark; closing with changes asks to save.
//   win.open { id: 'doc1', app: 'word' } / { id: 'word:<file>', app: 'word', props: { file } }
import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, valueOf, lastOf, find, useLive, focusAt, setFocus, ScrollView, DropMenu, dropBelow, ToolButton, Tooltip, C, FONT } from '../../ui/index.js'
import { BLINK } from '../../ui/TextField.jsx'
import { AppTop, appTopHeight, StatusBar } from '../lib/chrome.jsx'
import { Ico } from '../lib/icons.jsx'
import { openWin, closeWin, messageBox } from '../lib/common.js'
import { docFor } from './docs.js'
import { BASE, fmtAt, applyRange, allHave, edit, paraRanges, paraIndex, setParas } from './rich.js'

const FONTS = ['Times New Roman', 'Arial', 'Georgia', 'Tahoma', 'Verdana', 'Courier New']
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36]
const COLORS = [['Automatic', '#000000'], ['Dark Blue', '#1f3f7a'], ['Blue', '#2c6cc4'], ['Red', '#c0272d'], ['Green', '#2e7d32'], ['Orange', '#e67e22'], ['Gray', '#808080']]
const PX = 1.1 // px per point on the page
const PAGE_W = 540
const MARGIN = 54

const docName = (props) => (props?.file ? props.file.replace(/\.(doc|txt)$/, '') : props?.untitled || 'Document 12')

// ---- the page -----------------------------------------------------------------------------------
const spanStyle = (r) => ({
  fontFamily: `'${r.font}', serif`,
  fontSize: r.size * PX,
  fontWeight: r.b ? 700 : 400,
  fontStyle: r.i ? 'italic' : 'normal',
  textDecoration: r.u ? 'underline' : 'none',
  color: r.color,
})
const Caret = ({ h }) => <span style={{ display: 'inline-block', width: 0, height: h, marginRight: -1, borderLeft: '1px solid #000', verticalAlign: 'text-bottom' }} />

const PageText = memo(function PageText({ doc, a, b, focused, caret }) {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  const out = []
  const pr = paraRanges(doc.text)
  // run starts
  const starts = []
  let o = 0
  for (const r of doc.runs) {
    starts.push([o, r])
    o += r.len
  }
  pr.forEach(([s, e], pi) => {
    const para = doc.paras[pi] || {}
    const cuts = new Set([s, e])
    for (const [rs] of starts) if (rs > s && rs < e) cuts.add(rs)
    for (const c of [lo, hi]) if (c > s && c < e) cuts.add(c)
    const pts = [...cuts].sort((x, y) => x - y)
    const kids = []
    let maxSize = fmtAt(doc.runs, s + (e > s ? 1 : 0)).size
    for (let k = 0; k < pts.length - 1; k++) {
      const x0 = pts[k]
      const x1 = pts[k + 1]
      const r = fmtAt(doc.runs, x0 + 1)
      maxSize = Math.max(maxSize, r.size)
      const selected = focused && x0 >= lo && x1 <= hi && lo !== hi
      if (caret && lo === hi && lo === x0) kids.push(<Caret key={'c' + x0} h={r.size * PX * 1.15} />)
      kids.push(
        <span key={x0} data-o={x0} style={{ ...spanStyle(r), ...(selected ? { background: C.textSel, color: '#fff' } : null) }}>
          {doc.text.slice(x0, x1)}
        </span>,
      )
    }
    const fe = fmtAt(doc.runs, s)
    if (e === s) kids.push(<span key="z" data-o={s} style={spanStyle(fe)}>{'​'}</span>)
    if (caret && lo === hi && lo === e) kids.push(<Caret key="ce" h={fmtAt(doc.runs, e).size * PX * 1.15} />)
    out.push(
      <div key={pi} data-p={s} data-e={e} style={{ position: 'relative', textAlign: para.align || 'left', paddingLeft: para.bullet ? 22 : 0, minHeight: maxSize * PX * 1.25, lineHeight: 1.25, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
        {para.bullet && <span style={{ position: 'absolute', left: 6, top: 0, ...spanStyle(fe), fontFamily: 'Arial', fontWeight: 400, fontStyle: 'normal', textDecoration: 'none' }}>{'•'}</span>}
        {kids}
      </div>,
    )
  })
  return out
})

function posFromPoint(e, root) {
  const r = document.caretRangeFromPoint?.(e.clientX, e.clientY)
  const n = r?.startContainer
  if (n && root.contains(n)) {
    const el = n.nodeType === 3 ? n.parentElement : n
    const span = el.closest('[data-o]')
    if (span && n.nodeType === 3) {
      const p = span.closest('[data-p]')
      return Math.min(+span.dataset.o + r.startOffset, p ? +p.dataset.e : Infinity)
    }
    const p = el.closest('[data-p]')
    if (p) return +p.dataset.e
  }
  // below the text: the end
  return null
}

// ---- toolbar pieces -------------------------------------------------------------------------------
function Field({ id, x, y, w, text, items }) {
  return (
    <>
      <div
        style={{ position: 'absolute', left: x, top: y, width: w, height: 18, borderRadius: 3, background: 'linear-gradient(180deg, #ffffff, #e9f1fb)', boxShadow: 'inset 0 0 0 1px rgba(20,55,105,0.55), 0 1px 0 rgba(170,210,255,0.35)', fontFamily: FONT, fontSize: 10.5, lineHeight: '18px', paddingLeft: 5, color: '#1d3557', whiteSpace: 'nowrap', overflow: 'hidden', boxSizing: 'border-box' }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.preventDefault()
          dropBelow(id, e.currentTarget, items)
        }}
      >
        {text}
        <svg width="7" height="4" style={{ position: 'absolute', right: 5, top: 7 }}>
          <path d="M0 0 L7 0 L3.5 4 Z" fill="#3d63a6" />
        </svg>
      </div>
      <DropMenu id={id} items={items} />
    </>
  )
}

// ---- the window --------------------------------------------------------------------------------
function Word({ win, t, w, h }) {
  const id = (n) => wid(win, n)
  const live = useLive()
  const name = docName(win.props)
  const docId = id('doc')
  const de = lastOf(t, 'ui.value', docId)
  const doc = de ? de.value : docFor(win.props?.file || 'Document 12')
  const sel = valueOf(t, id('sel'), { a: 0, b: 0 })
  const fe = focusAt(t)
  const focused = !!fe && fe.field === docId
  const since = t - Math.max(focused ? fe.t : 0, de ? de.t : 0, lastOf(t, 'ui.value', id('sel'))?.t ?? 0)
  const caret = focused && sel.a === sel.b && Math.floor(since / BLINK) % 2 === 0
  const saveE = lastSave(t, win)
  const dirty = !!de && (!saveE || de.t > saveE.t)
  const lo = Math.min(sel.a, sel.b)
  const hi = Math.max(sel.a, sel.b)
  const cur = sel.pend ? { ...fmtAt(doc.runs, lo), ...sel.pend } : fmtAt(doc.runs, lo === hi ? lo : lo + 1)
  const para = doc.paras[paraIndex(doc.text, lo)] || {}
  const ta = useRef(null)
  const pageRef = useRef(null)
  const drag = useRef(null)

  // keep the textarea in step with the log
  useLayoutEffect(() => {
    const el = ta.current
    if (el && el.value !== doc.text) {
      el.value = doc.text
      if (document.activeElement === el) el.setSelectionRange(lo, hi)
    }
  })
  useEffect(() => {
    if (!live) return
    const el = ta.current
    const onSel = () => document.activeElement === el && syncSel(el)
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  })

  const current = () => {
    const tt = now()
    const e = lastOf(tt, 'ui.value', docId)
    return e ? e.value : docFor(win.props?.file || 'Document 12')
  }
  const curSel = () => valueOf(now(), id('sel'), { a: 0, b: 0 })
  const syncSel = (el) => {
    const s = curSel()
    const a = el.selectionDirection === 'backward' ? el.selectionEnd : el.selectionStart
    const b = el.selectionDirection === 'backward' ? el.selectionStart : el.selectionEnd
    if (s.a !== a || s.b !== b) emit('ui.value', { id: id('sel'), value: { a, b } })
  }
  const onInput = (el) => {
    const d = current()
    const s = curSel()
    const nd = edit(d, el.value, s.pend ? { ...fmtAt(d.runs, Math.min(s.a, s.b)), ...s.pend } : null)
    emit('ui.value', { id: docId, value: nd })
    emit('ui.value', { id: id('sel'), value: { a: el.selectionStart, b: el.selectionEnd } })
  }
  const toggle = (k) => {
    const d = current()
    const s = curSel()
    const a = Math.min(s.a, s.b)
    const b = Math.max(s.a, s.b)
    if (a === b) {
      const f = { ...fmtAt(d.runs, a), ...(s.pend || {}) }
      emit('ui.value', { id: id('sel'), value: { ...s, pend: { ...(s.pend || {}), [k]: !f[k] } } })
    } else emit('ui.value', { id: docId, value: { ...d, runs: applyRange(d.runs, a, b, { [k]: !allHave(d.runs, a, b, k, true) }) } })
    refocus()
  }
  const setFmt = (patch) => {
    const d = current()
    const s = curSel()
    const a = Math.min(s.a, s.b)
    const b = Math.max(s.a, s.b)
    if (a === b) emit('ui.value', { id: id('sel'), value: { ...s, pend: { ...(s.pend || {}), ...patch } } })
    else emit('ui.value', { id: docId, value: { ...d, runs: applyRange(d.runs, a, b, patch) } })
    refocus()
  }
  const setPara = (patch) => {
    const d = current()
    const s = curSel()
    emit('ui.value', { id: docId, value: setParas(d, Math.min(s.a, s.b), Math.max(s.a, s.b), patch) })
    refocus()
  }
  const refocus = () => ta.current && ta.current.focus({ preventScroll: true })
  const save = () => emit('word.save', { id: win.id, name })
  const close = () => {
    if (!dirty) return closeWin(win.id)
    messageBox({
      title: 'Microsoft Word',
      icon: 'warning',
      text: `Do you want to save the changes to ${name}?`,
      buttons: [
        { label: 'Yes', isDefault: true, emit: [['word.save', { id: win.id, name }], ['win.close', { id: win.id }]] },
        { label: 'No', emit: ['win.close', { id: win.id }] },
        { label: 'Cancel' },
      ],
    })
  }
  const insertText = (s) => {
    const el = ta.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.setRangeText(s, el.selectionStart, el.selectionEnd, 'end')
    onInput(el)
  }
  let newN = 13
  const words = (doc.text.match(/\S+/g) || []).length
  const lineCol = (() => {
    const p = paraIndex(doc.text, lo)
    const start = doc.text.lastIndexOf('\n', lo - 1) + 1
    return [p + 1, lo - start + 1]
  })()

  const toolbar = [
    { id: id('new'), icon: 'newdoc', tip: 'New Blank Document', onClick: () => openWin(`word:new${Math.round(now() * 1000)}`, 'word', { untitled: `Document ${newN++}` }) },
    { id: id('open'), icon: 'open', tip: 'Open', onClick: () => openWin('documents', 'documents') },
    { id: id('save'), icon: 'save', tip: 'Save', onClick: save },
    { id: id('print'), icon: 'print', tip: 'Print', onClick: () => noPrinter() },
    '|',
    { id: id('cut'), icon: 'cut', tip: 'Cut', onClick: () => insertText(''), disabled: lo === hi },
    { id: id('copy'), icon: 'copy', tip: 'Copy', onClick: () => refocus(), disabled: lo === hi },
    { id: id('paste'), icon: 'paste', tip: 'Paste', onClick: () => refocus() },
    '|',
    { id: id('undo'), icon: 'undo', tip: 'Undo', onClick: () => (refocus(), document.execCommand('undo')) },
    { id: id('redo'), icon: 'redo', tip: 'Redo', onClick: () => (refocus(), document.execCommand('redo')) },
    '|',
    { id: id('wc'), icon: 'find', label: 'Word Count', onClick: () => wordCount(doc) },
  ]
  const fontItems = FONTS.map((f) => ({ label: f, radio: cur.font === f, onClick: () => setFmt({ font: f }) }))
  const sizeItems = SIZES.map((s) => ({ label: String(s), radio: cur.size === s, onClick: () => setFmt({ size: s }) }))
  const styleItems = [
    { label: 'Normal', onClick: () => setFmt({ ...BASE }) },
    { label: 'Heading 1', onClick: () => setFmt({ b: true, size: 16, font: 'Arial', color: '#1f3f7a' }) },
    { label: 'Heading 2', onClick: () => setFmt({ b: true, i: true, size: 14, font: 'Arial', color: '#1f3f7a' }) },
  ]
  const colorItems = COLORS.map(([n, c]) => ({ label: n, radio: cur.color === c, icon: <div style={{ width: 12, height: 12, margin: 2, background: c, boxShadow: '0 0 0 1px #8a9bb8' }} />, onClick: () => setFmt({ color: c }) }))
  const menus = [
    {
      key: 'file',
      label: 'File',
      items: [
        { label: 'New...', onClick: () => openWin(`word:new${Math.round(now() * 1000)}`, 'word', { untitled: 'Document 13' }) },
        { label: 'Open...', shortcut: 'Ctrl+O', onClick: () => openWin('documents', 'documents') },
        { label: 'Close', onClick: close },
        '-',
        { label: 'Save', shortcut: 'Ctrl+S', onClick: save },
        '-',
        { label: 'Print...', shortcut: 'Ctrl+P', onClick: noPrinter },
        '-',
        { label: 'Exit', onClick: close },
      ],
    },
    { key: 'edit', label: 'Edit', items: [{ label: 'Undo Typing', shortcut: 'Ctrl+Z', onClick: () => (refocus(), document.execCommand('undo')) }, '-', { label: 'Cut', shortcut: 'Ctrl+X', disabled: lo === hi, onClick: () => insertText('') }, { label: 'Select All', shortcut: 'Ctrl+A', onClick: () => (refocus(), ta.current?.select()) }] },
    { key: 'view', label: 'View', items: [{ label: 'Ruler', checked: valueOf(t, id('ruler'), true), onClick: () => emit('ui.value', { id: id('ruler'), value: !valueOf(now(), id('ruler'), true) }) }] },
    { key: 'insert', label: 'Insert', items: [{ label: 'Date and Time...', onClick: () => insertText('November 5, 2003') }, { label: 'Symbol...', onClick: () => insertText('©') }] },
    {
      key: 'format',
      label: 'Format',
      items: [
        { label: 'Font', items: fontItems },
        { label: 'Size', items: sizeItems },
        { label: 'Font Color', items: colorItems },
        '-',
        { label: 'Bullets', checked: !!para.bullet, onClick: () => setPara({ bullet: !para.bullet }) },
        { label: 'Align Left', radio: para.align === 'left' || !para.align, onClick: () => setPara({ align: 'left' }) },
        { label: 'Center', radio: para.align === 'center', onClick: () => setPara({ align: 'center' }) },
        { label: 'Align Right', radio: para.align === 'right', onClick: () => setPara({ align: 'right' }) },
      ],
    },
    { key: 'tools', label: 'Tools', items: [{ label: 'Spelling and Grammar...', shortcut: 'F7', onClick: () => messageBox({ title: 'Microsoft Word', icon: 'info', text: 'The spelling and grammar check is complete.' }) }, { label: 'Word Count...', onClick: () => wordCount(doc) }] },
    { key: 'help', label: 'Help', items: [{ label: 'Microsoft Word Help', shortcut: 'F1', onClick: () => openWin('help', 'help', { topic: 'word' }) }, '-', { label: 'About Microsoft Word', onClick: () => messageBox({ title: 'About Microsoft Word', icon: 'info', text: 'Microsoft® Office Word 2003\nPart of Microsoft Office Professional Edition 2003\nCopyright © 1983-2003 Microsoft Corporation.' }) }] },
  ]
  const top = appTopHeight({ row2: 24 })
  const rulerOn = valueOf(t, id('ruler'), true)
  const pageTop = top + (rulerOn ? 20 : 0)
  const sbH = 20
  const fmtBtn = (k, icon, tip, on, fn, x) => (
    <span key={k}>
      <ToolButton id={id('f.' + k)} x={x} y={top - 26} w={24} h={22} icon={<Ico kind={icon} size={16} />} iconSize={16} active={on} onClick={fn} />
      <Tooltip forId={id('f.' + k)} text={tip} />
    </span>
  )
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#9fb1cc' }}>
      <AppTop id={id('m')} w={w} menus={menus} toolbar={toolbar} row2={24}>
        <Field id={id('dd.style')} x={10} y={top - 24} w={74} text={cur.b && cur.size >= 14 ? (cur.i ? 'Heading 2' : 'Heading 1') : 'Normal'} items={styleItems} />
        <Field id={id('dd.font')} x={90} y={top - 24} w={118} text={cur.font} items={fontItems} />
        <Field id={id('dd.size')} x={214} y={top - 24} w={40} text={String(cur.size)} items={sizeItems} />
        {fmtBtn('b', 'bold', 'Bold', cur.b, () => toggle('b'), 262)}
        {fmtBtn('i', 'italic', 'Italic', cur.i, () => toggle('i'), 288)}
        {fmtBtn('u', 'underline', 'Underline', cur.u, () => toggle('u'), 314)}
        {fmtBtn('al', 'alignL', 'Align Left', (para.align || 'left') === 'left', () => setPara({ align: 'left' }), 348)}
        {fmtBtn('ac', 'alignC', 'Center', para.align === 'center', () => setPara({ align: 'center' }), 374)}
        {fmtBtn('ar', 'alignR', 'Align Right', para.align === 'right', () => setPara({ align: 'right' }), 400)}
        {fmtBtn('bl', 'bullets', 'Bullets', !!para.bullet, () => setPara({ bullet: !para.bullet }), 434)}
        <span>
          <ToolButton id={id('f.color')} x={460} y={top - 26} w={34} h={22} icon={<Ico kind="color" size={16} />} iconSize={16} dropdown onClick={(e) => dropBelow(id('dd.color'), e.currentTarget, colorItems)} />
          <Tooltip forId={id('f.color')} text="Font Color" />
          <DropMenu id={id('dd.color')} items={colorItems} />
        </span>
      </AppTop>
      {rulerOn && <Ruler y={top} w={w} />}
      <ScrollView id={id('scroll')} x={0} y={pageTop} w={w} h={h - pageTop - sbH} bar="always">
        <div style={{ padding: '14px 0 24px', minHeight: h - pageTop - sbH }}>
          <div
            ref={pageRef}
            style={{ position: 'relative', margin: '0 auto', width: PAGE_W, minHeight: 640, background: '#fff', boxShadow: '2px 3px 6px rgba(20,40,80,0.35), 0 0 0 1px #7f93b3', padding: `${MARGIN}px ${MARGIN}px`, boxSizing: 'border-box', userSelect: 'none' }}
            onPointerDown={(e) => {
              if (e.button !== 0 || !live) return
              e.preventDefault()
              const p = posFromPoint(e, pageRef.current) ?? current().text.length
              const el = ta.current
              el.focus({ preventScroll: true })
              const s = curSel()
              const a = e.shiftKey ? s.a : p
              el.setSelectionRange(Math.min(a, p), Math.max(a, p), p < a ? 'backward' : 'forward')
              drag.current = { a }
              e.currentTarget.setPointerCapture(e.pointerId)
              emit('ui.value', { id: id('sel'), value: { a, b: p } })
              if (focusAt(now())?.field !== docId) setFocus(docId)
            }}
            onPointerMove={(e) => {
              const d = drag.current
              if (!d) return
              const p = posFromPoint(e, pageRef.current)
              if (p == null) return
              const s = curSel()
              if (s.b === p) return
              ta.current.setSelectionRange(Math.min(d.a, p), Math.max(d.a, p), p < d.a ? 'backward' : 'forward')
              emit('ui.value', { id: id('sel'), value: { a: d.a, b: p } })
            }}
            onPointerUp={() => (drag.current = null)}
            onDoubleClick={(e) => {
              const p = posFromPoint(e, pageRef.current)
              if (p == null) return
              const tx = current().text
              let a = p
              let b = p
              while (a > 0 && /\w/.test(tx[a - 1])) a--
              while (b < tx.length && /\w/.test(tx[b])) b++
              ta.current.setSelectionRange(a, b)
              emit('ui.value', { id: id('sel'), value: { a, b } })
            }}
          >
            <PageText doc={doc} a={sel.a} b={sel.b} focused={focused} caret={caret} />
          </div>
        </div>
      </ScrollView>
      {live && (
        <textarea
          ref={ta}
          className="lh-input"
          defaultValue={doc.text}
          spellCheck={false}
          style={{ left: (w - PAGE_W) / 2 + MARGIN, top: pageTop + 14 + MARGIN, width: PAGE_W - 2 * MARGIN, height: 40, fontFamily: "'Times New Roman', serif", fontSize: 12 * PX, lineHeight: 1.25, whiteSpace: 'pre-wrap', pointerEvents: 'none', opacity: 0 }}
          onInput={(e) => onInput(e.currentTarget)}
          onSelect={(e) => syncSel(e.currentTarget)}
          onFocus={() => setFocus(docId)}
          onBlur={() => {
            const f = focusAt(now())
            if (f && f.field === docId) emit('ui.focus', { id: 'kbd', field: null })
          }}
          onKeyDown={(e) => {
            e.stopPropagation()
            const mod = e.ctrlKey || e.metaKey
            if (mod && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
              e.preventDefault()
              toggle(e.key.toLowerCase())
            } else if (mod && e.key.toLowerCase() === 's') {
              e.preventDefault()
              save()
            } else if (e.key === 'Tab') {
              e.preventDefault()
              insertText('\t')
            }
          }}
          onKeyUp={(e) => {
            e.stopPropagation()
            syncSel(e.currentTarget)
          }}
        />
      )}
      <StatusBar
        y={h - sbH}
        w={w}
        left={
          <>
            <span>Page 1</span>
            <span style={{ marginLeft: 10 }}>Sec 1</span>
            <span style={{ marginLeft: 10 }}>1/1</span>
            <span style={{ marginLeft: 18 }}>Ln {lineCol[0]}</span>
            <span style={{ marginLeft: 10 }}>Col {lineCol[1]}</span>
          </>
        }
        right={<span>{dirty ? 'Modified' : saveE ? `${name} saved` : ''}  {words} words</span>}
      />
    </div>
  )
}

const Ruler = memo(function Ruler({ y, w }) {
  const x0 = (w - PAGE_W) / 2
  return (
    <div style={{ position: 'absolute', left: 0, top: y, width: w, height: 20, background: 'linear-gradient(180deg, #eef3fa, #dbe5f2)', boxShadow: 'inset 0 -1px 0 #b9c9e0' }}>
      <div style={{ position: 'absolute', left: x0 + MARGIN, top: 4, width: PAGE_W - 2 * MARGIN, height: 12, background: '#fff', boxShadow: 'inset 0 0 0 1px #c5d3e8' }} />
      {Array.from({ length: Math.floor((PAGE_W - 2 * MARGIN) / 12) + 1 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: x0 + MARGIN + i * 12, top: i % 6 === 0 ? 6 : 9, width: 1, height: i % 6 === 0 ? 8 : 3, background: '#7f93b3' }} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <div key={'n' + i} style={{ position: 'absolute', left: x0 + MARGIN + (i + 1) * 72 - 3, top: 4, fontFamily: FONT, fontSize: 8, color: '#5b6886' }}>
          {i + 1}
        </div>
      ))}
    </div>
  )
})

function lastSave(t, win) {
  const [a, i] = find(t, 'word.save', win.id)
  return i >= 0 && a[i].t >= win.openedAt ? a[i] : null
}
function wordCount(doc) {
  const words = (doc.text.match(/\S+/g) || []).length
  const chars = doc.text.replace(/\n/g, '').length
  const paras = doc.text.split('\n').filter((p) => p.trim()).length
  messageBox({ title: 'Word Count', icon: 'info', heading: 'word count', text: `Pages: 1\nWords: ${words}\nCharacters (with spaces): ${chars}\nParagraphs: ${paras}` })
}
const noPrinter = () => messageBox({ title: 'Print', icon: 'warning', text: 'Windows cannot print because no printer is installed.\nTo add a printer, open Printers and Faxes in Control Panel.' })


export default {
  id: 'word',
  title: (p) => `${docName(p)} - Microsoft Word`,
  taskbarLabel: (p) => `${docName(p)} - Microsoft Word`,
  icon: null,
  size: { w: 720, h: 560 },
  position: { x: 70, y: 30 },
  minSize: { w: 600, h: 360 },
  explorer: false,
  background: '#9fb1cc',
  Content: scoped(Word),
}
