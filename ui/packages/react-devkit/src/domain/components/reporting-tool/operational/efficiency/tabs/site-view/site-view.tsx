import { QuestionMarkCircledIcon } from '@radix-ui/react-icons'
import type { DateRange } from '@primitives'
import { Button, ChartContainer, DateRangePicker, LineChart, SimpleTooltip, UNITS } from '@primitives'
import type { MetricsEfficiencyLogEntry } from '../../../../../../types'
import type { EfficiencyDateRange } from '../../efficiency.constants'
import { useEfficiencySiteView } from './use-efficiency-site-view'
import './site-view.scss'

export type EfficiencySiteViewProps = {
  log?: MetricsEfficiencyLogEntry[]
  avgEfficiency?: number | null
  nominalValue?: number | null
  isLoading?: boolean
  dateRange?: EfficiencyDateRange
  onDateRangeChange?: (range: EfficiencyDateRange) => void
  onReset?: VoidFunction
}

const toDateRange = (range: EfficiencyDateRange): DateRange => ({
  from: new Date(range.start),
  to: new Date(range.end),
})

/**
 * Site-level efficiency view — site-aggregate J/TH, uptime, and capacity utilisation cards.
 *
 * @category tables
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const EfficiencySiteView = ({
  log = [],
  avgEfficiency = null,
  nominalValue = null,
  isLoading = false,
  dateRange,
  onDateRangeChange,
  onReset,
}: EfficiencySiteViewProps) => {
  const { chartRef, legendData, lineChartData, handleRangeSelect, handleToggleDataset } =
    useEfficiencySiteView({ log, nominalValue, onDateRangeChange })

  const chartHeader = (
    <div className="mdk-efficiency-site-view__chart-header">
      <span className="mdk-efficiency-site-view__chart-title">
        Site Efficiency
        <div className="mdk-efficiency-site-view__chart-icon">
          <SimpleTooltip content="This is site efficiency, considering both miners and additional systems (Cooling etc)">
            <QuestionMarkCircledIcon />
          </SimpleTooltip>
        </div>
      </span>
      <span className="mdk-efficiency-site-view__chart-sublabel">Average Efficiency</span>
      {avgEfficiency != null && (
        <div className="mdk-efficiency-site-view__chart-value">
          <span className="mdk-efficiency-site-view__chart-number">{avgEfficiency.toFixed(1)}</span>
          <span className="mdk-efficiency-site-view__chart-unit">
            {UNITS.EFFICIENCY_W_PER_TH_S}
          </span>
        </div>
      )}
    </div>
  )

  return (
    <div className="mdk-efficiency-site-view">
      <div className="mdk-efficiency-site-view__controls">
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
      <ChartContainer
        header={chartHeader}
        legendData={legendData}
        onToggleDataset={handleToggleDataset}
        loading={isLoading}
        empty={!isLoading && log.length === 0}
      >
        <div className="mdk-efficiency-site-view__chart">
          <LineChart
            chartRef={chartRef}
            data={lineChartData}
            yTicksFormatter={(value) => value.toFixed(1)}
          />
        </div>
      </ChartContainer>
    </div>
  )
}
