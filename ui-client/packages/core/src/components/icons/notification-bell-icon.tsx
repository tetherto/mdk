import { createIcon } from './create-icon'

export const NotificationBellIcon = createIcon({
  displayName: 'NotificationBellIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <path
      d="M1.5 11H14.5M3 11V6C3 3.23858 5.23858 1 8 1C10.7614 1 13 3.23858 13 6V11M6 12.5V13C6 14.1046 6.89543 15 8 15C9.10457 15 10 14.1046 10 13V12.5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
})
