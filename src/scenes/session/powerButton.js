// The power button: the machine's on switch. In real use the page opens on it (index.html, from
// the first paint, before the bundle has loaded: a black screen with the button centred), and the
// off screen after Shut Down shows the same (PowerScreens.jsx OffScreen). Pressing it (a click, or
// Enter / Space) is the user's first gesture, which lets the OS's sounds play (os/sounds.js), and
// starts the boot: the boot screen, then the welcome screen fading in.
//
// The art is the login screen's Shut Down orb (scenes/login/Bar.jsx ShutDown: its rim, body,
// highlight and bar), the same drawing scaled up (SCALE) with no label. Hover brightens it and
// grows it a little, a press sinks it. Plain strings, like bootScreen.js, so vite.config.js can
// inline the page's copy; in stage px (the video's frame), centred on the screen.
//
// Never shown under ?capture, ?bench, ?demo or ?scenario=..., nor with ?nopower (tools that
// measure something else boot straight away; core/boot.js), and a pinned capture never sees it.

export const SCALE = 1.84 // the Shut Down orb's radius 14.7 -> 27 stage px
const R = 14.7 // the Shut Down orb (scenes/login/layout.js SHUTDOWN.r)
const BOX = 2 * (R + 2) // its SVG box (the rim's stroke reaches past r)
export const ORB = BOX * SCALE // stage px
export const HIT = 120 // stage px, the square that takes the press (tap-sized at a phone's page zoom)
export const HOVER = { scale: 1.06, brightness: 1.25 }
export const PRESS = { scale: 0.96, brightness: 0.9 }
export const FADE_IN = { delay: 0.4, dur: 0.8 } // s, the button fades in

// the orb (id: a prefix for its gradient ids, unique per copy in the document)
export const orbSVG = (id) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-R - 2} ${-R - 2} ${BOX} ${BOX}" width="100%" height="100%" style="position:absolute;left:0;top:0;overflow:visible">` +
  `<defs><radialGradient id="${id}-b" cx="0.55" cy="0.78" r="0.7"><stop offset="0" stop-color="#8db0ff"/><stop offset="0.55" stop-color="#5a88fb"/><stop offset="1" stop-color="#4a7af2"/></radialGradient>` +
  `<linearGradient id="${id}-t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe6ff" stop-opacity="0.95"/><stop offset="0.55" stop-color="#c4d2ff" stop-opacity="0.55"/><stop offset="1" stop-color="#a8c0ff" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="${id}-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c0d4f0"/><stop offset="0.5" stop-color="#7aa6e6"/><stop offset="1" stop-color="#64a6f6"/></linearGradient></defs>` +
  `<circle r="${R}" fill="none" stroke="url(#${id}-r)" stroke-width="1.6" opacity="0.9"/>` +
  `<circle r="${R - 1.2}" fill="url(#${id}-b)"/>` +
  `<ellipse cx="0" cy="${-R * 0.42}" rx="${R * 0.78}" ry="${R * 0.5}" fill="url(#${id}-t)"/>` +
  `<line x1="0" y1="-4.5" x2="0" y2="4.5" stroke="#9cc6ff" stroke-width="1.5" stroke-linecap="round"/></svg>`

// index.html's copy. Sized like the stage (core/Stage.jsx): a stage px is min(vw / 960, vh / 720)
// (on a phone the page is laid out at the stage's width, index.html, so the same holds). Held at
// 0.999 opacity like the boot screen, so the compositor still draws the boot's warm-up under it.
const sp = (v) => `min(${((v / 960) * 100).toFixed(4)}vw,${((v / 720) * 100).toFixed(4)}vh)`
const fx = (s, b) => `transform:translate(-50%,-50%) scale(${s});filter:brightness(${b})`
export const STATIC_CSS =
  `#lh-power{position:fixed;inset:0;z-index:2147483001;background:#000;opacity:.999}` +
  `#lh-power .b{position:absolute;left:50%;top:50%;width:${sp(HIT)};height:${sp(HIT)};transform:translate(-50%,-50%);border-radius:50%;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}` +
  `#lh-power .o{position:absolute;left:50%;top:50%;width:${sp(ORB)};height:${sp(ORB)};transform:translate(-50%,-50%);animation:lhp-in ${FADE_IN.dur}s ${FADE_IN.delay}s linear both}` +
  `@media (hover:hover){#lh-power .b:hover .o{${fx(HOVER.scale, HOVER.brightness)}}}` +
  `#lh-power .b:active .o{${fx(PRESS.scale, PRESS.brightness)}}` +
  `#lh-boot.off{display:none}` +
  `@keyframes lhp-in{from{opacity:0}to{opacity:1}}`
export const STATIC_HTML = `<div id="lh-power"><div class="b" role="button" tabindex="0" aria-label="Turn on"><div class="o">${orbSVG('lhp')}</div></div></div>`

// The page's switch, run inline right after the markup. Without the button (the modes above) it
// goes, and the boot screen shows from the first paint as before. With it, the boot screen waits
// (hidden) and window.__lhPower = { at, audio, done } tells core/boot.js when the button was
// pressed: the press (a click: an activation in every engine, iOS included) creates and resumes
// the AudioContext inside the gesture (os/sounds.js adopts it), removes the button and starts the
// boot screen's animation from that moment.
export const STATIC_SCRIPT = `(function(){
var el=document.getElementById('lh-power'),bs=document.getElementById('lh-boot');
if(/[?&](capture|bench|demo|scenario|nopower)(=|&|$)/.test(location.search)){el.remove();return}
bs.className='off';
var res,p={at:null,audio:null,done:new Promise(function(r){res=r})};window.__lhPower=p;
function go(){if(p.at!=null)return;p.at=performance.now();
try{var C=window.AudioContext||window.webkitAudioContext;if(C){p.audio=new C();p.audio.resume()}}catch(e){}
removeEventListener('keydown',key,true);el.remove();bs.className='';res(p.at)}
function key(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();go()}}
el.querySelector('.b').addEventListener('click',go);addEventListener('keydown',key,true)})()`
