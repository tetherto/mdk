import { createIcon } from './create-icon'

export const ExplorerNavIcon = createIcon({
  displayName: 'ExplorerNavIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M1 13V3a1 1 0 0 1 1-1h4l2 2h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1Z"
    />
  ),
})
