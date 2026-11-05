# longhorn-concept

An interactive rebuild of the 2003 Windows "Longhorn" Plex demo video
(`lh_plex_demo\media\EFFECTS.WMV`): the animated sign-in screen, the glass user tile, the
Stonehenge desktop with its sidebar, the my Music flyout and the my Music window, including the
video's multi-sample motion blur.

Try it out:
[deployed on GitHub Pages](https://jacksondam.com/longhorn-concept/)

Watch the original sequence replayed inside the app:
[?demo](https://jacksondam.com/longhorn-concept/?demo) (click or press a key at any point to take over)

<br/>

To run locally:
```
npm install
npm run dev
```

<br/>

Every visual is a pure function of time and an input log, so the app can be paused on any frame of
the original video and compared with it (`tools/capture.mjs`, `tools/rmse.py`, `tools/compare.mjs`;
the reference frames themselves are not in the repo). See `docs/ARCHITECTURE.md`.

Album covers, user pictures and photos from the original are replaced by original stand-ins or
Windows account pictures; see `docs/SUBSTITUTIONS.md`.
