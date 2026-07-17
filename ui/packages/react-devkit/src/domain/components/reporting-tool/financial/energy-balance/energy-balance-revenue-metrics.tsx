import { UNITS } from '@primitives'
import type { ReactElement } from 'react'

import { EnergyMetricCard } from './components/energy-metric-card'
import type { EnergyRevenueMetrics } from './energy-balance.types'

export type EnergyBalanceRevenueMetricsProps = {
  metrics: EnergyRevenueMetrics
}

type RevenueMetricConfig = {
  name: string
  field: keyof EnergyRevenueMetrics
}

const REVENUE_METRIC_CONFIGS: RevenueMetricConfig[] = [
  { name: 'Curtailment Rate', field: 'curtailmentRate' },
  { name: 'Op. Issues Rate', field: 'operationalIssuesRate' },
]

/**
 * Grid of stat cards summarising energy revenue metrics for the selected period.
 *
 * @category charts
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const EnergyBalanceRevenueMetrics = ({
  metrics,
}: EnergyBalanceRevenueMetricsProps): ReactElement => (
  <div className="mdk-energy-balance__revenue-metrics">
    {REVENUE_METRIC_CONFIGS.map(({ name, field }) => (
      <EnergyMetricCard
        key={name}
        name={name}
        value={metrics[field]}
        unit={UNITS.PERCENT}
        fallback="0"
      />
    ))}
  </div>
)
