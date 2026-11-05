// Search Results with the Search Companion: pick what to look for, type part of a name (and a
// word in the file), Search lists matches from the fictional file system; double-click opens.
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { scoped, wid, valueOf, TextField, textOf, Button, ListView, hoverKeys, pt, C, FONT, HEAVY } from '../../ui/index.js'
import { Ico } from '../lib/icons.jsx'
import { iconOf } from '../lib/Explorer.jsx'
import { allFiles, openFile, openMusic, kb, typeName } from '../lib/fs.js'
import { docFor } from '../word/docs.js'
import { openWin, messageBox } from '../lib/common.js'
import { AppTop, appTopHeight } from '../lib/chrome.jsx'

const KINDS = [
  ['media', 'Pictures, music, or video', 'picture', (n) => ['picture', 'video', 'music'].includes(n.kind)],
  ['docs', 'Documents (word processing, spreadsheet, etc.)', 'doc', (n) => n.kind === 'doc' || n.kind === 'text'],
  ['all', 'All files and folders', 'folder', () => true],
  ['people', 'Computers or people', 'users', null],
  ['help', 'Information in Help and Support Center', 'help', null],
]

const Pane = memo(function Pane({ children }) {
  return <div style={{ position: 'absolute', left: 0, top: 0, width: 210, bottom: 0, background: 'linear-gradient(180deg, #e6eefb, #d3e0f3)', boxShadow: `inset -1px 0 0 ${C.border}` }}>{children}</div>
})

function Search({ win, t, w, h, active }) {
  const id = (n) => wid(win, n)
  const kind = valueOf(t, id('kind'), null)
  const run = valueOf(t, id('run'), null) // { name, word, kind } of the last search
  const lit = hoverKeys(t, id('k'))
  const top = appTopHeight({ toolbar: false })
  const results = run
    ? allFiles().filter(({ node }) => {
        const k = KINDS.find((x) => x[0] === run.kind)
        if (!k?.[3]?.(node)) return false
        if (run.name && !node.name.toLowerCase().includes(run.name)) return false
        if (run.word) {
          if (node.kind !== 'doc' && node.kind !== 'text') return false
          if (!docFor(node.name).text.toLowerCase().includes(run.word)) return false
        }
        return true
      })
    : []
  const search = () => emit('ui.value', { id: id('run'), value: { kind, name: textOf(now(), id('name')).trim().toLowerCase(), word: textOf(now(), id('word')).trim().toLowerCase() } })
  const open = (it) => {
    const { node, path } = it.hit
    if (node.app === 'music') return openMusic()
    if (node.app === 'pictures') return openWin('pictures', 'pictures')
    if (node.children && !node.removable) return openWin('computer', 'computer', { go: node.link || [...path, node.name] })
    openFile(node, path)
  }
  const menus = [
    { key: 'file', label: 'File', items: [{ label: 'New Search', onClick: () => (emit('ui.value', { id: id('kind'), value: null }), emit('ui.value', { id: id('run'), value: null })) }, '-', { label: 'Close', onClick: () => emit('win.close', { id: win.id }) }] },
    { key: 'help', label: 'Help', items: [{ label: 'Help and Support Center', onClick: () => openWin('help', 'help') }] },
  ]
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fff' }}>
      <AppTop id={id('m')} w={w} menus={menus} />
      <div style={{ position: 'absolute', left: 0, top, width: w, height: h - top }}>
        <Pane>
          <div style={{ position: 'absolute', left: 12, top: 12, fontFamily: FONT, fontSize: 16, fontWeight: 300, color: C.headingLight, whiteSpace: 'nowrap' }}>
            search <span style={{ fontWeight: 500, color: C.heading }}>companion</span>
          </div>
          {!kind ? (
            <>
              <div style={{ position: 'absolute', left: 12, top: 44, width: 186, fontFamily: HEAVY, fontSize: 11.5, color: '#3a4260' }}>What do you want to search for?</div>
              {KINDS.map(([k, label, icon, fn], i) => (
                <div
                  key={k}
                  style={{ position: 'absolute', left: 10, top: 72 + i * 38, width: 192, minHeight: 32, display: 'flex', gap: 8, alignItems: 'flex-start', borderRadius: 4, background: (lit.get(k) || 0) > 0.5 ? C.rowHover : 'transparent', padding: '3px 4px', boxSizing: 'border-box' }}
                  onPointerEnter={(e) => emit('hover', { id: id('k'), key: k, on: true, ...pt(e) })}
                  onPointerLeave={() => emit('hover', { id: id('k'), key: k, on: false })}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return
                    if (k === 'help') openWin('help', 'help')
                    else if (k === 'people') messageBox({ title: 'Search', icon: 'warning', text: 'Windows cannot search for computers or people because this computer is not connected to a network.' })
                    else emit('ui.value', { id: id('kind'), value: k })
                  }}
                >
                  <Ico kind={icon} size={20} />
                  <span style={{ fontFamily: FONT, fontSize: 11, lineHeight: '14px', color: '#2c6cc4' }}>{label}</span>
                  {void fn}
                </div>
              ))}
            </>
          ) : (
            <>
              <div style={{ position: 'absolute', left: 12, top: 44, width: 186, fontFamily: FONT, fontSize: 11, color: '#3a4260' }}>All or part of the file name:</div>
              <TextField id={id('name')} x={12} y={62} w={186} h={20} onEnter={search} />
              <div style={{ position: 'absolute', left: 12, top: 92, width: 186, fontFamily: FONT, fontSize: 11, color: '#3a4260' }}>A word or phrase in the file:</div>
              <TextField id={id('word')} x={12} y={110} w={186} h={20} onEnter={search} />
              <div style={{ position: 'absolute', left: 12, top: 140, fontFamily: FONT, fontSize: 11, color: '#3a4260' }}>Look in:</div>
              <div style={{ position: 'absolute', left: 12, top: 158, width: 186, height: 20, borderRadius: 3, background: '#fff', boxShadow: `inset 0 0 0 1px ${C.border}`, display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4, boxSizing: 'border-box', fontFamily: FONT, fontSize: 11, color: C.text }}>
                <Ico kind="drive" size={14} />
                Local Hard Drives (C:)
              </div>
              <Button id={id('back')} label="Back" x={12} y={194} w={80} h={23} onClick={() => emit('ui.value', { id: id('kind'), value: null })} />
              <Button id={id('go')} label="Search" isDefault x={100} y={194} w={98} h={23} onClick={search} />
            </>
          )}
        </Pane>
        {run ? (
          <ListView
            id={id('results')}
            x={214}
            y={4}
            w={w - 218}
            h={h - top - 8}
            active={active}
            columns={[{ label: 'Name', w: 170 }, { label: 'In Folder', w: 150 }, { label: 'Size', w: 60, align: 'right' }, { label: 'Type', w: Math.max(80, w - 218 - 380 - 17) }]}
            items={results.map((r) => ({ key: [...r.path, r.node.name].join('/'), hit: r, cells: [r.node.name, r.path.slice(1).join('\\') || 'my Computer', r.node.size != null ? kb(r.node.size) : '', typeName(r.node)], icon: <Ico kind={iconOf(r.node)} size={16} /> }))}
            onOpen={open}
            emptyText="Search is complete. There are no results to display."
          />
        ) : (
          <div style={{ position: 'absolute', left: 240, top: 30, right: 20, fontFamily: FONT, fontSize: 11.5, lineHeight: '17px', color: C.textDim }}>To start your search, follow the instructions in the left pane.</div>
        )}
      </div>
    </div>
  )
}

export default {
  id: 'search',
  title: () => 'Search Results',
  taskbarLabel: () => 'Search Results',
  icon: null,
  size: { w: 700, h: 470 },
  position: { x: 110, y: 90 },
  minSize: { w: 560, h: 320 },
  explorer: false,
  background: '#ffffff',
  Content: scoped(Search, { watch: ['fs'] }),
}
