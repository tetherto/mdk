import { createIcon } from './create-icon'

export const PlugIcon = createIcon({
  displayName: 'PlugIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <path
      d="M5.6001 1.6001V4.8001M10.4001 1.6001V4.8001M3.2001 4.8001H12.8001V7.2001C12.8001 9.8511 10.6511 12.0001 8.0001 12.0001C5.3491 12.0001 3.2001 9.8511 3.2001 7.2001V4.8001ZM8.0001 12.0001V14.4001"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
})
