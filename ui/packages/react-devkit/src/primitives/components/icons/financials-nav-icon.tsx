import { createIcon } from './create-icon'

export const FinancialsNavIcon = createIcon({
  displayName: 'FinancialsNavIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 18,
  defaultHeight: 18,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M0.75 0.75V15.25H15.25M2.75 12.25L6.75 6.25L9.75 10.25L14.75 3.25"
    />
  ),
})
