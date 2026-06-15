import { createIcon } from './create-icon'

export const AlertsNavIcon = createIcon({
  displayName: 'AlertsNavIcon',
  viewBox: '0 0 18 18',
  defaultWidth: 18,
  defaultHeight: 18,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M2.5 12h13M4 12V7a5 5 0 0 1 10 0v5m-7 1.5v.5a2 2 0 1 0 4 0v-.5"
    />
  ),
})
