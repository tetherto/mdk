import { createIcon } from './create-icon'

export const VolumeOffIcon = createIcon({
  displayName: 'VolumeOffIcon',
  viewBox: '0 0 20 20',
  defaultWidth: 20,
  defaultHeight: 20,
  path: ({ color }) => (
    <path
      d="M13.5859 8.58301L16.4139 11.4092M16.4142 8.58301L13.5862 11.4092M6 12.9941H4C3.447 12.9941 3 12.5474 3 11.9948V7.99731C3 7.44467 3.447 6.99805 4 6.99805H6L11 4V15.9922L6 12.9941Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
})
