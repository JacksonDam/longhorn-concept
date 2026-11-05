// Window chrome of my Music: title + glass toolbar, menu/address row and command row.
// Static (memoised): no clock reads. Window-local px (see geometry.js).
import { memo } from 'react'
import { emit } from '../../core/events.js'
import { Txt, abs, HEAVY } from './ui.jsx'
import * as I from './icons.jsx'

const toolbarBg =
  'linear-gradient(90deg, #4985d7 0px, #4f8bdd 40px, #5793e2 120px, #5fa1ed 200px, #6eb0fa 285px, #6ab0f8 330px, #68aaf8 360px, #66a8f4 440px, #5fa2ee 500px, #5a9ce9 560px, #558fe2 640px, #4e84d7 700px, #4a86d8 777px)'
const bandBg =
  'linear-gradient(90deg, #326ab4 0px, #356eba 85px, #3b73bd 125px, #427dc4 165px, #508bd2 245px, #5994d4 285px, #5a9ade 325px, #5c9ce0 365px, #5c9ad9 405px, #5a9ad8 445px, #5190d6 485px, #518cd1 525px, #4984cb 565px, #437ec3 605px, #3974bd 645px, #386ebb 685px, #326ab6 725px, #336bb5 777px)'

const label = { size: 11, w: 400, f: HEAVY, sx: 1, c: '#e4f4ff', style: { filter: 'drop-shadow(0 0 1.2px rgba(10,50,120,0.75))' } }

function ToolItem({ x, text, tx, children, iw, ih, ix, iy }) {
  return (
    <>
      <I.Reflected x={ix} y={iy} w={iw} h={ih} gap={0} depth={9} op={0.3}>
        {children}
      </I.Reflected>
      <Txt x={tx} y={48} {...label}>
        {text}
      </Txt>
    </>
  )
}

export const Chrome = memo(function Chrome() {
  return (
    <>
      {/* glass toolbar (title bar + favourites row) */}
      <div style={abs(0, 0, 777, 75, { background: toolbarBg })} />
      <div
        style={abs(0, 0, 777, 75, {
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.28) 0, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0) 6px, rgba(255,255,255,0) 64px, rgba(255,255,255,0.06) 68px, rgba(255,255,255,0.1) 70px, rgba(0,0,0,0) 72px)',
        })}
      />
      <div style={abs(348, 4, 13, 10)}>
        <I.TitleEq />
      </div>
      <Txt x={364} y={13.5} size={13.5} w={400} sx={0.95} c="#e3f3ff" parts={[['my ', { w: 300 }], ['Music', { w: 600 }]]} />
      <div style={abs(741, 5, 36, 12)}>
        <I.WinButtons />
      </div>
      <div
        data-hit="music.minimize"
        style={abs(737, 1, 16, 18, { cursor: 'default' })}
        onClick={() => emit('music.minimize')}
      />
      <div data-hit="music.close" style={abs(763, 1, 16, 18)} onClick={() => emit('music.close')} />

      <div style={abs(10, 19, 60, 40)}>
        <I.BackForward />
      </div>
      <ToolItem ix={90} iy={22} iw={34} ih={36} tx={133} text="Home">
        <I.HomeIcon />
      </ToolItem>
      <ToolItem ix={149} iy={29} iw={50} ih={26} tx={209} text="Search">
        <I.SearchIcon />
      </ToolItem>
      <ToolItem ix={255} iy={27} iw={28} ih={32} tx={291} text="ofoto.com">
        <I.PageIcon kind="ofoto" />
      </ToolItem>
      <ToolItem ix={356} iy={26} iw={26} ih={30} tx={387} text="my music">
        <I.NotesIcon />
      </ToolItem>
      <ToolItem ix={444} iy={26} iw={28} ih={32} tx={482} text="yahoo.com">
        <I.PageIcon kind="yahoo" />
      </ToolItem>
      <ToolItem ix={553} iy={26} iw={28} ih={32} tx={593} text="google.com">
        <I.PageIcon kind="google" />
      </ToolItem>
      <ToolItem ix={659} iy={25} iw={30} ih={30} tx={695} text="Favorites">
        <I.StarIcon />
      </ToolItem>

      {/* menu / address band and command row */}
      <div
        style={abs(1, 72, 775, 50, {
          background: bandBg,
          borderRadius: '8px 8px 0 0',
          boxShadow: 'inset 0 1px 0 rgba(20,60,130,0.6), inset 0 2px 0 rgba(140,190,255,0.12)',
        })}
      />
      <div style={abs(0, 118, 777, 4, { background: 'linear-gradient(180deg, #3f7ac3, #5a96e0 50%, #3c76b7)' })} />
      <div style={abs(0, 122, 777, 1, { background: '#9cd8ff' })} />

      <Txt x={16} y={88} size={10} w={400} f={HEAVY} sx={1} c="#86bcff">
        File
      </Txt>
      <Txt x={57} y={88} size={10} w={400} f={HEAVY} sx={1} c="#86bcff">
        Edit
      </Txt>
      <Txt x={100} y={88} size={10} w={400} f={HEAVY} sx={1} c="#86bcff">
        View
      </Txt>
      <Txt x={151} y={88} size={10} w={400} f={HEAVY} sx={1} c="#8cc2ff">
        Help
      </Txt>

      {/* breadcrumb address bar */}
      <div
        style={abs(198, 78, 564, 17, {
          borderRadius: 9,
          background: 'linear-gradient(90deg, #d9ecfb 0, #e5effa 300px, #dce9f6 440px, #b7cde6 564px)',
          boxShadow: 'inset 0 1px 1px rgba(10,40,100,0.35), 0 1px 0 rgba(170,210,255,0.35)',
        })}
      />
      <div
        style={abs(198, 78, 104, 17, {
          borderRadius: '9px 0 0 9px',
          background: 'linear-gradient(180deg, #86c8ff 0, #6cb2f6 45%, #5ca2ea 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
        })}
      />
      <div style={abs(302, 78, 83, 17, { background: 'linear-gradient(180deg, #6ea2df 0, #5b8fd2 50%, #5486c8 100%)' })} />
      <svg width="10" height="10" style={{ position: 'absolute', left: 205, top: 82, overflow: 'visible' }}>
        <path d="M4.5 1 L8 5 L6 5 L6 8.5 L3 8.5 L3 5 L1 5 Z" fill="#ffffff" />
      </svg>
      <Txt x={217} y={90} size={11.5} w={400} f={HEAVY} sx={1} c="#ffffff">
        my Computer
      </Txt>
      <div style={abs(291, 85, 7, 4)}>
        <I.DropArrow c="#e8f4ff" />
      </div>
      <Txt x={312} y={90} size={11.5} w={400} f={HEAVY} sx={1} c="#f0f6ff">
        my Pictures
      </Txt>
      <div style={abs(377, 85, 7, 4)}>
        <I.DropArrow c="#e8f4ff" />
      </div>
      <Txt x={389} y={89.5} size={11} w={400} c="#8ab0d8">
        search my for...
      </Txt>

      {/* command row */}
      <div style={abs(14, 104, 14, 14)}>
        <I.HideTasksIcon />
      </div>
      <Txt x={35} y={113} size={10.4} w={400} f={HEAVY} sx={1} c="#e6f2ff">
        Hide Music Tasks
      </Txt>
      <div style={abs(194, 99, 20, 20)}>
        <I.UpFolderIcon />
      </div>
      <Txt x={218} y={112.5} size={9.8} w={400} f={HEAVY} sx={1} c="#e6f2ff">
        Up a Folder
      </Txt>
      <div style={abs(295, 99, 26, 26)}>
        <I.FolderIcon size={26} />
      </div>
      <Txt x={320} y={112.5} size={9.8} w={400} f={HEAVY} sx={1} c="#e6f2ff">
        Folders
      </Txt>
      <div style={abs(372, 97, 24, 24)}>
        <I.FindIcon />
      </div>
      <Txt x={396} y={112.5} size={9.8} w={400} f={HEAVY} sx={1} c="#e6f2ff">
        Find
      </Txt>
      <div
        style={abs(433, 96, 77, 23, {
          borderRadius: 4,
          background: 'linear-gradient(180deg, rgba(150,200,255,0.55), rgba(110,170,240,0.45))',
          boxShadow: 'inset 0 0 0 1px rgba(170,215,255,0.35)',
        })}
      />
      <div style={abs(441, 99, 18, 18)}>
        <I.PreviewIcon />
      </div>
      <Txt x={462} y={112.5} size={9.8} w={400} f={HEAVY} sx={1} c="#eef6ff">
        Preview
      </Txt>
    </>
  )
})
