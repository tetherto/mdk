import { createIcon } from './create-icon'

export const ReportingNavIcon = createIcon({
  displayName: 'ReportingNavIcon',
  viewBox: '0 0 18 18',
  defaultWidth: 18,
  defaultHeight: 18,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M6 8.995h6m-6 2.998L12 12M6 5.997 10 6m4 10H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h8l3 3v10a1 1 0 0 1-1 1Z"
    />
  ),
})
