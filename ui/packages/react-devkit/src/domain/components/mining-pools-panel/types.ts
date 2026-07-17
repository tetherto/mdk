import type { PoolDetailItem } from '../pool-details-card'

/**
 * Display contract for one row of the `<MiningPoolsPanel />` table.
 * Adapter hooks (e.g. `usePoolRows`) shape their output to fit this
 * type; consumers can also build rows by hand for fixtures or demos.
 *
 * @category cards
 */
export type MiningPoolRow = {
  /** Stable React key. */
  id: string
  /** Display name (e.g. `minerpool-f2pool-shelf-0`). */
  name: string
  /** 24h revenue in BTC; rendered as `0.00 BTC` when undefined. */
  revenue24hBtc?: number
  /** Hashrate in PH/s — used for display (TH/s shown automatically below 1 PH/s). */
  hashratePhs?: number
  /** Key/value details rendered inside the "Show details" popover. */
  details?: PoolDetailItem[]
}

export type MiningPoolsPanelProps = Partial<{
  /** Override the card title — defaults to `Mining Pools`. */
  label: string
  /** Hide the title row entirely. */
  hideHeader: boolean
  /** Loading state — renders skeleton rows. */
  isLoading: boolean
  /** Number of skeleton rows to show while loading. */
  skeletonRows: number
  /** Message shown when `rows` is empty. */
  emptyMessage: string
  /** Pool rows, in display order. */
  rows: MiningPoolRow[]
  /** Called when the user clicks the per-row "Show details" button. */
  onShowDetails: (row: MiningPoolRow) => void
  /** Extra className for the root. */
  className: string
}>
