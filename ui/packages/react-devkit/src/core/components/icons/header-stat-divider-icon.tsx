import { createIcon } from './create-icon'

/**
 * Angled chevron divider rendered between cells of `<HeaderStatsBar>`.
 *
 * The path matches the Mining OS reference (Moria `HeaderRightBorder`).
 * Stroke colour resolves from `color` (defaults to `currentColor`), so
 * consumers can theme it via the surrounding text colour. Internal —
 * HeaderStatsBar wires it in automatically; consumers shouldn't pick
 * this directly.
 *
 * @category misc
 * @domain generic
 * @tier internal
 */
export const HeaderStatDividerIcon = createIcon({
  displayName: 'HeaderStatDividerIcon',
  viewBox: '0 0 26 70',
  defaultWidth: 26,
  defaultHeight: 70,
  path: ({ color }) => (
    <path
      d="M25 -1L13.2929 10.7071C13.1054 10.8946 13 11.149 13 11.4142V58.5858C13 58.851 12.8946 59.1054 12.7071 59.2929L0.5 75"
      stroke={color}
      strokeWidth="0.5"
      strokeLinecap="round"
      fill="none"
    />
  ),
})
