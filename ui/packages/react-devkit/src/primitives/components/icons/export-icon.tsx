import { createIcon } from './create-icon'

export const ExportIcon = createIcon({
  displayName: 'ExportIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <path
      d="M8.0001 11.2002L4.53343 8.00023M8.0001 11.2002L11.2001 8.00023M8.0001 11.2002V1.06689M14.4001 7.46689V14.4002H1.6001V7.46689"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
})
