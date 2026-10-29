import { createIcon } from './create-icon'

export const ExternalLinkIcon = createIcon({
  displayName: 'ExternalLinkIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <path
      d="M9.6001 1.6001H14.4001M14.4001 1.6001V6.4001M14.4001 1.6001L7.2001 8.8001M12.0001 9.6001V14.4001H1.6001V4.0001H6.4001"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
})
