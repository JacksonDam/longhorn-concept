# Builder brief: desktop scene (frames ~510 to 1529, everything except the my Music window)

Own: `src/scenes/desktop/**`, `src/demo/desktop.js`, `docs/desktop-spec.md`, `public/img/desktop/**`.
Entry: `DesktopScene({ since })` in `src/scenes/desktop/DesktopScene.jsx`, mounted by App.jsx
at the 'login.submit' event time (`since`) beneath the login layer (which fades out on its
own, owned by the login builder). It must render, bottom to top: wallpaper,
`<MusicWindow />` (from src/scenes/music/MusicWindow.jsx, owned by the music builder; don't
edit it), sidebar, taskbar, the my Music flyout. Read the interface comment at the top of
MusicWindow.jsx: the taskbar uses `musicWindowState(t)`.

What the video shows (verify and refine every point):
- Wallpaper: Stonehenge under an orange sky (see assets-src SOURCES.md for the best source;
  fit its scale/offset to the reference so the stones line up).
- Sidebar on the right (~x 853-960, above the taskbar): translucent blue-grey glass panel. Tiles
  top to bottom: user header "Sondra" with picture; "Seattle" weather tile with a skyline;
  "Mail" list (Last time we m..., Hotmail Service (highlighted), Hello, Information for,
  You Gotta chec..., Yesterday, Funny Thing, Hi Jeff, Just in Time) with envelope icons; a
  media strip (scrolling title text + round buttons); "Buddies" list (Hank, Harold,
  Summer Dude, Anthony, Kathy, RogerCC, ..., Justin) with small avatars; a photo tile; "Go
  Online"; two small thumbnail tiles at the bottom. Read every label from enlarged crops.
- Taskbar (~20 px, bottom): start button (flag + "start"), task buttons "Inbox - Microsoft O...",
  "Yahoo.com", "Document 1...", "Winamp3" (and "My Music" once the window exists, inserted
  where the video shows it), clock "11:31 am" and a round chevron at the far right.
- Entrance after login (from `since`, frames ~516-581): the sidebar panel slides/fades in and
  its content fills in top to bottom; the taskbar builds up (around 545-569 it shows only a
  flag and a small icon and "7:09 PM", by 581 "start" and "11:31 am"). Measure element-wise.
  Interactive mode: real current time in the taskbar's format after the entrance.
- The my Music flyout (around frames 600-606): opens next to the sidebar's media strip when
  the cursor hovers/clicks there (find the trigger in the video); title "my Music", a list of
  tracks with durations (Gomez - Bring it on 4:34, U2 - ..., Alicia Keys - Just another 7:31,
  Evergreen - Small sound 5:09, then a second group with one highlighted row with a picture,
  ...), and "Go to my Music" at the bottom. Hover highlights follow the cursor (605-690).
  Clicking "Go to my Music" (~692) emits 'music.open' and the flyout collapses away
  (~694-697, element-wise, motion blurred). Clicking elsewhere closes it.
- Taskbar "My Music" button: clicking it emits 'music.restore' when minimised (frame ~1403
  in the video), 'music.minimize' otherwise.
- Hover feedback on sidebar items / taskbar buttons where the video shows any.

Photos of real people (the face photo tile, buddy avatars if they are photos) must be
replaced by original stand-ins or Windows account pictures; list them in docs/SUBSTITUTIONS.md.
