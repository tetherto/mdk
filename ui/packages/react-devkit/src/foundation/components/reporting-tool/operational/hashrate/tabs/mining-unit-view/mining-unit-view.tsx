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
import { getMiningUnitOptionsFromLog, transformToMiningUnitBarData } from '../../hashrate-utils'
import type { HashrateGroupedLog } from '../../hashrate.types'
import './mining-unit-view.scss'

export type HashrateMiningUnitViewProps = {
  /** Hashrate log grouped by container / mining unit (groupBy=container). */
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
 * Hashrate drilldown grouped by mining unit / container - bar chart of the
 * latest hashrate per container with an optional multi-select filter. Drops
 * BE-leaked rollup keys (`group-N`, `maintenance`) via the utils layer.
 *
 * @category charts
 * @domain mining-operations
 * @orkCapability hashrate-monitoring
 * @tier agent-ready
 */
export const HashrateMiningUnitView = ({
  log = [],
  isLoading = false,
  dateRange,
  onDateRangeChange,
  onReset,
}: HashrateMiningUnitViewProps) => {
  const [selectedMiningUnits, setSelectedMiningUnits] = useState<string[]>([])

  const miningUnitOptions = useMemo(() => getMiningUnitOptionsFromLog(log), [log])

  const chartData = useMemo(() => {
    const barData = transformToMiningUnitBarData(log, selectedMiningUnits)
    return toBarChartData({
      labels: barData.labels,
      barWidth: HASHRATE_BAR_WIDTH,
      series: barData.series,
    })
  }, [log, selectedMiningUnits])

  const handleRangeSelect = (selected: DateRange | undefined) => {
    if (!selected?.from || !onDateRangeChange) return
    onDateRangeChange({
      start: startOfDay(selected.from).getTime(),
      end: endOfDay(selected.to ?? selected.from).getTime(),
    })
  }

  return (
    <div className="mdk-hashrate-mining-unit-view">
      <div className="mdk-hashrate-mining-unit-view__header">
        <span className="mdk-hashrate-mining-unit-view__title">Hashrate by Mining Unit</span>
      </div>
      <div className="mdk-hashrate-mining-unit-view__controls">
        <MultiSelect
          options={miningUnitOptions}
          value={selectedMiningUnits}
          onValueChange={setSelectedMiningUnits}
          placeholder="Mining Unit"
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
