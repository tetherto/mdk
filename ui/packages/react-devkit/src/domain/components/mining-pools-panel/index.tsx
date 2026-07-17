import { cn, Dialog, DialogContent, DialogTrigger, SkeletonBlock } from '@primitives'
import { forwardRef } from 'react'

import { PoolDetailsCard } from '../pool-details-card'
import { formatBtcRevenue, formatHashrate } from './format'
import type { MiningPoolRow, MiningPoolsPanelProps } from './types'

const COLUMN_HEADERS = ['Pool', 'Revenue 24hrs', 'Hash rate'] as const
const DETAILS_DIALOG_TITLE = 'Pool details'

const PoolDetailsButton = ({ row }: { row: MiningPoolRow }) => {
  if (!row.details || row.details.length === 0) return null
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="mdk-mining-pools-panel__details-btn">
          Show details
        </button>
      </DialogTrigger>
      <DialogContent title={DETAILS_DIALOG_TITLE} closable bare>
        <div className="mdk-mining-pools-panel__details-body">
          <PoolDetailsCard details={row.details} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

const PoolRowView = ({
  row,
  onShowDetails,
}: {
  row: MiningPoolRow
  onShowDetails?: (row: MiningPoolRow) => void
}) => {
  const showAction = !!onShowDetails || (row.details && row.details.length > 0)
  return (
    <div className="mdk-mining-pools-panel__row" role="row">
      <span role="cell" className="mdk-mining-pools-panel__cell mdk-mining-pools-panel__cell--name">
        {row.name}
      </span>
      <span role="cell" className="mdk-mining-pools-panel__cell">
        {formatBtcRevenue(row.revenue24hBtc)}
      </span>
      <span role="cell" className="mdk-mining-pools-panel__cell">
        {formatHashrate(row.hashratePhs)}
      </span>
      <span
        role="cell"
        className="mdk-mining-pools-panel__cell mdk-mining-pools-panel__cell--action"
      >
        {!showAction ? null : onShowDetails ? (
          <button
            type="button"
            className="mdk-mining-pools-panel__details-btn"
            onClick={() => onShowDetails(row)}
          >
            Show details
          </button>
        ) : (
          <PoolDetailsButton row={row} />
        )}
      </span>
    </div>
  )
}

/**
 * Dashboard card that lists configured mining pools — one row per pool,
 * with revenue, hash rate, and an optional "Show details" action.
 *
 * Pure presentation: the row data + click handler come from props,
 * shaped upstream by `usePoolRows` (or any caller producing
 * {@link MiningPoolRow}s).
 *
 * @category cards
 * @kernelCapability pool-monitoring
 * @domain mining-operations
 * @tier agent-ready
 *
 * @example
 * ```tsx
 * <MiningPoolsPanel rows={poolRows} onShowDetails={(row) => openPopover(row)} />
 * ```
 */
const MiningPoolsPanel = forwardRef<HTMLDivElement, MiningPoolsPanelProps>(
  (
    {
      className,
      rows = [],
      onShowDetails,
      hideHeader = false,
      skeletonRows = 3,
      isLoading = false,
      label = 'Mining Pools',
      emptyMessage = 'No pools configured',
      ...props
    },
    ref,
  ) => {
    return (
      <div ref={ref} className={cn('mdk-mining-pools-panel', className)} {...props}>
        {!hideHeader && (
          <div className="mdk-mining-pools-panel__header">
            <span className="mdk-mining-pools-panel__label">{label}</span>
          </div>
        )}

        {isLoading ? (
          <div className="mdk-mining-pools-panel__skeleton-container">
            {Array.from({ length: skeletonRows }).map((_, index) => (
              <SkeletonBlock key={index} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="mdk-mining-pools-panel__empty">{emptyMessage}</div>
        ) : (
          <div className="mdk-mining-pools-panel__table" role="table" aria-label={label}>
            <div
              className="mdk-mining-pools-panel__row mdk-mining-pools-panel__row--head"
              role="row"
            >
              {COLUMN_HEADERS.map((header) => (
                <span
                  key={header}
                  role="columnheader"
                  className="mdk-mining-pools-panel__cell mdk-mining-pools-panel__cell--head"
                >
                  {header}
                </span>
              ))}
              <span
                className="mdk-mining-pools-panel__cell mdk-mining-pools-panel__cell--head"
                aria-hidden="true"
              />
            </div>

            {rows.map((row) => (
              <PoolRowView key={row.id} row={row} onShowDetails={onShowDetails} />
            ))}
          </div>
        )}
      </div>
    )
  },
)

MiningPoolsPanel.displayName = 'MiningPoolsPanel'

export { MiningPoolsPanel }
export type { MiningPoolRow, MiningPoolsPanelProps } from './types'
