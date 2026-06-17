import { buildBarChartData } from '../../utils/chart-options'
import type { ChartTooltipConfig } from '../../utils/chart-tooltip'
import { formatNumber } from '../../utils/format'
import { UNITS } from '../../constants/units'
import type { AverageDowntimeChartData } from './types'
import { DEFAULT, SERIES, STACK_ID } from './constants'

const hasRateSeries = (values?: number[]): boolean =>
  values != null && values.length > 0

/**
 * True when the chart has period labels and at least one rate series to render.
 * All-zero rates still count as data (0% downtime is a valid outcome).
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 */
export const hasAverageDowntimeData = (data?: AverageDowntimeChartData): boolean => {
  if (!data?.labels?.length) return false

  return hasRateSeries(data.curtailment) || hasRateSeries(data.operationalIssues)
}

/**
 * Maps downtime rates to stacked bar chart datasets (Curtailment + Op. Issues).
 * Rates are expected as fractions (0–1), matching mining report builders.
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 */
export const buildAverageDowntimeBarChartData = (
  data: AverageDowntimeChartData | undefined,
  barWidth = DEFAULT.barWidth,
) => {
  const labels = data?.labels ?? []

  return buildBarChartData({
    labels,
    barWidth,
    series: [
      {
        label: SERIES.curtailment.label,
        values: data?.curtailment ?? [],
        color: SERIES.curtailment.color,
        stack: STACK_ID,
      },
      {
        label: SERIES.operationalIssues.label,
        values: data?.operationalIssues ?? [],
        color: SERIES.operationalIssues.color,
        stack: STACK_ID,
      },
    ],
  })
}

/**
 * Default Y-axis, tooltip, and data-label formatter (fraction 0–1 → display percent).
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 */
export const defaultAverageDowntimeRateFormatter = (value: number): string =>
  formatNumber(value * 100)

/**
 * Tooltip formatter for stacked downtime rate bars (percentage).
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 */
export const buildAverageDowntimeTooltip = (
  formatRate: (value: number) => string = defaultAverageDowntimeRateFormatter,
): ChartTooltipConfig => ({
  valueFormatter: (value) => `${formatRate(Number(value))}${UNITS.PERCENT}`,
})
