# Overnight brief: from demo to a usable Longhorn Plex "OS"

The video's sequence stays exactly as it is (`?demo` / `?capture` must still replay it with the
same RMSE). On top of it, the app becomes a small, fully usable operating system: **nothing
visible may be dead**. Every button, link, menu, list item, icon and tile does something sensible,
in the Plex style the video establishes (blue glass chrome, Franklin Gothic, rounded windows,
multi-sample motion blur on window moves). Read docs/ARCHITECTURE.md and docs/briefs/perf.md
first: every new feature must also run at 144 Hz with real-time/capture parity.

## Content rules for new things
- Visual design: extrapolate from the video's own chrome (the my Music window, sidebar, flyout,
  taskbar, login). New windows get the same frame, title bar and animations.
- Content the video doesn't show (emails, documents, weather, chats, album details) is
  **fictional and neutral**, set around late 2003, and kept short. Text the video does show is
  kept verbatim (mail subjects, buddy names, track names, album "Tweet - Southern Hummingbird").
- Real websites appear only as they were: the sites the OS links to (MSN, Hotmail, Yahoo!,
  Microsoft, Ofoto, WindowsMedia.com, Google) load their 2003 home pages, archived copies from
  the Wayback Machine made static (see "Web pages" below); every other address shows IE6's
  "The page cannot be displayed", as a site that doesn't answer.
- No invented audio: media playback is silent (progress, time and visualiser move; no sound).
- No third-party copyrighted media: keep using original stand-in art (docs/SUBSTITUTIONS.md).
- Microsoft product names/brands as the video shows them are fine (Outlook, Word, IE, MSN).

## Window chrome rules (every window and dialog)
- **Corners.** Only the window's own outline is rounded: the title bar's top corners and the
  window's bottom corners (os/frame.js, fitted on the video: top 11.5 px for the body, 13.5 for
  the rim's outer edge, bottom 14.5; the client area is clipped to them). Along the top chrome
  the rim's 2 px left edge lies outside the glass, as on the right. Every bar
  inside it (glass toolbar, menu band, command row, address / task band, status bar) and every
  panel that reaches an edge runs square and flush to the window's edges, even where the video's
  band shows a slight rounding (the user's rule wins). Controls keep their rounding (buttons,
  the address / search pill, tabs, tiles, menus, cards inset from the edges). Use
  `src/apps/lib/chrome.jsx` (AppTop, GlassRow, Band, StatusBar) for an app's top bars.
- **Rim.** The rim's light top edge turns into its dark sides gradually along the corner arcs
  (one stroke with a vertical gradient, PlexWindow `Rim`), not in a CSS border's hard diagonal
  join (the user's ask; the video's corners agree: corner RMSE 7.64 -> 7.29 left, 8.52 -> 8.30
  right, frames 760-1340 every 10th). Below the top chrome the sides carry on down the body,
  fainter and on the body's edge, and fade out round the bottom corners, as the video's window
  shows (without them a dialog's frame looked cut off under its title bar).
- **Title.** Title text (the plain title and an app's TitleContent) is vertically centred on the
  minimise / maximise / close glyphs by its cap height: baseline = os/frame.js
  `titleBaseline(size, capHeight)` (glyphs centred at y 11.75).
- **Maximised.** A maximised window's body fills the work area exactly: from the top of the
  screen to the taskbar's top row (699) and across to the sidebar's edge (858) (os/frame.js
  `WORK`; its layer starts 3 px above the screen, `MAX_RECT`, so the rim's top edge is off-screen,
  and it has no rim). The maximise and the restore down zoom the window: laid out once at the
  rect they go to (square and rimless, or rounded with its rim), scaled from the rect they leave.
- **Drop-down arrows** follow their label's measured width (ui/measure.js `textWidth`, a canvas
  measure equal to the SVG / HTML text) with a 6 px gap: the explorer breadcrumbs, my Music's
  Group / Arrange / View bar; flex rows in the ui kit already flow. Combo fields keep their arrow
  at the right edge and clip the text before it.
- **Narrow explorer windows** show only the toolbar links whose label ends 14 px inside the
  window (ExplorerChrome `toolsFor`; Favorites from 760 px), so nothing in the header runs past
  the window at an app's minimum width.
- **Shadow.** Every window casts the video's soft drop shadow (os/shadow.jsx, fitted on the my
  Music window: black, offset 9 px down, sigma 8, spread -1, alpha 0.33; nothing above the
  window; the second video, ref2 f01490, shows the same kind of shadow). It is one layer per
  window that follows it (during motion blur: the pose at the middle of the shutter; the blur
  copies carry none, so their layers stay the window's size); nothing is blurred per frame. Maximised windows have square corners and no
  shadow (they tile the work area; the shadow fades with the maximise). Apps with `chrome: 'none'` or
  `shadow: false` have none.
- **Active / inactive.** The focused window keeps the video's look. Other windows are calmer:
  a pale cool wash over the title bar and the top chrome (lighter, less saturated, toolbar labels
  lower in contrast), the title row dimmed towards the bar (a dimmer title and window buttons) and
  a shadow at half strength; content is unchanged (os/look.jsx). Neither video shows an inactive
  look (the back window in ref2 keeps its colours), so it follows the Plex theme's Luna lineage
  (XP's lighter, desaturated inactive caption), kept subtle. The look cross-fades over 4 frames
  (os/focus.js), compositor-only. A closing or minimising window keeps its look until it has gone,
  the window an open takes the focus from keeps it for two frames, a window that turns active by
  its own open or restore starts active. An app whose top chrome reaches below the title bar
  declares `chromeTop` (lib/chrome.jsx `chromeTop(opts)` for AppTop) so the wash covers it.

## Components and ownership
Each owner works in their own worktree/branch, merges `main` regularly (at least every hour and
whenever I say main moved), commits small, and touches other owners' files only through the
interfaces below (or by asking me).

### Window system (owner: window builder, branch `music`)
- `src/os/wm.js` (exists; extend carefully, it's shared): window state from events.
- `src/os/apps.js`: app registry. Each app lives in `src/apps/<name>/` and default-exports
  `{ id, title(props), taskbarLabel(props), icon (url), size: {w, h}, position: {x, y},
  explorer: bool, Content }`, where `Content({ win, t, active })` renders the client area.
- `src/os/PlexWindow.jsx`: the generic Plex window, generalised from the my Music window: frame,
  title bar (title, min/max/close), drag to move, focus/z-order, maximise, the open swing-in,
  minimise into / restore from that window's own taskbar button, close, motion blur, beam.
  `src/os/ExplorerChrome.jsx`: the my Music window's toolbar block (back/forward, Home, Search,
  link buttons, menu row, breadcrumb, command row) as a reusable part for explorer-type apps.
- `src/os/WindowLayer.jsx`: renders all wm windows; DesktopScene renders it where it renders
  `<MusicWindow />` today (you own that one line in DesktopScene).
- my Music becomes `src/apps/music/` on top of PlexWindow + ExplorerChrome, with the video's
  animations unchanged, and becomes fully usable: toolbar buttons, menus (File/Edit/View/Help),
  breadcrumb drop-downs, search box (filters albums), Hide Music Tasks, Up a Folder, Folders,
  Find, Preview, task-pane links, Play Music / Burn CD / Share Music, Group/Arrange/View by
  drop-downs, the Size slider (thumbnail size), scrolling (more fictional stand-in albums below the
  first four rows), album pages for every album (fictional names/tracks for the stand-ins), track
  clicks play (via `src/os/media.js`).
- Legacy events `music.*` keep working (wm.js aliases them to id 'music').

### Shell (owner: desktop builder, branch `desktop`)
- Taskbar driven by `wm.windows(t)`: one button per window (the four running-at-login ones in the
  video's order, new windows inserted with the video's insertion animation), click = restore /
  minimise / focus (XP rules). Start button + a Plex-style Start menu (user picture and name at
  the top; my Documents, my Pictures, my Music, my Computer, Internet, E-mail, Word, Winamp,
  Control Panel, Help and Support, Search, Run...; Log Off and Shut Down at the bottom). Every
  item works (opens the corresponding app or dialog via 'win.open'). The clock and chevron work
  (e.g. date tooltip / a small calendar flyout; chevron toggles the sidebar).
- Sidebar: every tile works. User header: a menu (my Documents, Log Off, Switch User, Shut Down).
  Seattle: a weather flyout (fictional 2003 forecast). Mail items: open the Outlook window on that
  message (`win.open` id 'inbox' with props `{ message }`). Media strip: play/pause/previous/next
  driving `src/os/media.js` (shared silent player state: playlist, current track, position, playing)
  and the scrolling title; the my Music flyout keeps its video behaviour. Buddies: open an instant
  message window per buddy (`win.open` id `im:<name>` app 'im'). Photo tile and thumbnails: open
  their apps (my Pictures, etc.). Go Online: Internet Explorer.
- Desktop: right-click context menu (Arrange Icons By, Refresh, Properties -> a Display
  Properties window that can switch the wallpaper between the Stonehenge photo and plain colours).
- Owns `src/os/media.js` (silent media player state from events: 'media.play' {track}, 'media.pause',
  'media.next', 'media.prev', 'media.seek') and `src/os/session.js` helpers shared with the login
  builder (current user name/picture: `currentUser(t)`).

### Session (owner: login builder, branch `login`)
- App.jsx scene flow: login -> desktop (exists), Log Off / Switch User -> back to the login screen
  with a fitting element-wise transition (reverse of the login exit), Shut Down from the login
  screen's button or the Start menu / sidebar -> a Plex-style "shutting down" sequence -> a dark
  "off" screen with a power button -> boot back to the login screen.
- Every user can log in (any password); the desktop shows the logged-in user's name and picture
  (sidebar header, Start menu) via `src/os/session.js`. Events: 'session.logoff',
  'session.switch', 'session.shutdown', 'session.boot'.

### Apps and UI kit (owner: apps builder, branch `apps`)
- `src/ui/`: Plex-style reusable controls used by everyone: drop-down Menu / MenuBar, context menu,
  Dialog (message box with icon and buttons), Button, TextField, Checkbox/Radio, Slider,
  ListView/table rows with selection, Tabs, Scrollbar/ScrollView, Tooltip. Deliver a first version
  early (within the first hour) and commit it, so the other builders can merge and use it.
- Apps in `src/apps/<name>/` (registry format above; chrome comes from PlexWindow):
  `outlook` (Inbox - Microsoft Outlook: folders, message list containing the sidebar's mail
  subjects, reading pane, New / Reply / Forward compose window that "sends" into Sent Items),
  `ie` (Internet Explorer: address bar, back/forward/refresh/home, Favorites; the linked sites'
  2003 home pages, any other address IE6's "The page cannot be displayed"), `word` (Document 1: an editable page with a
  formatting toolbar that works on the selection, File > Save marks it saved), `winamp` (Winamp3:
  a Plex-styled player window titled Winamp3 bound to os/media.js; don't copy Winamp's own skin),
  `im` (instant message window: history, input box, Send; sent messages appear; buddies don't
  reply, an "is away" status line instead), `pictures`, `documents`, `computer` (explorer windows
  via ExplorerChrome with fictional files, folders and drives; double-click opens the matching
  app), `control` (Control Panel with a few working applets: Display -> wallpaper,
  Date and Time), `help`, `search`, `run`, and the dialogs (Burn CD "insert a blank CD", Create
  Playlist, Share Music, About Windows).
- Until PlexWindow lands, build each app's Content as a plain component and preview it in a
  temporary harness; switch to the registry once the window builder's first PlexWindow is on main.

## Web pages (Internet Explorer)
IE shows the 2003 home pages of the sites the OS links to: static copies of Wayback Machine
snapshots in `public/web/<site>/` (index.html + `a/` assets), listed in `src/apps/ie/web.js`
(`PAGES`: title, the address IE shows once loaded, the addresses that reach the page). A page sits
in a same-origin iframe sandboxed without scripts (`src/apps/ie/WebPage.jsx`); its scrolling,
link hovers, clicks and form submits go through the event log like any other input (a link
navigates IE: an archived page or "The page cannot be displayed"; a form submits to the offline
page). IE6's progress: "Finding site" 0.3 s, "Opening page <address>..." with the progress bar,
the page showing from 0.55 s, "Done" at 1 s. Motion-blur copies draw the page area blank.
To add a page:
1. Find the snapshot nearest 27 Oct 2003 (the PDC): `python3 tools/web/wb.py cdx <host> 2003 2003`
   (status 200, text/html; a site that redirected: the page it went to).
2. Add it to `SITES` in `tools/web/build.py` (timestamp, original URL; `writes` for a script
   that wrote fixed content: its literal output), then `python3 tools/web/build.py <site>`. It
   fetches the raw `id_` files one request at a time (2 s apart, backing off on 429 / 5xx),
   caches every download (`WB_CACHE`, default `out/web/cache`), strips scripts, noscript,
   iframes, objects, event handlers and trackers, copies each image and stylesheet from its own
   nearest capture into `public/web/<site>/a/` (one that didn't archive becomes a transparent
   pixel of the same size), makes links absolute and applies IE6's nowrap-with-width quirk.
   Nothing is added to a page: what scripts wrote is kept only where it was fixed text.
3. Add the page to `PAGES` in `src/apps/ie/web.js` and its sources to assets-src/SOURCES.md
   (section 15; `out/web/sources.json` lists every asset's capture).

