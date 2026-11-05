// The "my Music" flyout next to the sidebar's media strip.
import { emit, last } from '../../core/events.js'

export function flyoutState(t) {
  const e = last(t, (e) => e.type === 'desk.flyout')
  return { open: !!e?.open, at: e ? e.t : -Infinity }
}
export function toggleFlyout() {
  emit('desk.flyout', { open: true })
}
export function closeFlyout() {
  emit('desk.flyout', { open: false })
}

export function Flyout() {
  return null
}
