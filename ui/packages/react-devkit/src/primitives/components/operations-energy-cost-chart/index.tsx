import { useMemo } from 'react'

import { ChartContainer } from '../chart-container'
import { DoughnutChart } from '../doughnut-chart'
import type { OperationsEnergyCostChartProps } from './types'
import {
  buildOperationsEnergyCostSlices,
  buildOperationsEnergyCostTooltip,
  hasOperationsEnergyCostData,
} from './utils'
import { CONFIG, DEFAULT } from './constants'

export type { OperationsEnergyCostChartData, OperationsEnergyCostChartProps } from './types'

export {
  buildOperationsEnergyCostSlices,
  buildOperationsEnergyCostTooltip,
  hasOperationsEnergyCostData,
} from './utils'

/**
 * Doughnut breakdown of Operations vs Energy cost (USD per MWh).
 * Wraps `ChartContainer` and `DoughnutChart`; pass `operationalCostsUSD` and
 * `energyCostsUSD` via `data`.
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 *
 * @example
 * ```tsx
 * <OperationsEnergyCostChart
 *   data={{ operationalCostsUSD: 1000, energyCostsUSD: 500 }}
 * />
 * ```
 */
export const OperationsEnergyCostChart = ({
  data,
  className,
  emptyMessage,
  isLoading = false,
  unit = DEFAULT.unit,
  title = DEFAULT.title,
  height = DEFAULT.height,
}: OperationsEnergyCostChartProps) => {
  const slices = useMemo(
    () =>
      buildOperationsEnergyCostSlices({
        operationalCostsUSD: data?.operationalCostsUSD,
        energyCostsUSD: data?.energyCostsUSD,
      }),
    [data?.operationalCostsUSD, data?.energyCostsUSD],
  )

  const empty = !isLoading && !hasOperationsEnergyCostData(data)
  const tooltip = useMemo(() => buildOperationsEnergyCostTooltip(unit), [unit])

  const header = (
    <div className="mdk-operations-energy-cost-chart__header">
      <h3 className="mdk-operations-energy-cost-chart__title">{title}</h3>
      {unit ? <span className="mdk-operations-energy-cost-chart__unit">{unit}</span> : null}
    </div>
  )

  return (
    <ChartContainer
      empty={empty}
      header={header}
      loading={isLoading}
      className={className}
      emptyMessage={emptyMessage}
    >
      {!empty && (
        <DoughnutChart
          unit={unit}
          data={slices}
          height={height}
          tooltip={tooltip}
          cutout={CONFIG.cutout}
          legendPosition="bottom"
          borderWidth={CONFIG.borderWidth}
          formatValue={(value) => value.toFixed(2)}
        />
      )}
    </ChartContainer>
  )
}
