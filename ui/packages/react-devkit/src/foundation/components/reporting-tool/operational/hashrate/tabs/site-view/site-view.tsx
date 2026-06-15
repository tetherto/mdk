import type { DateRange, IChartApi, LineChartData } from '@core'
import { Button, ChartContainer, DateRangePicker, LineChart, MultiSelect, UNITS } from '@core'
import { endOfDay } from 'date-fns/endOfDay'
import { startOfDay } from 'date-fns/startOfDay'
import { useMemo, useRef, useState } from 'react'

import { SITE_HASHRATE_COLOR } from '../../hashrate-chart-shared'
import type { HashrateDateRange } from '../../hashrate.constants'
import { getMinerTypeOptionsFromLog, transformToSiteViewData } from '../../hashrate-utils'
import type { HashrateGroupedLog } from '../../hashrate.types'
import './site-view.scss'

export type HashrateSiteViewProps = {
  /** Hashrate log grouped by miner type. */
  log?: HashrateGroupedLog
  /** Loading state - drives the chart spinner. */
  isLoading?: boolean
  /** Selected date range used by the host to drive the query. */
  dateRange?: HashrateDateRange
  /** Fires when the user picks a new range from the DateRangePicker. */
  onDateRangeChange?: (range: HashrateDateRange) => void
  /** Optional reset handler shown as a "Reset" button next to the date picker. */
  onReset?: VoidFunction
}

const toDateRange = (range: HashrateDateRange): DateRange => ({
  from: new Date(range.start),
  to: new Date(range.end),
})

/**
 * Site-level hashrate trend - aggregates hashrate across the whole site for
 * the selected date range, with an optional miner-type filter that scopes the
 * sum to a subset.
 *
 * @category charts
 * @domain mining-operations
 * @orkCapability hashrate-monitoring
 * @tier agent-ready
 */
export const HashrateSiteView = ({
  log = [],
  isLoading = false,
  dateRange,
  onDateRangeChange,
  onReset,
}: HashrateSiteViewProps) => {
  const chartRef = useRef<IChartApi | null>(null)
  const [selectedMinerTypes, setSelectedMinerTypes] = useState<string[]>([])

  const minerTypeOptions = useMemo(() => getMinerTypeOptionsFromLog(log), [log])

  const lineChartData = useMemo((): LineChartData => {
    const result = transformToSiteViewData(log, selectedMinerTypes)
    const series = result.series[0]
    if (!series) return { datasets: [] }
    return {
      datasets: [
        {
          label: series.label,
          borderColor: series.color ?? SITE_HASHRATE_COLOR,
          data: series.points.map((p) => ({ x: new Date(p.ts).getTime(), y: p.value })),
        },
      ],
    }
  }, [log, selectedMinerTypes])

  const isEmpty =
    lineChartData.datasets.length === 0 || lineChartData.datasets[0]?.data.length === 0

  const handleRangeSelect = (selected: DateRange | undefined) => {
    if (!selected?.from || !onDateRangeChange) return
    onDateRangeChange({
      start: startOfDay(selected.from).getTime(),
      end: endOfDay(selected.to ?? selected.from).getTime(),
    })
  }

  return (
    <div className="mdk-hashrate-site-view">
      <div className="mdk-hashrate-site-view__controls">
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
      <ChartContainer loading={isLoading} empty={!isLoading && isEmpty}>
        <LineChart
          chartRef={chartRef}
          data={lineChartData}
          unit={UNITS.HASHRATE_TH_S}
          yTicksFormatter={(value) => value.toFixed(2)}
        />
      </ChartContainer>
    </div>
  )
}
