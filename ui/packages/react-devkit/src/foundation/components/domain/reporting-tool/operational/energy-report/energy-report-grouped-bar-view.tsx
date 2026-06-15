import { useMemo } from 'react'

import type { EnergyReportGroupedBarViewProps, EnergyReportMinerViewSlice } from './energy-report.types'
import { ENERGY_REPORT_BAR_SERIES_LABEL } from './energy-report.constants'
import { EnergyReportBarView } from './energy-report-bar-view'
import { toEnergyReportBarChartInput } from './energy-report-miner.utils'

type EnergyReportGroupedBarViewComponentProps = EnergyReportGroupedBarViewProps & {
  slice: EnergyReportMinerViewSlice
}

export const EnergyReportGroupedBarView = ({
  slice,
  groupedConsumption,
  containers = [],
  isLoading = false,
  onTimeFrameChange,
}: EnergyReportGroupedBarViewComponentProps) => {
  const chartInput = useMemo(
    () => toEnergyReportBarChartInput(groupedConsumption, slice, containers),
    [groupedConsumption, containers, slice],
  )

  const isEmpty = (chartInput.labels ?? []).length === 0

  return (
    <EnergyReportBarView
      title={ENERGY_REPORT_BAR_SERIES_LABEL}
      chartInput={chartInput}
      isEmpty={isEmpty}
      isLoading={isLoading}
      onTimeFrameChange={onTimeFrameChange}
    />
  )
}
