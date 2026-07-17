import { useMemo } from 'react'

import { BarChart } from '../bar-chart'
import { ChartContainer } from '../chart-container'
import type { AverageDowntimeChartProps } from './types'
import {
  buildAverageDowntimeBarChartData,
  buildAverageDowntimeTooltip,
  defaultAverageDowntimeRateFormatter,
  hasAverageDowntimeData,
} from './utils'
import { standardBarChartScalesXY } from '../../utils/chart-options'
import { DEFAULT } from './constants'

export type { AverageDowntimeChartData, AverageDowntimeChartProps } from './types'

export {
  buildAverageDowntimeBarChartData,
  buildAverageDowntimeTooltip,
  defaultAverageDowntimeRateFormatter,
  hasAverageDowntimeData,
} from './utils'

/**
 * Stacked bar chart of average downtime (curtailment vs operational issues).
 * Wraps `ChartContainer` and `BarChart`; pass period labels and rate arrays via `data`.
 *
 * @category charts
 * @domain generic
 * @tier agent-ready
 *
 * @example
 * ```tsx
 * <AverageDowntimeChart
 *   data={{
 *     labels: ['Jan', 'Feb'],
 *     curtailment: [0.02, 0.01],
 *     operationalIssues: [0.05, 0.04],
 *   }}
 * />
 * ```
 */
export const AverageDowntimeChart = ({
  data,
  className,
  emptyMessage,
  isLoading = false,
  unit = DEFAULT.unit,
  title = DEFAULT.title,
  showDataLabels = false,
  height = DEFAULT.height,
  barWidth = DEFAULT.barWidth,
  yTicksFormatter = defaultAverageDowntimeRateFormatter,
}: AverageDowntimeChartProps) => {
  const chartData = useMemo(
    () => buildAverageDowntimeBarChartData(data, barWidth),
    [barWidth, data],
  )

  const empty = !isLoading && !hasAverageDowntimeData(data)
  const tooltip = useMemo(() => buildAverageDowntimeTooltip(yTicksFormatter), [yTicksFormatter])

  const header = (
    <div className="mdk-average-downtime-chart__header">
      <h3 className="mdk-chart-container__title">{title}</h3>
      {unit ? <span className="mdk-average-downtime-chart__unit">{unit}</span> : null}
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
        <BarChart
          isStacked
          showLegend
          showDataLabels={showDataLabels}
          formatDataLabel={yTicksFormatter}
          data={chartData}
          height={height}
          tooltip={tooltip}
          legendAlign="start"
          legendPosition="bottom"
          formatYLabel={yTicksFormatter}
          options={{ scales: standardBarChartScalesXY }}
        />
      )}
    </ChartContainer>
  )
}
