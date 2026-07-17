import { createIcon } from './create-icon'

export const EfficiencyIcon = createIcon({
  displayName: 'EfficiencyIcon',
  viewBox: '0 0 12 14',
  defaultWidth: 12,
  defaultHeight: 14,
  path: ({ color }) => (
    <path
      d="M6.0002 4.9999V7.7999H8.00019M4.8002 1.3999H7.20019M6.0002 2.9999C3.34923 2.9999 1.2002 5.14894 1.2002 7.7999C1.2002 10.4509 3.34923 12.5999 6.0002 12.5999C8.65116 12.5999 10.8002 10.4509 10.8002 7.7999C10.8002 5.14894 8.65116 2.9999 6.0002 2.9999Z"
      stroke={color}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
})
