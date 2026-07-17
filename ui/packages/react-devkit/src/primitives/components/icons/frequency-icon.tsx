import { createIcon } from './create-icon'

export const FrequencyIcon = createIcon({
  displayName: 'FrequencyIcon',
  viewBox: '0 0 13 17',
  defaultWidth: 13,
  defaultHeight: 17,
  path: ({ color }) => (
    <path
      d="M8.98541 0 .66803 9.5625H5.6983L3.85553 17l8.94827-9.71191H7.24225L8.98541 0Z"
      fill={color}
    />
  ),
})
