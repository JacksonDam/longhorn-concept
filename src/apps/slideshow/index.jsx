// The full-screen blue "10-foot" view of my Pictures & Videos (ref2 f00760): a huge faded
// "pictures & videos" watermark, a left "find pictures" list (albums, presets, folders, sort by
// date / name / type), a glass panel with a 3 x 3 page of captioned photos, and a single-photo
// view with a cross-fading slide show (props.auto: advance every 4 s). Drawn in the overlay above
// the sidebar and taskbar while its window is open; Esc closes it, arrows step.
//   win.open { id: 'slideshow', app: 'slideshow', props: { photo?, auto?, album? (photo ids) } }
import { memo, useEffect } from 'react'
import { emit } from '../../core/events.js'
import { FPS, now } from '../../core/clock.js'
import { clamp } from '../../core/anim.js'
import { scoped, wid, valueOf, hoverKeys, pt, Overlay, find, FONT, HEAVY } from '../../ui/index.js'
import { GROUPS, PHOTOS, TAGS, photoById, MONTHS } from '../lib/pictures.jsx'
import { library } from '../pictures/state.js'
import { closeWin } from '../lib/common.js'

const SLIDE = 4 // s per photo in a slide show
const FADE = 0.6

const NAV = [
  ['albums', 'albums'],
  ['presets', 'presets'],
  ['folders', 'folders'],
  ['date', 'sort by date'],
  ['name', 'sort by name'],
  ['type', 'sort by type'],
]

// the pages of the grid for a sort mode: [{ title: [bold, light], tiles: [{ key, url, caption, open }] }]
function pages(mode, t) {
  const chunk = (title, tiles) => {
    const out = []
    for (let i = 0; i < tiles.length; i += 9) out.push({ title, tiles: tiles.slice(i, i + 9) })
    return out.length ? out : [{ title, tiles: [] }]
  }
  const ph = (p) => ({ key: p.id, url: p.url, caption: p.name, photo: p.id })
  if (mode === 'date') {
    const gs = [...GROUPS].sort((a, b) => b.y - a.y || b.m - a.m || b.d - a.d)
    return gs.flatMap((g) => chunk([g.caption, `${MONTHS[g.m - 1]}, ${g.y}`], g.photos.map(ph)))
  }
  if (mode === 'name') return chunk(['All pictures', 'by name'], [...PHOTOS].sort((a, b) => (a.name < b.name ? -1 : 1)).map(ph))
  if (mode === 'type') return [...chunk(['Pictures', ''], PHOTOS.filter((p) => p.kind === 'picture').map(ph)), ...chunk(['Videos', ''], PHOTOS.filter((p) => p.kind === 'video').map(ph))]
  if (mode === 'folders') return chunk(['Folders', 'my Pictures & Videos'], GROUPS.map((g) => ({ key: 'g:' + g.id, url: g.photos[0].url, caption: g.caption, group: g.id })))
  if (mode === 'presets') return chunk(['Presets', 'keywords'], TAGS.map((tg) => ({ key: 'k:' + tg, url: PHOTOS.find((p) => p.keywords.includes(tg))?.url, caption: tg, tag: tg })))
  const { albums } = library(t)
  return chunk(['Albums', albums.length ? '' : 'none yet: make one with Create an Album'], albums.map((a) => ({ key: a.id, url: photoById(a.photos[0])?.url, caption: a.name, album: a.photos })))
}

const Backdrop = memo(function Backdrop() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #2a62c0 0, #1d4ea8 40%, #2f6dc4 75%, #4f8ad8 100%)' }} />
      <div style={{ position: 'absolute', left: -200, top: -100, width: 900, height: 1100, transform: 'rotate(28deg)', background: 'linear-gradient(90deg, rgba(255,255,255,0) 0, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0) 100%)' }} />
      <div style={{ position: 'absolute', left: -14, top: -40, fontFamily: FONT, fontWeight: 300, fontSize: 150, color: 'rgba(255,255,255,0.1)', whiteSpace: 'nowrap', letterSpacing: -4 }}>pictures &amp; videos</div>
      <div style={{ position: 'absolute', left: 50, top: 40, fontFamily: FONT, fontSize: 28, fontWeight: 300, color: '#9fb4f2', whiteSpace: 'nowrap' }}>
        my <span style={{ color: '#ffffff', fontWeight: 400 }}>Pictures &amp; Videos</span>
      </div>
      <div style={{ position: 'absolute', left: 50, top: 112, fontFamily: FONT, fontSize: 27, fontWeight: 300, color: '#e8f0ff', whiteSpace: 'nowrap' }}>
        find <span style={{ color: '#a9c4f5' }}>pictures</span>
      </div>
      <div style={{ position: 'absolute', left: 296, top: 106, width: 560, height: 590, borderRadius: 10, background: 'linear-gradient(180deg, rgba(150,195,255,0.45) 0, rgba(90,145,225,0.28) 8%, rgba(70,125,210,0.22) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 0 0 1px rgba(170,210,255,0.35)' }} />
    </>
  )
})

const Tile = memo(function Tile({ tile, lit, focus }) {
  return (
    <div style={{ position: 'relative', width: 140, height: 120 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 136, height: 92, background: '#fff', padding: 2, boxShadow: `0 4px 10px rgba(0,20,70,0.45)${lit > 0.5 ? ', 0 0 0 3px rgba(255,255,255,0.7)' : ''}`, transform: lit > 0.5 ? 'scale(1.05)' : undefined, transformOrigin: '50% 60%' }}>
        {tile.url && <img src={tile.url} alt="" draggable={false} style={{ width: 136, height: 92, objectFit: 'cover', display: 'block' }} />}
      </div>
      <div style={{ position: 'absolute', left: 0, top: 104, padding: '0 3px', fontFamily: FONT, fontSize: 15, color: '#eaf2ff', whiteSpace: 'nowrap', outline: focus ? '1.5px solid #e2433a' : 'none' }}>{tile.caption}</div>
    </div>
  )
})

function Grid({ win, t, mode, page }) {
  const ps = pages(mode, t)
  const pg = ps[Math.min(page, ps.length - 1)]
  const lit = hoverKeys(t, wid(win, 'tiles'))
  const sel = valueOf(t, wid(win, 'tilesel'), null)
  const setV = (n, v) => emit('ui.value', { id: wid(win, n), value: v })
  const open = (tile) => {
    if (tile.photo) {
      setV('view', { mode: 'photo', photo: tile.photo, auto: false, at: now() })
    } else if (tile.group) {
      const gi = pages('date', t).findIndex((p) => p.tiles.some((x) => photoById(x.key)?.group === tile.group))
      setV('nav', 'date')
      setV('page', Math.max(0, gi))
    } else if (tile.tag || tile.album) {
      const list = tile.album || PHOTOS.filter((p) => p.keywords.includes(tile.tag)).map((p) => p.id)
      setV('view', { mode: 'photo', photo: list[0], list, auto: true, at: now() })
    }
  }
  return (
    <>
      <div style={{ position: 'absolute', left: 318, top: 124, fontFamily: HEAVY, fontSize: 18, color: '#fff', whiteSpace: 'nowrap' }}>
        {pg.title[0]} <span style={{ fontFamily: FONT, color: '#d8e6ff' }}>{pg.title[1]}</span>
      </div>
      {ps.length > 1 && (
        <div style={{ position: 'absolute', left: 740, top: 124, display: 'flex', gap: 10, fontFamily: FONT, fontSize: 14, color: '#cfe0ff', alignItems: 'center' }}>
          <span onPointerDown={() => setV('page', (page - 1 + ps.length) % ps.length)}>{'◂'}</span>
          <span>
            {Math.min(page, ps.length - 1) + 1} / {ps.length}
          </span>
          <span onPointerDown={() => setV('page', (page + 1) % ps.length)}>{'▸'}</span>
        </div>
      )}
      {pg.tiles.map((tile, i) => (
        <div
          key={tile.key}
          style={{ position: 'absolute', left: 318 + (i % 3) * 182, top: 166 + Math.floor(i / 3) * 176 }}
          onPointerEnter={(e) => emit('hover', { id: wid(win, 'tiles'), key: tile.key, on: true, ...pt(e) })}
          onPointerLeave={() => emit('hover', { id: wid(win, 'tiles'), key: tile.key, on: false })}
          onPointerDown={(e) => e.button === 0 && setV('tilesel', tile.key)}
          onDoubleClick={() => open(tile)}
          onClick={(e) => e.detail === 1 && sel === tile.key && open(tile)}
        >
          <Tile tile={tile} lit={lit.get(tile.key) || 0} focus={sel === tile.key} />
        </div>
      ))}
      {!pg.tiles.length && <div style={{ position: 'absolute', left: 318, top: 170, fontFamily: FONT, fontSize: 15, color: '#d8e6ff' }}>Nothing here yet.</div>}
    </>
  )
}

// single photo with a cross-fade; in a slide show the index advances every SLIDE seconds
function PhotoView({ t, view }) {
  const list = view.list || PHOTOS.map((p) => p.id)
  const i0 = Math.max(0, list.indexOf(view.photo))
  const el = view.auto ? Math.max(0, t - view.at) : 0
  const step = view.auto ? Math.floor(el / SLIDE) : 0
  const idx = (i0 + step) % list.length
  const since = view.auto ? el - step * SLIDE : t - view.at
  const k = clamp(since / FADE)
  const prev = view.auto && step > 0 ? list[(i0 + step - 1) % list.length] : view.prev
  const p = photoById(list[idx])
  const q = prev && k < 1 ? photoById(prev) : null
  return (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 960, height: 720, background: 'rgba(5,15,45,0.55)' }} />
      {q && <Big p={q} op={1} />}
      {p && <Big p={p} op={q ? k : 1} />}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 660, textAlign: 'center', fontFamily: FONT, fontSize: 18, color: '#eaf2ff' }}>
        {p?.name} <span style={{ color: '#a9c4f5' }}>{p ? `${MONTHS[p.date.m - 1]} ${p.date.d}, ${p.date.y}` : ''}</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 690, textAlign: 'center', fontFamily: FONT, fontSize: 12, color: '#9fb4f2' }}>
        {view.auto ? 'slide show' : `${idx + 1} of ${list.length}`} : arrows to step, Esc to return
      </div>
    </>
  )
}
const Big = memo(function Big({ p, op }) {
  return (
    <div style={{ position: 'absolute', left: 120, top: 40, width: 720, height: 540, opacity: op, background: '#fff', padding: 4, boxShadow: '0 10px 30px rgba(0,10,40,0.6)' }}>
      <img src={p.url} alt="" draggable={false} style={{ width: 720, height: 540, objectFit: 'cover', display: 'block' }} />
    </div>
  )
})

function Nav({ win, t, nav }) {
  const lit = hoverKeys(t, wid(win, 'nav:h'))
  return NAV.map(([k, label], i) => {
    const on = nav === k
    const l = lit.get(k) || 0
    return (
      <div
        key={k}
        style={{ position: 'absolute', left: 54, top: 160 + i * 39, width: 200, height: 30 }}
        onPointerEnter={(e) => emit('hover', { id: wid(win, 'nav:h'), key: k, on: true, ...pt(e) })}
        onPointerLeave={() => emit('hover', { id: wid(win, 'nav:h'), key: k, on: false })}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          emit('ui.value', { id: wid(win, 'nav'), value: k })
          emit('ui.value', { id: wid(win, 'page'), value: 0 })
          emit('ui.value', { id: wid(win, 'view'), value: { mode: 'grid', at: now() } })
        }}
      >
        {(on || l > 0) && <div style={{ position: 'absolute', left: 0, top: 2, width: 186, height: 26, borderRadius: 4, opacity: on ? 1 : l * 0.6, background: 'linear-gradient(90deg, rgba(190,225,255,0.65), rgba(150,200,255,0.15))' }} />}
        <div style={{ position: 'absolute', left: 8, top: 0, lineHeight: '30px', fontFamily: HEAVY, fontSize: 19, color: '#ffffff', whiteSpace: 'nowrap' }}>{label}</div>
      </div>
    )
  })
}

function Slideshow({ win, t, live }) {
  const p = win.props || {}
  const v0 = p.photo || p.auto ? { mode: 'photo', photo: p.photo || (p.album ? p.album[0] : PHOTOS[0].id), list: p.album || null, auto: !!p.auto, at: win.openedAt } : { mode: 'grid', at: win.openedAt }
  // a later win.open (e.g. View Slide Show again) restarts from its props
  const [oa, oi] = find(t, 'win.open', win.id)
  const ve = find(t, 'ui.value', wid(win, 'view'))
  const lastOpen = oi >= 0 && oa[oi].t >= win.openedAt ? oa[oi] : null
  const lastView = ve[1] >= 0 ? ve[0][ve[1]] : null
  let view = lastView ? lastView.value : v0
  if (lastOpen && lastOpen.props && (!lastView || lastOpen.t > lastView.t)) {
    const q = lastOpen.props
    view = q.photo || q.auto ? { mode: 'photo', photo: q.photo || (q.album ? q.album[0] : PHOTOS[0].id), list: q.album || null, auto: !!q.auto, at: lastOpen.t } : view
  }
  const nav = valueOf(t, wid(win, 'nav'), 'date')
  const page = valueOf(t, wid(win, 'page'), 0)
  useKeys(win, live && win.state === 'open', view)
  if (!live || win.state !== 'open') return null
  const since = win.lastAction === 'restore' ? win.changedAt : win.openedAt
  const op = clamp(((t - since) * FPS) / 10)
  return (
    <Overlay>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 960, height: 720, opacity: op, pointerEvents: 'auto', overflow: 'hidden' }} onContextMenu={(e) => e.preventDefault()}>
        <Backdrop />
        <Nav win={win} t={t} nav={nav} />
        <Grid win={win} t={t} mode={nav} page={page} />
        {view.mode === 'photo' && (
          <div style={{ position: 'absolute', inset: 0 }} onPointerDown={(e) => e.button === 0 && emit('ui.value', { id: wid(win, 'view'), value: { mode: 'grid', at: now() } })}>
            <PhotoView t={t} view={view} />
          </div>
        )}
        <div
          style={{ position: 'absolute', right: 18, top: 14, padding: '4px 12px', borderRadius: 12, fontFamily: HEAVY, fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.15)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.35)' }}
          onPointerDown={(e) => {
            e.stopPropagation()
            closeWin(win.id)
          }}
        >
          close {'✕'}
        </div>
      </div>
    </Overlay>
  )
}

function useKeys(win, on, view) {
  useEffect(() => {
    if (!on) return
    const h = (e) => {
      const t = now()
      const v = valueOf(t, wid(win, 'view'), null) || view
      if (e.key === 'Escape') {
        if (v.mode === 'photo') emit('ui.value', { id: wid(win, 'view'), value: { mode: 'grid', at: t } })
        else closeWin(win.id)
      } else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && v.mode === 'photo') {
        const list = v.list || PHOTOS.map((p) => p.id)
        const el = v.auto ? Math.max(0, t - v.at) : 0
        const cur = (list.indexOf(v.photo) + (v.auto ? Math.floor(el / SLIDE) : 0)) % list.length
        const n = list[(cur + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length]
        emit('ui.value', { id: wid(win, 'view'), value: { mode: 'photo', photo: n, list: v.list, auto: false, at: t, prev: list[cur] } })
      }
    }
    addEventListener('keydown', h)
    return () => removeEventListener('keydown', h)
  }, [on, win, view])
}

export default {
  id: 'slideshow',
  title: () => 'Slide Show',
  taskbarLabel: () => 'Slide Show',
  icon: null,
  chrome: 'none',
  frameRim: false,
  size: { w: 120, h: 40 },
  position: { x: -400, y: -200 },
  Content: scoped(Slideshow),
}
