import type { DateRange } from '@core'
import {
  BarChart,
  Button,
  ChartContainer,
  DateRangePicker,
  formatValueUnit,
  MultiSelect,
  UNITS,
} from '@core'
import { endOfDay } from 'date-fns/endOfDay'
import { startOfDay } from 'date-fns/startOfDay'
import { useMemo, useState } from 'react'

import { toBarChartData } from '../../../../utils/to-bar-chart-data'
import { HASHRATE_BAR_WIDTH, HASHRATE_CHART_HEIGHT } from '../../hashrate-chart-shared'
import type { HashrateDateRange } from '../../hashrate.constants'
import { getMinerTypeOptionsFromLog, transformToMinerTypeBarData } from '../../hashrate-utils'
import type { HashrateGroupedLog } from '../../hashrate.types'
import './miner-type-view.scss'

export type HashrateMinerTypeViewProps = {
  /** Hashrate log grouped by miner type (groupBy=miner). */
  log?: HashrateGroupedLog
  isLoading?: boolean
  dateRange?: HashrateDateRange
  onDateRangeChange?: (range: HashrateDateRange) => void
  onReset?: VoidFunction
}

const toDateRange = (range: HashrateDateRange): DateRange => ({
  from: new Date(range.start),
  to: new Date(range.end),
})

/**
 * Hashrate drilldown grouped by miner model - bar chart of the latest
 * hashrate per miner type, with an optional multi-select filter.
 *
 * @category charts
 * @domain mining-operations
 * @orkCapability hashrate-monitoring
 * @tier agent-ready
 */
export const HashrateMinerTypeView = ({
  log = [],
  isLoading = false,
  dateRange,
  onDateRangeChange,
  onReset,
}: HashrateMinerTypeViewProps) => {
  const [selectedMinerTypes, setSelectedMinerTypes] = useState<string[]>([])

  const minerTypeOptions = useMemo(() => getMinerTypeOptionsFromLog(log), [log])

  const chartData = useMemo(() => {
    const barData = transformToMinerTypeBarData(log, selectedMinerTypes)
    return toBarChartData({
      labels: barData.labels,
      barWidth: HASHRATE_BAR_WIDTH,
      series: barData.series,
    })
  }, [log, selectedMinerTypes])

  const handleRangeSelect = (selected: DateRange | undefined) => {
    if (!selected?.from || !onDateRangeChange) return
    onDateRangeChange({
      start: startOfDay(selected.from).getTime(),
      end: endOfDay(selected.to ?? selected.from).getTime(),
    })
  }

  return (
    <div className="mdk-hashrate-miner-type-view">
      <div className="mdk-hashrate-miner-type-view__header">
        <span className="mdk-hashrate-miner-type-view__title">Hashrate by Miner Type</span>
      </div>
      <div className="mdk-hashrate-miner-type-view__controls">
        <MultiSelect
          options={minerTypeOptions}
          value={selectedMinerTypes}
          onValueChange={setSelectedMinerTypes}
          placeholder="Miner Type"
          size="md"
        />
        <DateRangePicker
          selected={dateRange ? toDateRange(dateRange) : undefined}
          onSelect={handleRangeSelect}
        />
        {onReset && (
          <Button variant="secondary" onClick={onReset}>
            Reset
          </Button>
        )}
      </div>
      <ChartContainer loading={isLoading} empty={!isLoading && chartData.isEmpty}>
        <BarChart
          data={chartData}
          showDataLabels
          showLegend={false}
          formatYLabel={(value) => formatValueUnit(value, UNITS.HASHRATE_TH_S)}
          height={HASHRATE_CHART_HEIGHT}
        />
      </ChartContainer>
    </div>
  )
}
