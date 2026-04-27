import { createIcon } from './create-icon'

export const DecreaseIcon = createIcon({
  displayName: 'DecreaseIcon',
  viewBox: '0 0 16 10',
  defaultWidth: 16,
  defaultHeight: 10,
  path: ({ color }) => (
    <path
      d="M12.5468 7.04549H10.1742V9.04028H15.8773V3.6271H13.8738V5.5428L8.99662 0.955658L5.68368 4.06648L1.56228 0.199922L0.200195 1.65867L5.68368 6.80822L8.99662 3.70619L12.5468 7.04549Z"
      fill={color}
    />
  ),
})
