import type { DateRange } from '@primitives'
import { Button, ChartContainer, DateRangePicker, LineChart, MultiSelect, UNITS } from '@primitives'
import { useMemo, useState } from 'react'

import type { HashrateDateRange } from '../../hashrate.constants'
import { getMinerTypeOptionsFromLog } from '../../hashrate-utils'
import type { HashrateGroupedLog } from '../../hashrate.types'
import { useHashrateSiteView } from './use-hashrate-site-view'
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
 * @kernelCapability hashrate-monitoring
 * @tier agent-ready
 */
export const HashrateSiteView = ({
  log = [],
  isLoading = false,
  dateRange,
  onDateRangeChange,
  onReset,
}: HashrateSiteViewProps) => {
  const [selectedMinerTypes, setSelectedMinerTypes] = useState<string[]>([])

  const minerTypeOptions = useMemo(() => getMinerTypeOptionsFromLog(log), [log])

  const {
    chartRef,
    legendData,
    lineChartData,
    isEmpty,
    handleRangeSelect,
    handleToggleDataset,
  } = useHashrateSiteView({ log, selectedMinerTypes, onDateRangeChange })

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
      <section className="mdk-hashrate-site-view__panel">
        <ChartContainer
          legendData={isEmpty ? undefined : legendData}
          onToggleDataset={handleToggleDataset}
          loading={isLoading}
          empty={!isLoading && isEmpty}
        >
          <LineChart
            chartRef={chartRef}
            data={lineChartData}
            unit={UNITS.HASHRATE_TH_S}
            yTicksFormatter={(value) => value.toFixed(2)}
          />
        </ChartContainer>
      </section>
    </div>
  )
}
