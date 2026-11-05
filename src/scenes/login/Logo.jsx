// Top-right "Microsoft Windows" lockup (pastel XP flag + wordmark) and the VAIO logo.
// On submit the flag spins off up-right with motion blur and the words fade (see exit.js).
import { memo } from 'react'
import { asset, preload } from '../../core/preload.js'
import { MotionBlur } from '../../core/MotionBlur.jsx'
import { LOGO } from './layout.js'
import { flagExit, wordsExit } from './exit.js'

const FLAG = asset('img/login/flag.svg')
const WORDS = asset('img/login/wordmark.svg')
const VAIO = asset('img/login/vaio.svg')
preload([FLAG, WORDS, VAIO])

const { x, y, w, h } = LOGO
const FlagImg = memo(() => <img src={FLAG} alt="" draggable={false} style={{ display: 'block', width: w, height: h }} />)

export function Logo({ t, submitT }) {
  const k = submitT == null ? null : t - submitT
  const words = k == null ? { opacity: 1 } : wordsExit(k)
  const flagPose = (tt) => (submitT == null ? {} : flagExit(tt - submitT))
  const flagMoving = k != null && k > 0 && k < 0.6
  return (
    <>
      <MotionBlur
        t={t}
        moving={flagMoving}
        samples={10}
        shutter={0.9 / 29.97}
        style={{ left: x, top: y, width: w, height: h }}
        pose={(tt) => {
          const p = flagPose(tt)
          return {
            transform: p.transform ?? 'none',
            opacity: p.opacity ?? 1,
            transformOrigin: LOGO.flagOrigin,
          }
        }}
      >
        <FlagImg />
      </MotionBlur>
      <img
        src={WORDS}
        alt=""
        draggable={false}
        style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: words.opacity }}
      />
      <img
        src={VAIO}
        alt=""
        draggable={false}
        style={{ position: 'absolute', ...LOGO.vaio, opacity: words.opacity }}
      />
    </>
  )
}
