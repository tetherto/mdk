import { BarChart, CHART_COLORS, ChartContainer, type ChartTooltipConfig, formatValueUnit, UNITS } from '@primitives'
import { useEffect, useMemo, useRef } from 'react'
import {
  ReportTimeFrameSelector,
  useReportTimeFrameSelectorState,
} from '../../../report-time-frame-selector'
import type { ToBarChartDataInput } from '../../../utils/to-bar-chart-data'
import { toBarChartData } from '../../../utils/to-bar-chart-data'
import { useSingleSeriesBarLegend } from '../../../utils/use-single-series-bar-legend'
import './efficiency-bar-view.scss'

const efficiencyBarChartTooltip: ChartTooltipConfig = {
  valueFormatter: (value) => formatValueUnit(value, UNITS.EFFICIENCY_W_PER_TH_S),
}

export type EfficiencyBarViewProps = {
  title: string
  chartInput?: ToBarChartDataInput
  isEmpty?: boolean
  isLoading?: boolean
  onTimeFrameChange?: (start: Date, end: Date) => void
}

export const EfficiencyBarView = ({
  title,
  chartInput = { series: [] },
  isEmpty = false,
  isLoading = false,
  onTimeFrameChange,
}: EfficiencyBarViewProps) => {
  const { presetTimeFrame, dateRange, setPresetTimeFrame, setDateRange, start, end } =
    useReportTimeFrameSelectorState()

  const legendSeriesLabel = chartInput.series?.[0]?.label ?? title
  const { legendData, handleToggleDataset, isSeriesHidden } = useSingleSeriesBarLegend({
    seriesLabel: legendSeriesLabel,
    color: CHART_COLORS.blue,
  })

  const chartData = useMemo(() => {
    const base = toBarChartData(chartInput)
    return {
      ...base,
      datasets: base.datasets.map((dataset) => ({ ...dataset, hidden: isSeriesHidden })),
    }
  }, [chartInput, isSeriesHidden])

  const isChartEmpty = isEmpty || chartData.isEmpty
  const startMs = start.getTime()
  const endMs = end.getTime()

  const callbackRef = useRef(onTimeFrameChange)
  useEffect(() => {
    callbackRef.current = onTimeFrameChange
  })

  useEffect(() => {
    callbackRef.current?.(start, end)
  }, [startMs, endMs])

  return (
    <div className="mdk-efficiency-bar-view">
      <div className="mdk-efficiency-bar-view__header">
        <span className="mdk-efficiency-bar-view__title">{title}</span>
        <ReportTimeFrameSelector
          presetTimeFrame={presetTimeFrame}
          dateRange={dateRange}
          setPresetTimeFrame={setPresetTimeFrame}
          setDateRange={setDateRange}
        />
      </div>
      <section className="mdk-efficiency-bar-view__panel">
        <ChartContainer
          className="mdk-efficiency-bar-view__chart"
          legendData={isChartEmpty ? undefined : legendData}
          onToggleDataset={handleToggleDataset}
          loading={isLoading}
          empty={!isLoading && isChartEmpty}
        >
          <BarChart
            data={chartData}
            showDataLabels
            showLegend={false}
            tooltip={efficiencyBarChartTooltip}
            formatYLabel={(value) => formatValueUnit(value, UNITS.EFFICIENCY_W_PER_TH_S)}
            height={320}
          />
        </ChartContainer>
      </section>
    </div>
  )
}
