import { CURRENCY, UNITS } from '@core'
import type { ReactElement } from 'react'

import { EnergyMetricCard } from './components/energy-metric-card'
import type { EnergyCostMetrics } from './energy-balance.types'

export type EnergyBalanceCostMetricsProps = {
  metrics: EnergyCostMetrics
}

type CostMetricConfig = {
  name: string
  unit: string
  field: keyof EnergyCostMetrics
}

const USD_PER_MWH = `${CURRENCY.USD}/${UNITS.ENERGY_MWH}`

const COST_METRIC_CONFIGS: CostMetricConfig[] = [
  { name: 'Avg Power Consumption', unit: UNITS.ENERGY_MW, field: 'avgPowerConsumption' },
  { name: 'Avg Energy Cost', unit: USD_PER_MWH, field: 'avgEnergyCost' },
  { name: 'Avg All-In Cost', unit: USD_PER_MWH, field: 'avgAllInCost' },
  { name: 'Avg Power Availability', unit: UNITS.ENERGY_MW, field: 'avgPowerAvailability' },
  { name: 'Avg Operations Cost', unit: USD_PER_MWH, field: 'avgOperationsCost' },
  { name: 'Avg Energy Revenue', unit: USD_PER_MWH, field: 'avgEnergyRevenue' },
]

/**
 * Grid of stat cards summarising energy cost metrics for the selected period.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const EnergyBalanceCostMetrics = ({
  metrics,
}: EnergyBalanceCostMetricsProps): ReactElement => (
  <div className="mdk-energy-balance__cost-metrics">
    {COST_METRIC_CONFIGS.map(({ name, unit, field }) => (
      <EnergyMetricCard key={name} name={name} value={metrics[field]} unit={unit} />
    ))}
  </div>
)
