import { createIcon } from './create-icon'

export const OperationsNavIcon = createIcon({
  displayName: 'OperationsNavIcon',
  viewBox: '0 0 16 14',
  defaultWidth: 18,
  defaultHeight: 18,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12.6713H13.25M7.75 9.67129V13.1713M14.4396 10.5826C10.0673 9.33339 5.43265 9.33339 1.0604 10.5826C0.904846 10.627 0.75 10.5102 0.75 10.3485L0.75 0.994109C0.75 0.83233 0.904846 0.715529 1.0604 0.759974C5.43265 2.00919 10.0673 2.00919 14.4396 0.759974C14.5952 0.71553 14.75 0.832331 14.75 0.99411V10.3485C14.75 10.5102 14.5952 10.627 14.4396 10.5826Z"
    />
  ),
})
