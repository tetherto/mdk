import { ChartContainer, DoughnutChart } from '@primitives'
import type { ReactElement } from 'react'
import { useMemo } from 'react'

import type { CostSummaryMonetaryTotals } from './build-cost-summary-view-model'
import {
  COST_DOUGHNUT_HEIGHT,
  operationsEnergyChartUnit,
  operationsEnergyDoughnutTooltip,
} from './cost-chart-shared'
import { buildOperationsEnergySlices } from './operations-energy-chart-slices'

export type OperationsEnergyChartProps = {
  totals: CostSummaryMonetaryTotals | null
  isLoading?: boolean
}

/**
 * Doughnut breakdown of Operations vs Energy cost (in USD totals).
 *
 * Mirrors the OSS `OperationsEnergyCostChart`. Returns the empty-state
 * placeholder when both totals are zero (the OSS chart hides both slices in
 * that case).
 *
 * @category charts
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const OperationsEnergyChart = ({
  totals,
  isLoading = false,
}: OperationsEnergyChartProps): ReactElement => {
  const slices = useMemo(() => buildOperationsEnergySlices(totals), [totals])
  const tooltip = useMemo(() => operationsEnergyDoughnutTooltip(operationsEnergyChartUnit), [])

  return (
    <div className="mdk-cost__chart mdk-cost__chart--doughnut">
      <h2 className="mdk-cost__chart-title">Operations vs Energy Cost</h2>
      <div className="mdk-cost__chart-unit">{operationsEnergyChartUnit}</div>
      <ChartContainer loading={isLoading} empty={!isLoading && slices.length === 0}>
        <DoughnutChart
          data={slices}
          unit={operationsEnergyChartUnit}
          height={COST_DOUGHNUT_HEIGHT}
          tooltip={tooltip}
          formatValue={(value) => value.toFixed(2)}
          legendPosition="bottom"
        />
      </ChartContainer>
    </div>
  )
}
