import { createIcon } from './create-icon'

export const CabinetWidgetNavIcon = createIcon({
  displayName: 'CabinetWidgetNavIcon',
  viewBox: '0 0 18 18',
  defaultWidth: 18,
  defaultHeight: 18,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M4.333 7.343C5.571 5.843 7.25 5 9 5s3.429.843 4.667 2.343M2 5.5c1.857-2.25 4.374-3.515 7-3.515 2.626 0 5.143 1.265 7 3.515m-7 2v3M3 11h12v5H3v-5Z"
    />
  ),
})
