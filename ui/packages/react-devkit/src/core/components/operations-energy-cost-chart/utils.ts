import type { ChartTooltipConfig } from '../../utils/chart-tooltip'
import { UNITS } from '../../constants/units'
import type { DoughnutChartDataset } from '../doughnut-chart'
import { formatPercentShare } from '../../utils/number'
import type { OperationsEnergyCostChartData } from './types'
import { CHART_COLORS } from '../../constants/colors'

/**
 * True when at least one cost bucket is non-zero (drives empty state).
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 */
export const hasOperationsEnergyCostData = (data?: OperationsEnergyCostChartData): boolean =>
  Boolean(data?.operationalCostsUSD || data?.energyCostsUSD)

/**
 * Builds doughnut slices for Operations vs Energy cost.
 * Zero buckets are omitted (matches OSS `OperationsEnergyCostChart` helper).
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 */
export const buildOperationsEnergyCostSlices = ({
  operationalCostsUSD,
  energyCostsUSD,
}: OperationsEnergyCostChartData): DoughnutChartDataset[] => {
  const slices: DoughnutChartDataset[] = []

  if (operationalCostsUSD) {
    slices.push({
      label: 'Operations',
      value: operationalCostsUSD,
      color: CHART_COLORS.VIOLET,
    })
  }

  if (energyCostsUSD) {
    slices.push({
      label: 'Energy',
      value: energyCostsUSD,
      color: CHART_COLORS.SKY_BLUE,
    })
  }

  return slices
}

/**
 * HTML tooltip showing value, unit, and share of total.
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 */
export const buildOperationsEnergyCostTooltip = (unit: string): ChartTooltipConfig => ({
  mode: 'nearest',
  intersect: true,
  valueFormatter: (value, { chart }) => {
    const datasetValues = chart.data.datasets[0]?.data
    const total = Array.isArray(datasetValues)
      ? datasetValues.reduce<number>((acc, nextValue) => acc + Number(nextValue), 0)
      : 0
    const numericValue = Number(value)
    const percentage = formatPercentShare(numericValue, total)

    return `${numericValue.toFixed(2)} ${unit} (${percentage}${UNITS.PERCENT})`
  },
})
