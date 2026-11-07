# System sounds

The OS plays the Longhorn / Vista-beta sound scheme the user supplied (assets-src/sounds,
SOURCES.md section 14) for its own events, the way Windows maps them. `src/os/sounds.js` is one
listener on the event log; nothing in the scenes or apps plays a sound itself.

## Event -> sound

| OS event (event log) | When it plays | Sound (`public/sounds/`) |
|---|---|---|
| the page's power button pressed (index.html), boot screen, then the welcome screen | as the welcome screen starts to fade in (the clock's start, t = 0) | SystemStart |
| `session.boot` from the off screen's power button | as the welcome screen starts to fade in (the event + the boot screen, os/session.js `BOOT_SCREEN`) | SystemStart |
| `login.submit` accepted (the login screen goes to the desktop) | at the submit: the login exit and the desktop's entrance start | WindowsLogon |
| `session.logoff` accepted (Start menu or the sidebar's user menu: log off) | at the event: the reverse login transition starts | WindowsLogoff |
| `session.shutdown` accepted (Start menu, sidebar menu or the login screen's Shut Down) | at the event: "Windows is shutting down..." comes in | SystemExit |
| `win.open` of a message box (app `dialog`) with icon `info` | as the box opens | SystemAsterisk |
| ... icon `warning` | as the box opens | SystemExclamation |
| ... icon `error` (e.g. Run with an unknown name) | as the box opens | SystemHand |
| ... icon `cd` (the "Please insert a disc" prompt: not a standard icon, so MB_OK's sound) | as the box opens | Default |
| ... icon `question` (Confirm File Delete, ...) | none: Windows' "Question" event has no sound by default | - |
| `fs.delete` (Explorer: a file or folder sent to the Recycle Bin) | at the event | EmptyRecycleBin (the shell's recycle sound) |
| `session.switch` (Switch User) | none: fast user switching keeps the session, so no log off | - |

Not played, because the OS has no such event (adding one just for a sound is out): new mail
arriving (MailBeep; the mailbox is fixed, nothing arrives), Messenger (MSNMSGR_ContactOnline,
NewMessage, NewAlert, NewMail: every buddy is away and nothing comes in), notification balloons
(SystemNotification), device connect / disconnect / fail (the camera is always present in my
Computer; AutoPlay opens when asked, not on a plug-in), blocked pop-ups (Internet Explorer opens
no pop-ups), the battery alarms and SecurityBand. Windows' default beep for a click outside a modal
dialog has no counterpart either (no window is modal). The originals stay in assets-src; add a row
here and the file to tools/sounds/encode.py when an event appears.

## Volume

Control Panel > Sounds and Audio Devices (apps/applet `Sound`): its Device volume slider and Mute
box are the system's (`ui.value` ids `sys.volume`, default 0.7, and `sys.mute`, session-wide like
Windows' setting); the output gain follows them live, and the applet shows them when it opens
again. Winamp's and the sidebar strip's volume belong to the (silent) media player, not to the
system sounds. There is no taskbar volume icon.

## Playback

- Real use only: never under ?capture, ?bench, ?demo or ?scenario (the video has no sound), and
  only for events appended to the log while the clock runs, at their time: a replaced log (the
  boot's start log, a tool restoring a state, a replay) or an event stamped in the past plays
  nothing. Everything else stays a pure function of (time, log): the sounds draw nothing.
- Web Audio, one AudioContext through one gain node (the volume). Browsers let sound start only
  after a user gesture; the power button's press (scenes/session/powerButton.js) is that gesture:
  index.html's inline handler creates and resumes the context inside it, and sounds.js adopts it
  (with ?nopower the first pointer or key press does). A sound asked for while the context can't
  run is dropped, and any sound that can't start within 250 ms of its moment is dropped: never
  late.
- Files: AAC .m4a (both engines decode it; the encoder's priming is honoured: measured 0.1-12 ms
  of lead in Chrome and WebKit, the sound's own attack), leading silence and silent tails trimmed
  by `python3 -I tools/sounds/encode.py`, 438 KB for the nine. Fetched and decoded one at a time
  after the gesture, the startup sound first (it is needed ~2.9 s after the press); decoding runs
  off the main thread (Chrome 1-4 ms a file, WebKit 11-240 ms). Decoded they are ~10 MB (26 s of
  stereo float), kept for the session so every click's sound starts at once.
- Memory (iOS Simulator, `tools/memory.mjs --engine ios --quick`, `--query sounds=load` decodes the
  whole set at load): peak 827-880 MB with every sound decoded against 1003 MB without in the same
  hour, webcontent 381-414 against 407-427 MB: the decoded set is within the run-to-run noise.
- Test hooks: `window.__lhSounds.played` lists what played ({ name, at: performance.now(), t:
  clock, event }); `?sounds=load` decodes everything at load without playing (a measurement).

## Checking it

Headless browsers can't be heard, so a check reads `__lhSounds.played` after real CDP input and
lines it up with the screen: the session in the scratch notes of 2026-11-07 (power button, boot,
log on, Run with an unknown name, message boxes of each icon, a delete, log off, log on, shut
down, the off screen's power button) played exactly the table above, and a screencast with the
played sounds mixed in at their logged times shows the startup sound on the cut from the boot
screen to the fading-in welcome screen, the logon sound on the submit frame, log off and shut down
on the click. (Recording the AudioContext's own output through a MediaStreamDestination in
headless Chrome drifts against the wall clock by up to a second, so it can't time anything.)
