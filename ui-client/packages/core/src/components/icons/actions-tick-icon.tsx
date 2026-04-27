import { createIcon } from './create-icon'

export const ActionsTickIcon = createIcon({
  displayName: 'ActionsTickIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 14,
  defaultHeight: 14,
  path: ({ color }) => (
    <path
      d="M11.5 2H14V14C14 14.5523 13.5523 15 13 15H3C2.44772 15 2 14.5523 2 14V2H4.5M5.5 9L7.5 11L11 7M5 1H11V3C11 3.55228 10.5523 4 10 4H6C5.44772 4 5 3.55228 5 3V1Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
})
