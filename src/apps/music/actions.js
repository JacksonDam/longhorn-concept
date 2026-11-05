// What the my Music window's buttons, links and menus do (click handlers, evaluated at click time).
import { emit } from '../../core/events.js'
import { now, FPS } from '../../core/clock.js'
import { setValue, valueAt, wid, focusField } from '../../ui/index.js'
import { OPEN_DELAY } from '../../os/windowAnim.js'
import { albumOf } from './library.js'
import { DEFAULTS, albumList, settings } from './layout.js'
import { viewState } from './state.js'

export const openT = (win) => win.openedAt + OPEN_DELAY / FPS
const openWin = (id, app = id, props) => emit('win.open', props ? { id, app, props } : { id, app })
export const ie = (url) => () => openWin('ie', 'ie', { url })
const playlistOf = (albums) => albums.flatMap((a) => a.tracks.map((tr) => ({ title: `${a.artist} - ${tr.title}`, duration: tr.duration })))

const cache = new Map()
export function musicActions(win) {
  const k = win.id + '@' + win.openedAt
  let a = cache.get(k)
  if (!a) {
    const set = (name, v) => setValue(wid(win, 'mv.' + name), v)
    const get = (name) => valueAt(wid(win, 'mv.' + name), DEFAULTS[name])
    const toggle = (name) => () => set(name, !get(name))
    const search = () => valueAt(wid(win, 'search'), { text: '' }).text
    const visible = () => albumList(settings(now(), win), search())
    a = {
      selected: () => {
        const v = viewState(now(), openT(win))
        return v.sel ? albumOf(v.sel.key) : null
      },
      playAll: () => emit('media.play', { playlist: playlistOf(visible()), track: 0 }),
      playSelected: () => {
        const al = a.selected()
        if (al) emit('media.play', { playlist: playlistOf([al]), track: 0 })
        else a.playAll()
      },
      play: () => a.playSelected(),
      createPlaylist: () => openWin('playlist'),
      burn: () => openWin('burncd'),
      share: () => openWin('sharemusic'),
      shop: ie('music.msn.com/shop'),
      reviews: ie('music.msn.com/reviews'),
      radio: ie('radio.msn.com'),
      documents: () => openWin('documents'),
      pictures: () => openWin('pictures'),
      computer: () => openWin('computer'),
      preview: toggle('preview'),
      tasks: () => {
        if (get('folders')) set('folders', false)
        else set('tasks', !get('tasks'))
      },
      folders: toggle('folders'),
      find: () => {
        focusField(wid(win, 'search'))
        emit('ui.focus', { id: 'kbd', field: wid(win, 'search') })
      },
      up: () => openWin('documents'),
      setSize: (v) => set('size', v),
      setView: (v) => () => set('view', v),
      setGroup: (v) => () => set('group', v),
      setArrange: (v) => () => set('arrange', v),
      selectAll: () => emit('music.album', { id: null }),
      back: () => emit('music.home', { id: win.id }),
      properties: () => {
        const al = a.selected()
        if (al)
          openWin('albumprops', 'dialog', {
            title: `${al.title} Properties`,
            text: `${al.artist} - ${al.title}\n${al.tracks.length} tracks, ${al.year}, ${al.genre}`,
            icon: 'info',
            buttons: [{ label: 'OK', emit: { type: 'win.close', id: 'albumprops' } }],
          })
      },
      section: (name) => () => set('sec.' + name, !valueAt(wid(win, 'mv.sec.' + name), name === 'other')),
    }
    cache.set(k, a)
  }
  return a
}

