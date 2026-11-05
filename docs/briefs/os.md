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
- No impersonation of real websites: every web link (msn, yahoo, google, ofoto, "Shop: Music on
  MSN", "Go Online"...) opens the Internet Explorer window showing IE6's offline page "The page
  cannot be displayed" with the requested address in the address bar.
- No invented audio: media playback is silent (progress, time and visualiser move; no sound).
- No third-party copyrighted media: keep using original stand-in art (docs/SUBSTITUTIONS.md).
- Microsoft product names/brands as the video shows them are fine (Outlook, Word, IE, MSN).

## Window chrome rules (every window and dialog)
- **Corners.** Only the window's own outline is rounded: the title bar's top corners and the
  window's bottom corners (PlexWindow `RIM_R` = 8; the client area is clipped to them). Every bar
  inside it (glass toolbar, menu band, command row, address / task band, status bar) and every
  panel that reaches an edge runs square and flush to the window's edges, even where the video's
  band shows a slight rounding (the user's rule wins). Controls keep their rounding (buttons,
  the address / search pill, tabs, tiles, menus, cards inset from the edges). Use
  `src/apps/lib/chrome.jsx` (AppTop, GlassRow, Band, StatusBar) for an app's top bars.
- **Shadow.** Every window casts the video's soft drop shadow (os/shadow.jsx, fitted on the my
  Music window: black, offset 9 px down, sigma 8, spread -1, alpha 0.33; nothing above the
  window; the second video, ref2 f01490, shows the same kind of shadow). Motion-blur copies
  carry it in their layers, the live window on a layer that follows it (os/shadow.jsx,
  PlexWindow); nothing is blurred per frame. Maximised windows have square corners and no
  shadow (they tile the work area; both tween with the maximise). Apps with `chrome: 'none'` or
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
  `ie` (Internet Explorer: address bar, back/forward/refresh/home, Favorites; every page is the
  offline page "The page cannot be displayed"), `word` (Document 1: an editable page with a
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
