import { createIcon } from './create-icon'

export const IncreaseIcon = createIcon({
  displayName: 'IncreaseIcon',
  viewBox: '0 0 16 10',
  defaultWidth: 16,
  defaultHeight: 10,
  path: ({ color }) => (
    <path
      d="M12.5468 2.80101H10.1742V0.806213H15.8773V6.2194H13.8738V4.30369L8.99662 8.89084L5.68368 5.78001L1.56228 9.64657L0.200195 8.18783L5.68368 3.03827L8.99662 6.14031L12.5468 2.80101Z"
      fill={color}
    />
  ),
})
