// Desktop scene timing. Every entrance time is measured on the reference video in frames
// after the 'login.submit' event (video frame 509), so `since + df(n)` is the moment the
// video reaches frame 509 + n. See docs/desktop-spec.md for the measurements.
import { FPS } from '../../core/clock.js'
import { clamp } from '../../core/anim.js'

export const SUBMIT_FRAME = 509
export const df = (n) => n / FPS // frame count -> seconds
// seconds since `since`, expressed in video frames relative to the submit frame
export const framesSince = (t, since) => (t - since) * FPS

// linear ramp 0..1 between two frame offsets (absolute video frame numbers for readability)
export const ramp = (f, a, b) => clamp((f - (a - SUBMIT_FRAME)) / (b - a))
