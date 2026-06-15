import { Mosaic, Spinner } from '@core'
import type { ReactElement } from 'react'

import { AvgAllInCostChart } from './avg-all-in-cost-chart'
import { CostMetrics } from './cost-metrics'
import type { CostContentProps } from './cost.types'
import { OperationsEnergyChart } from './operations-energy-chart'
import { ProductionCostChart } from './production-cost-chart'

const MOSAIC_TEMPLATE = [
  ['production-cost', 'avg-all-in-cost'],
  ['ops-energy', 'metrics'],
]

/**
 * Renders the data-driven portion of the Cost page in a 2x2 Mosaic grid:
 *
 * - (1,1) Production Cost / Price
 * - (1,2) Avg All-in Cost
 * - (2,1) Operations vs Energy Cost
 * - (2,2) Headline metric tiles (stacked)
 *
 * Exported alongside `Cost` so consumers who want to embed the cost rendering
 * inside their own page chrome (custom header, layout, navigation) can mount
 * `CostContent` directly without the default title / "Set Monthly Cost" link.
 *
 * @category dashboards
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const CostContent = ({
  metrics,
  costLog,
  btcPriceLog,
  totals,
  dateRange,
  avgAllInCostData,
  isLoading = false,
  error,
}: CostContentProps): ReactElement => (
  <div className="mdk-cost__content">
    {isLoading && (
      <div className="mdk-cost__loading" aria-busy="true" aria-live="polite">
        <Spinner color="secondary" size="lg" />
      </div>
    )}

    {Boolean(error) && (
      <div className="mdk-cost__error" role="alert">
        Error loading cost data. Please try again later.
      </div>
    )}

    <Mosaic template={MOSAIC_TEMPLATE} gap="16px" className="mdk-cost__grid">
      <Mosaic.Item area="production-cost">
        <ProductionCostChart
          costLog={costLog}
          btcPriceLog={btcPriceLog}
          dateRange={dateRange}
          isLoading={isLoading}
        />
      </Mosaic.Item>
      <Mosaic.Item area="avg-all-in-cost">
        <AvgAllInCostChart data={avgAllInCostData} dateRange={dateRange} isLoading={isLoading} />
      </Mosaic.Item>
      <Mosaic.Item area="ops-energy">
        <OperationsEnergyChart totals={totals} isLoading={isLoading} />
      </Mosaic.Item>
      <Mosaic.Item area="metrics">{metrics && <CostMetrics metrics={metrics} />}</Mosaic.Item>
    </Mosaic>
  </div>
)
