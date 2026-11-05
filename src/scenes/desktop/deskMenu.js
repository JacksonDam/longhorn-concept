// The desktop's right-click menu (UI kit ContextMenu): Arrange Icons By (a radio group and
// two toggles, logged as ui.value), Refresh, Properties -> Display Properties.
import { emit } from '../../core/events.js'
import { now } from '../../core/clock.js'
import { valueOf, setValue } from '../../ui/index.js'
import { launch } from './appInfo.jsx'

const SORT = ['Name', 'Size', 'Type', 'Modified']
export const DESK_MENU = () => {
  const t = now()
  const sort = valueOf(t, 'desk.sort', 'Name')
  const auto = valueOf(t, 'desk.auto', false)
  const grid = valueOf(t, 'desk.grid', true)
  return [
    {
      label: 'Arrange Icons By',
      items: [
        ...SORT.map((s) => ({ label: s, radio: s === sort, onClick: () => setValue('desk.sort', s) })),
        '-',
        { label: 'Auto Arrange', checked: auto, onClick: () => setValue('desk.auto', !auto) },
        { label: 'Align to Grid', checked: grid, onClick: () => setValue('desk.grid', !grid) },
      ],
    },
    { label: 'Refresh', onClick: () => emit('desk.refresh') },
    '-',
    { label: 'Properties', onClick: () => launch.display() },
  ]
}
