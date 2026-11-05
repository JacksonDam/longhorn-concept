// The Plex sidebar: a translucent glass panel on the right (x 858-960, y 0-700) with tiles
// top to bottom: user header, Seattle weather, Mail, media strip, Buddies, photo, Go Online,
// desktop thumbnails. Static content is memoised; only tile opacities follow the clock.
import { memo } from 'react'
import { asset } from '../../core/preload.js'
import { emit } from '../../core/events.js'
import {
  EnvelopeClosed,
  EnvelopeOpen,
  BuddyAway,
  SwimmerPic,
  OrangePic,
  Skyline,
  PlayButton,
  SmallButton,
  MediaCapsule,
  GoOnlineOrb,
  Thumb,
} from './icons.jsx'

export const PANEL = { x: 858, y: 0, w: 102, h: 700 }
const L = PANEL.x // panel left, all coordinates below are absolute stage px

// Text placed by its baseline. Libre Franklin with line-height = font size puts the
// baseline 0.86 em below the top of the line box.
export const text = (x, baseline, size, extra) => ({
  position: 'absolute',
  left: x,
  top: baseline - 0.86 * size,
  fontFamily: "'Libre Franklin', Tahoma, sans-serif",
  fontWeight: 500,
  fontSize: size,
  lineHeight: `${size}px`,
  whiteSpace: 'nowrap',
  color: 'rgba(255,255,255,0.9)',
  ...extra,
})

export const MAIL = [
  { text: 'Last time we met', icon: 'closed' },
  { text: 'Hotmail Service', icon: 'hot', selected: true },
  { text: 'Hello', icon: 'closed' },
  { text: 'Information for you', icon: 'open' },
  { text: 'You Gotta check this out', icon: 'open' },
  { text: 'Yesterday', icon: 'open' },
  { text: 'Funny Thing', icon: 'open' },
  { text: 'Hi Jeff', icon: 'open' },
  { text: 'Just in Time', icon: 'open' },
]
export const MAIL_Y0 = 99.4 // baseline of the first mail row
export const MAIL_DY = 18.8

export const BUDDIES = [
  { name: 'Hank', pic: 'kick', y: 351.5 },
  { name: '', pic: 'orange', y: 370.25 },
  { name: 'Harold', pic: 'away', y: 389 },
  { name: 'Swimmer Dude', pic: 'swimmer', y: 407.75 },
  { name: 'Anthony', pic: 'dog', y: 426.5 },
  { name: 'Kathy', pic: 'away', y: 445.25 },
  { name: 'RogerCC', pic: 'duck', y: 464 },
  { name: 'Gmonster', pic: 'away', y: 482.75 },
  { name: 'Justin', pic: 'away', y: 501.5 },
]

function BuddyPic({ kind, baseline }) {
  const x = 866
  const y = baseline - 14.5
  if (kind === 'away') return <BuddyAway x={x - 1} y={y - 3} />
  if (kind === 'swimmer') return <SwimmerPic x={x} y={y} />
  if (kind === 'orange') return <OrangePic x={x - 1} y={y + 0.5} />
  const src = { kick: 'buddy-kick.webp', dog: 'buddy-dog.webp', duck: 'buddy-duck.webp' }[kind]
  return (
    <img
      src={asset('img/desktop/' + src)}
      alt=""
      style={{ position: 'absolute', left: x, top: y, width: 16, height: 17, outline: '1px solid rgba(40,50,70,0.25)' }}
    />
  )
}

// fade on the right where long labels run into the panel edge
const clipRight = { width: 960 - 889, overflow: 'hidden', maskImage: 'linear-gradient(to right, #000 85%, transparent)' }

// The user picture first shows colour-washed (pale yellow, as on the login screen's
// selected tile) and turns to full colour as the name fades in (frames 568.5-574).
const userPic = { position: 'absolute', left: 864, top: 4, width: 19, height: 18, objectFit: 'cover' }
const HeaderPale = memo(function HeaderPale() {
  return <img src={asset('img/desktop/user-sondra.webp')} alt="" style={{ ...userPic, filter: 'sepia(0.75) saturate(0.8) brightness(1.45) contrast(0.8)' }} />
})
const HeaderColor = memo(function HeaderColor() {
  return <img src={asset('img/desktop/user-sondra.webp')} alt="" style={userPic} />
})
const HeaderName = memo(function HeaderName() {
  return <div style={text(887.5, 17, 11.2, { color: 'rgba(255,255,255,0.92)' })}>Sondra</div>
})

const SeattleTile = memo(function SeattleTile() {
  return (
    <>
      <Skyline x={878} y={31} />
      <div style={text(866.3, 42, 10.7, { color: 'rgba(255,255,255,0.85)' })}>Seattle</div>
    </>
  )
})

const MailTile = memo(function MailTile() {
  return (
    <>
      <div style={text(867, 81.2, 10.5)}>Mail</div>
      {MAIL.map((m, i) => {
        const b = MAIL_Y0 + i * MAIL_DY
        return (
          <div key={i}>
            {m.selected && (
              <div
                style={{
                  position: 'absolute',
                  left: 861,
                  top: b - 15,
                  width: 960 - 861,
                  height: 18,
                  background: 'linear-gradient(to right, rgba(150,200,255,0.55), rgba(120,170,240,0.35) 60%, rgba(120,170,240,0.2))',
                }}
              />
            )}
            {m.icon === 'open' ? <EnvelopeOpen x={866} y={b - 11} /> : <EnvelopeClosed x={867} y={b - 14.5} hot={m.icon === 'hot'} />}
            <div style={{ ...text(888, b, 9), ...clipRight }}>{m.text}</div>
          </div>
        )
      })}
    </>
  )
})

const MediaTile = memo(function MediaTile() {
  return (
    <>
      <div style={{ ...text(867, 272, 8, { color: 'rgba(235,240,255,0.8)', letterSpacing: '0.1px' }), width: 90, overflow: 'hidden' }}>
        U2 - One more Voice With Love
      </div>
      <MediaCapsule x={888} y={281} />
      <PlayButton x={865} y={278} />
      <SmallButton x={894} y={284} kind="stop" />
      <SmallButton x={914} y={284} kind="prev" />
      <SmallButton x={932} y={284} kind="next" />
    </>
  )
})

const BuddiesTile = memo(function BuddiesTile() {
  return (
    <>
      <div style={text(866.5, 333.5, 10.2)}>Buddies</div>
      {BUDDIES.map((b, i) => (
        <div key={i}>
          <BuddyPic kind={b.pic} baseline={b.y} />
          {b.name && <div style={{ ...text(888, b.y, 9), ...clipRight }}>{b.name}</div>}
        </div>
      ))}
    </>
  )
})

const PhotoTile = memo(function PhotoTile() {
  return (
    <img
      src={asset('img/desktop/photo-standin.webp')}
      alt=""
      style={{ position: 'absolute', left: 862, top: 519, width: 96, height: 73, objectFit: 'cover' }}
    />
  )
})

const OnlineTile = memo(function OnlineTile() {
  return (
    <>
      <GoOnlineOrb x={864} y={599.5} />
      <div style={text(886.2, 616.5, 10.3)}>Go Online</div>
    </>
  )
})

const ThumbsTile = memo(function ThumbsTile() {
  return (
    <>
      <Thumb x={875} y={627} kind={0} />
      <Thumb x={912} y={627} kind={1} />
      <Thumb x={875} y={661} kind={2} />
      <Thumb x={912} y={661} kind={3} />
    </>
  )
})

// Tile order and their stacking: each entry renders inside its own opacity group
export const TILES = [
  ['header', HeaderPale],
  ['headerColor', HeaderColor],
  ['name', HeaderName],
  ['seattle', SeattleTile],
  ['mail', MailTile],
  ['media', MediaTile],
  ['buddies', BuddiesTile],
  ['photo', PhotoTile],
  ['online', OnlineTile],
  ['thumbs', ThumbsTile],
]

// The glass backdrop is precomputed from the wallpaper (it only ever has the wallpaper
// behind it): blur 2 px, then per column an alpha-like gain k(x) (0.33 at the left edge
// to 0.72 at the right) plus per-column and per-row tints, fitted on the empty panel of
// video frames 521-523 (and the clock foot under it, rows 700-720). See the spec.
const Glass = memo(function Glass() {
  return (
    <img
      src={asset('img/desktop/glass.webp')}
      alt=""
      style={{ position: 'absolute', left: PANEL.x, top: 0, width: PANEL.w, height: 720 }}
    />
  )
})

// opacity: { panel, header, name, seattle, ... } in 0..1
export function Sidebar({ opacity, haze = 0, onMedia, mediaHL }) {
  const hl = mediaHL?.hover ?? 0
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: opacity.panel }}>
        <Glass />
        {haze > 0 && (
          <div
            style={{
              position: 'absolute',
              left: PANEL.x,
              top: 0,
              width: PANEL.w,
              height: PANEL.h,
              background: 'rgb(170,190,225)',
              opacity: haze,
            }}
          />
        )}
      </div>
      {hl > 0 && (
        <div
          style={{
            position: 'absolute',
            left: 859,
            top: 257,
            width: 101,
            height: 52,
            opacity: opacity.media,
            background: `rgba(95,172,250,${0.6 * Math.min(1, hl)})`,
          }}
        />
      )}
      {TILES.map(([id, Comp]) =>
        opacity[id] > 0 ? (
          <div key={id} style={{ position: 'absolute', inset: 0, opacity: opacity[id] }}>
            <Comp />
          </div>
        ) : null,
      )}
      {/* hit areas */}
      <div
        style={{ position: 'absolute', left: L, top: 258, width: PANEL.w, height: 50, pointerEvents: 'auto' }}
        onPointerDown={(e) => {
          e.stopPropagation()
          onMedia?.()
        }}
        onPointerEnter={() => emit('hover', { id: 'sb.media', on: true })}
        onPointerLeave={() => emit('hover', { id: 'sb.media', on: false })}
      />
    </div>
  )
}
