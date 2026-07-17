import { createIcon } from './create-icon'

export const ContainerWidgetsNavIcon = createIcon({
  displayName: 'ContainerWidgetsNavIcon',
  viewBox: '0 0 18 18',
  defaultWidth: 18,
  defaultHeight: 18,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M6.5 10h5M2 2h14v4H2V2Zm1 4v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6H3Z"
    />
  ),
})
