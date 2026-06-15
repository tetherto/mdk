import { createIcon } from './create-icon'

export const UserAvatarIcon = createIcon({
  displayName: 'UserAvatarIcon',
  viewBox: '0 0 16 16',
  defaultWidth: 16,
  defaultHeight: 16,
  path: ({ color }) => (
    <path
      d="M4 13.5V12.9999C4 11.343 5.34315 10 7 10H9C10.6569 10 12 11.343 12 12.9999V13.5M8 4C6.89543 4 6 4.89543 6 6C6 7.10457 6.89543 8 8 8C9.10457 8 10 7.10457 10 6C10 4.89543 9.10457 4 8 4ZM8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
})
