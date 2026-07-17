import { createIcon } from './create-icon'

export const RightArrowIcon = createIcon({
  displayName: 'RightArrowIcon',
  viewBox: '0 0 18 8',
  defaultWidth: 18,
  defaultHeight: 8,
  path: ({ color }) => <path d="M13.5113 3H0V5H13.5113V8L18 4L13.5113 0V3Z" fill={color} />,
})
