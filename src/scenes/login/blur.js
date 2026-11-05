// Motion-blur settings per animation: [samples, shutter in video frames, phase], fitted against the
// reference by grid search (tools/login/fit_blur.py). Local tuning aid: ?mb={"slab":[8,0.5,-0.5]}
// overrides entries in captures.
import { FPS } from '../../core/clock.js'

const BLUR = {
  slab: [6, 0.6, -0.5], // the selected tile's flight, return and exit
  slide: [6, 1.25, -0.6], // bar tiles closing the gap
  panel: [32, 1, -0.5], // password panel sweep
  flag: [10, 0.9, -0.5], // exit spin of the flag
  tiles: [10, 1, -0.5], // exit flip/drop of the bar tiles
}
try {
  Object.assign(BLUR, JSON.parse(new URLSearchParams(location.search).get('mb') || '{}'))
} catch {
  // ignore malformed overrides
}

export function blur(name) {
  const [samples, frames, phase] = BLUR[name]
  return { samples, shutter: frames / FPS, phase }
}
