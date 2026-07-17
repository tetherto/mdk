import { createIcon } from './create-icon'

export const CommentIcon = createIcon({
  displayName: 'CommentIcon',
  viewBox: '0 0 18 18',
  defaultWidth: 18,
  defaultHeight: 18,
  path: ({ color }) => (
    <path
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="m7 12.993 2 2.998 2-2.998h4c.553 0 1-.447 1-1V3C16 2.447 15.553 2 15 2H3c-.553 0-1 .447-1 1v8.993c0 .553.447 1 1 1h4Z"
      clipRule="evenodd"
    />
  ),
})
