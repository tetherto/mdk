import { BarChart, ChartContainer } from '@core'
import { useMemo } from 'react'

import {
  isBarChartEmpty,
  toBarChartData,
} from '@/components/reporting-tool/utils/to-bar-chart-data'

import type { BarChartData } from '../lib/chart-builders'
import {
  miningReportBarChartScales,
  miningReportBarChartTooltip,
} from './mining-report-chart.constants'
import { miningBarChartToInput } from './report-bar-chart.utils'

export type ReportBarChartProps = {
  chartTitle?: string
  data?: BarChartData
  unit?: string
  isStacked?: boolean
  barWidth?: number
  isLegendVisible?: boolean
  showDataLabels?: boolean
  displayColors?: boolean
  yTicksFormatter?: (value: number) => string
  yRightTicksFormatter?: (value: number) => string
  isHorizontal?: boolean
  timeframeType?: string | null
  noBackgroundColor?: boolean
}

export const ReportBarChart = ({
  chartTitle,
  data,
  unit,
  isStacked = false,
  barWidth,
  isLegendVisible = true,
  showDataLabels = false,
  yTicksFormatter = (v) => String(v),
}: ReportBarChartProps) => {
  const chartData = useMemo(() => {
    if (!data?.series?.length) {
      return { labels: [], datasets: [], isEmpty: true }
    }
    const input = miningBarChartToInput(data, barWidth)
    const seriesWithLabels = data.series.map((s, i) => ({
      ...input.series[i]!,
      dataLabels: s.datalabels
        ? {
            display: s.datalabels.display,
            formatter: s.datalabels.formatter,
          }
        : undefined,
    }))
    return toBarChartData({ ...input, series: seriesWithLabels })
  }, [data, barWidth])

  const empty = !data || isBarChartEmpty({ series: data.series ?? [] })

  const titleWithUnit = chartTitle && unit ? `${chartTitle} (${unit})` : chartTitle

  const formatTooltipValue = useMemo(
    () => (value: number) => {
      const formatted = yTicksFormatter(value)
      if (unit && !formatted.includes(unit)) {
        return `${formatted} ${unit}`.trim()
      }
      return formatted
    },
    [yTicksFormatter, unit],
  )

  const tooltip = useMemo(
    () => miningReportBarChartTooltip(formatTooltipValue),
    [formatTooltipValue],
  )

  return (
    <section className="mdk-mining-report__chart-panel">
      <div className="mdk-mining-report-chart">
        <ChartContainer title={titleWithUnit} empty={empty}>
          {!empty && (
            <BarChart
              data={chartData}
              isStacked={isStacked}
              showLegend={isLegendVisible}
              legendPosition="bottom"
              legendAlign="start"
              showDataLabels={showDataLabels}
              formatYLabel={yTicksFormatter}
              formatDataLabel={showDataLabels ? formatTooltipValue : undefined}
              tooltip={tooltip}
              height={280}
              options={{ scales: miningReportBarChartScales }}
            />
          )}
        </ChartContainer>
      </div>
    </section>
  )
}

export default ReportBarChart
