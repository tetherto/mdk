import { BarChart, ChartContainer, formatValueUnit, UNITS } from '@core'
import { useEffect, useMemo, useRef } from 'react'
import {
  ReportTimeFrameSelector,
  useReportTimeFrameSelectorState,
} from '../../../report-time-frame-selector'
import type { ToBarChartDataInput } from '../../../utils/to-bar-chart-data'
import { toBarChartData } from '../../../utils/to-bar-chart-data'
import './efficiency-bar-view.scss'

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
  const chartData = useMemo(() => toBarChartData(chartInput), [chartInput])
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
      <ChartContainer loading={isLoading} empty={!isLoading && (isEmpty || chartData.isEmpty)}>
        <BarChart
          data={chartData}
          showDataLabels
          showLegend={false}
          formatYLabel={(value) => formatValueUnit(value, UNITS.EFFICIENCY_W_PER_TH_S)}
          height={320}
        />
      </ChartContainer>
    </div>
  )
}
