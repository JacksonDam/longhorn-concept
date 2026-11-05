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
  const x = 864
  const y = baseline - 14
  if (kind === 'away') return <BuddyAway x={x} y={y - 2} />
  if (kind === 'swimmer') return <SwimmerPic x={x} y={y - 3} />
  if (kind === 'orange') return <OrangePic x={x} y={y - 4} />
  const src = { kick: 'buddy-kick.webp', dog: 'buddy-dog.webp', duck: 'buddy-duck.webp' }[kind]
  return (
    <img
      src={asset('img/desktop/' + src)}
      alt=""
      style={{ position: 'absolute', left: x, top: y - 3, width: 18, height: 18, outline: '1px solid rgba(40,50,70,0.35)' }}
    />
  )
}

// fade on the right where long labels run into the panel edge
const clipRight = { width: 960 - 889, overflow: 'hidden', maskImage: 'linear-gradient(to right, #000 85%, transparent)' }

const HeaderTile = memo(function HeaderTile() {
  return (
    <img
      src={asset('img/desktop/user-sondra.webp')}
      alt=""
      style={{ position: 'absolute', left: 864, top: 4, width: 19, height: 18, objectFit: 'cover' }}
    />
  )
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
            {m.icon === 'open' ? <EnvelopeOpen x={869} y={b - 12} /> : <EnvelopeClosed x={869} y={b - 15} hot={m.icon === 'hot'} />}
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
      <div style={{ ...text(870, 271, 9, { color: 'rgba(235,240,255,0.8)' }), width: 86, overflow: 'hidden' }}>
        U2 - One more Voice With Love
      </div>
      <PlayButton x={866} y={278} />
      <SmallButton x={894} y={283} kind="stop" />
      <SmallButton x={914} y={283} kind="prev" />
      <SmallButton x={932} y={283} kind="next" />
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
      <GoOnlineOrb x={866} y={597} />
      <div style={text(886.2, 616.5, 10.3)}>Go Online</div>
    </>
  )
})

const ThumbsTile = memo(function ThumbsTile() {
  return (
    <>
      <Thumb x={875} y={627} kind={0} />
      <Thumb x={912} y={627} kind={1} />
      <Thumb x={875} y={660} kind={2} />
      <Thumb x={912} y={660} kind={3} />
    </>
  )
})

// Tile order and their stacking: each entry renders inside its own opacity group
export const TILES = [
  ['header', HeaderTile],
  ['name', HeaderName],
  ['seattle', SeattleTile],
  ['mail', MailTile],
  ['media', MediaTile],
  ['buddies', BuddiesTile],
  ['photo', PhotoTile],
  ['online', OnlineTile],
  ['thumbs', ThumbsTile],
]

const Glass = memo(function Glass() {
  return (
    <img
      src={asset('img/desktop/glass.webp')}
      alt=""
      style={{ position: 'absolute', left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h }}
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
