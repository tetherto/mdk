import { createIcon } from './create-icon'

export const MinersOverviewNavIcon = createIcon({
  displayName: 'MinersOverviewNavIcon',
  viewBox: '0 0 18 18',
  defaultWidth: 18,
  defaultHeight: 18,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M15 7H3m12 0a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1m12 0a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1M3 7a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1m12 0H3m12 0a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1m.5-6h3m-3 4h3m-3 4h3"
    />
  ),
})
