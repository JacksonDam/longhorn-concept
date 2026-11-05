// The command-row, task-pane and header-button icons of the my Music window (re-exported by
// os/icons.jsx). Each icon is an image placed inside the caller's box, at the position, size and
// scale fitted against the video (stage px; boxes: SLOTS in ExplorerChrome, Body.jsx, Header.jsx).
// - Real Windows XP SP3 shell32.dll art (see assets-src/SOURCES.md section 8): up/folder/find are
//   the Explorer toolbar's Up, Folders and Search buttons (24 px art, drawn at 19-21 px);
//   playall/playlist are shell32 icons 292 and 12 at 16 px, the design the video shows.
// - Redrawn from the video where no original was found (hide, preview, playsel, speaker, disc,
//   share): layered-gradient SVGs pre-rendered to WebP at 3-4x, so nothing here costs a filter.
import { asset, preload } from '../core/preload.js'

const SRC = {
  hide: asset('img/music/hide.webp'),
  up: asset('img/music/up.png'),
  folder: asset('img/music/folder.png'),
  find: asset('img/music/find.png'),
  preview: asset('img/music/preview.webp'),
  playall: asset('img/music/playall.png'),
  playsel: asset('img/music/playsel.webp'),
  playlist: asset('img/music/playlist.png'),
  speaker: asset('img/music/speaker.webp'),
  disc: asset('img/music/disc.webp'),
  share: asset('img/music/share.webp'),
}
preload(Object.values(SRC))

// x, y relative to the caller's box; w, h in stage px
const pic = (key, x, y, w, h = w) => (
  <img
    src={SRC[key]}
    width={w}
    height={h}
    style={{ position: 'absolute', left: x, top: y, width: w, height: h }}
    alt=""
    draggable={false}
  />
)

// ---------------------------------------------------------------- command row
export const HideTasksIcon = () => pic('hide', -1, -2.75, 18, 19)
export const UpFolderIcon = () => pic('up', -0.5, -0.25, 18.75)
// (callers pass size={26}, the slot; the video draws the Folders button at 20.75 px inside it)
export const FolderIcon = () => pic('folder', 1, -1, 20.75)
export const FindIcon = () => pic('find', 1, 1.5, 18.75)
export const PreviewIcon = () => pic('preview', -2.43, -1.67, 20.37, 21.34)

// ---------------------------------------------------------------- left pane
export const PlayAllIcon = () => pic('playall', 2, 1.25, 15)
export const PlaySelectedIcon = () => pic('playsel', 0, -2.55, 17.51, 20.6)
export const PlaylistIcon = () => pic('playlist', 0.5, -1.25, 15.5)

// ---------------------------------------------------------------- header buttons
export const SpeakerIcon = () => pic('speaker', -3.52, -4.45, 36.04, 42.4)
export const DiscIcon = () => pic('disc', -9.16, -7.32, 52.32, 50.14)
export const ShareIcon = () => pic('share', -4.5, -5.5, 52, 42)

// the small "preview" drop circle: a light grey ring with a dark grey arrow
export const PreviewCircle = () => (
  <svg width={11} height={11} viewBox="0 0 11 11" style={{ position: 'absolute', overflow: 'visible' }}>
    <circle cx="5.4" cy="4.5" r="5" fill="#ffffff" stroke="#e0e2e5" strokeWidth="1" />
    <path d="M3.1 4.1 L5.3 6.7 L7.5 4.1 Z" fill="#5c6068" />
  </svg>
)
