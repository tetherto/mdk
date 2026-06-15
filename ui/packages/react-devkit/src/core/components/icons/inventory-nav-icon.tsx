import { createIcon } from './create-icon'

export const InventoryNavIcon = createIcon({
  displayName: 'InventoryNavIcon',
  viewBox: '0 0 18 18',
  defaultWidth: 18,
  defaultHeight: 18,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M12.5 3H15v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3h2.5M6 2h6v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V2Z"
    />
  ),
})
