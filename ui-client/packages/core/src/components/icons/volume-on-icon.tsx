import { createIcon } from './create-icon'

export const VolumeOnIcon = createIcon({
  displayName: 'VolumeOnIcon',
  viewBox: '0 0 20 20',
  defaultWidth: 20,
  defaultHeight: 20,
  path: ({ color }) => (
    <path
      d="M13 8.5V11.5M15 6.5V13.5M17 4.5V15.5M6 12.9941H4C3.448 12.9941 3 12.5474 3 11.9948V7.99739C3 7.44475 3.448 6.99804 4 6.99804H6L11 4V15.9922L6 12.9941Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
})
