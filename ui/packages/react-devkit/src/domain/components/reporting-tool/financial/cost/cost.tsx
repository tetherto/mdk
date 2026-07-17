import type { ReactElement } from 'react'

import { CostContent } from './cost-content'
import type { CostProps } from './cost.types'
import './cost.scss'

/**
 * Cost Summary - composite reporting page (single-site).
 *
 * Reads cost-summary view model fields (from `useCostSummary`) and renders:
 * - page header with "Cost Summary" title and an optional action slot
 *   (`setCostAction`) pinned to the opposite edge
 * - period selector slot (`controls`) - pass `<TimeframeControls>` for the
 *   OSS-style Year/Month picker or any other date selector element
 * - shared `CostContent` 2x2 grid (charts + metric tiles)
 *
 * Multi-site is intentionally out of scope for this extraction wave.
 *
 * @category dashboards
 * @domain financial-reporting
 * @kernelCapability energy-consumption
 * @tier agent-ready
 */
export const Cost = ({
  metrics,
  costLog,
  btcPriceLog,
  totals,
  dateRange,
  avgAllInCostData,
  controls,
  isLoading,
  error,
  setCostAction,
}: CostProps): ReactElement => (
  <div className="mdk-cost">
    <header className="mdk-cost__header">
      <h1 className="mdk-cost__page-title">Cost Summary</h1>
      {setCostAction}
    </header>

    <div className="mdk-cost__controls">{controls}</div>

    <CostContent
      metrics={metrics}
      costLog={costLog}
      btcPriceLog={btcPriceLog}
      totals={totals}
      dateRange={dateRange}
      avgAllInCostData={avgAllInCostData}
      isLoading={isLoading}
      error={error}
    />
  </div>
)
