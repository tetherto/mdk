import { createIcon } from './create-icon'

export const DashboardNavIcon = createIcon({
  displayName: 'DashboardNavIcon',
  viewBox: '0 0 18 18',
  defaultWidth: 18,
  defaultHeight: 18,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M9 2 2 8v7a1 1 0 0 0 1 1h4v-3a2 2 0 1 1 4 0v3h4a1 1 0 0 0 1-1V8L9 2Z"
      clipRule="evenodd"
    />
  ),
})
