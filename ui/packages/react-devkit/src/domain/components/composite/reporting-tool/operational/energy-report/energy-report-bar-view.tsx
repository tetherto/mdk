import { BarChart, ChartContainer } from '@primitives'
import { useEffect, useMemo, useRef } from 'react'

import {
  ReportTimeFrameSelector,
  useReportTimeFrameSelectorState,
} from '../../../../reporting-tool/report-time-frame-selector'
import { toBarChartData } from '../../../../reporting-tool/utils/to-bar-chart-data'
import { ENERGY_REPORT_BAR_EMPTY_MESSAGE, ENERGY_REPORT_BAR_WIDTH } from './energy-report.constants'
import {
  ENERGY_REPORT_MINER_CHART_HEIGHT,
  energyReportBarChartScales,
  energyReportPowerTooltip,
  formatEnergyReportPowerDataLabel,
  formatEnergyReportPowerMw,
} from './energy-report-chart.constants'
import type { EnergyReportBarViewProps } from './energy-report.types'
import './energy-report-bar-view.scss'

export type { EnergyReportBarViewProps } from './energy-report.types'

export const EnergyReportBarView = ({
  title,
  isEmpty = false,
  onTimeFrameChange,
  isLoading = false,
  chartInput = { series: [] },
}: EnergyReportBarViewProps) => {
  const { presetTimeFrame, dateRange, setPresetTimeFrame, setDateRange, start, end } =
    useReportTimeFrameSelectorState()
  const chartData = useMemo(
    () =>
      toBarChartData({
        ...chartInput,
        barWidth: chartInput.barWidth ?? ENERGY_REPORT_BAR_WIDTH,
      }),
    [chartInput],
  )
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
    <div className="mdk-energy-report-bar-view">
      <div className="mdk-energy-report-bar-view__controls">
        <ReportTimeFrameSelector
          presetTimeFrame={presetTimeFrame}
          dateRange={dateRange}
          setPresetTimeFrame={setPresetTimeFrame}
          setDateRange={setDateRange}
        />
      </div>
      <section className="mdk-energy-report-bar-view__panel">
        <ChartContainer
          title={title}
          loading={isLoading}
          empty={!isLoading && (isEmpty || chartData.isEmpty)}
          emptyMessage={ENERGY_REPORT_BAR_EMPTY_MESSAGE}
        >
          <BarChart
            data={chartData}
            showDataLabels
            showLegend
            legendAlign="start"
            legendPosition="bottom"
            tooltip={energyReportPowerTooltip}
            formatYLabel={formatEnergyReportPowerMw}
            height={ENERGY_REPORT_MINER_CHART_HEIGHT}
            options={{ scales: energyReportBarChartScales }}
            formatDataLabel={formatEnergyReportPowerDataLabel}
          />
        </ChartContainer>
      </section>
    </div>
  )
}
