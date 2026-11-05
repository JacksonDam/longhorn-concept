// Menus opened from the sidebar headers (drawn by the UI kit's DropMenu in the overlay).
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { valueOf, setValue, menuWidth } from '../../ui/index.js'
import { launch } from './appInfo.jsx'

// the user header ("Sondra")
export const USER_MENU = [
  { label: 'my Documents', onClick: () => launch.documents() },
  { label: 'my Pictures', onClick: () => launch.pictures() },
  '-',
  { label: 'Switch User', onClick: () => emit('session.switch') },
  { label: 'Log Off...', onClick: () => emit('session.logoff') },
  { label: 'Shut Down...', onClick: () => emit('session.shutdown') },
]

// "Buddies": the messenger status (a radio group, logged as ui.value 'sb.status')
const STATUSES = ['Online', 'Busy', 'Be Right Back', 'Away', 'On the Phone', 'Appear Offline']
export const STATUS_MENU = () => {
  const cur = valueOf(now(), 'sb.status', 'Online')
  return [
    ...STATUSES.map((s) => ({ label: s, radio: s === cur, onClick: () => setValue('sb.status', s) })),
    '-',
    { label: 'Send an Instant Message...', onClick: () => launch.im('Hank') },
    { label: 'Go to my E-mail Inbox', onClick: () => launch.email() },
  ]
}

// left of the sidebar, its top at y
export const besideSidebar = (items, y) => ({ x: Math.round(856 - menuWidth(typeof items === 'function' ? items() : items)), y })
