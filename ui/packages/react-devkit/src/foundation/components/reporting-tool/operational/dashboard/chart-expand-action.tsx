export type ChartExpandActionProps = {
  /** Whether the parent chart is currently expanded to full width. */
  isExpanded: boolean
  /** Toggles the expanded state. */
  onToggle?: VoidFunction
}

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const ExpandGlyph = () => (
  <svg {...ICON_PROPS} aria-hidden="true">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
)

const CompressGlyph = () => (
  <svg {...ICON_PROPS} aria-hidden="true">
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
)

/**
 * Expand / collapse toggle rendered in a dashboard chart card's header.
 * Swaps between a maximize and a minimize glyph based on `isExpanded`.
 *
 * @category charts
 * @domain mining-operations
 * @tier advanced
 */
export const ChartExpandAction = ({ isExpanded, onToggle }: ChartExpandActionProps) => (
  <button
    type="button"
    className="mdk-operational-dashboard__expand"
    aria-label={isExpanded ? 'Collapse chart' : 'Expand chart'}
    aria-pressed={isExpanded}
    onClick={onToggle}
  >
    {isExpanded ? <CompressGlyph /> : <ExpandGlyph />}
  </button>
)
