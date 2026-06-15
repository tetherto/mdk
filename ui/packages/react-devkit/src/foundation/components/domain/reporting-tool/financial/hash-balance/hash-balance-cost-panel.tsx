import { BarChart, ChartContainer, cn, CURRENCY } from '@core'
import type { ReactElement } from 'react'

import _map from 'lodash/map'
import { MetricCard } from '../../../metric-card'
import {
  HASH_BALANCE_BAR_CHART_HEIGHT,
  HASH_BALANCE_COLORS,
  hashBalanceBarChartScalesXY,
  hashBalancePhDayTooltip,
} from './hash-balance.constants'
import { formatHashBalanceValue, getHashBalancePerPhDayUnit } from './hash-balance-format.utils'
import type { HashBalanceCostPanelProps } from './hash-balance.types'
import { useHashBalance } from './use-hash-balance'

/**
 * Cost tab panel for hash balance — metric tiles and combined cost / revenue /
 * network hashprice bar chart for the selected period.
 *
 * @category dashboards
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const HashBalanceCostPanel = ({
  data,
  log,
  dateRange,
  isLoading = false,
  timeframeType = null,
}: HashBalanceCostPanelProps): ReactElement => {
  const {
    costMetrics,
    combinedCostChartData,
    showCombinedCostChart,
    showWeeklyCostDisclaimer,
    isEmpty,
  } = useHashBalance({
    data,
    log,
    dateRange,
    currency: CURRENCY.USD_LABEL,
    timeframeType,
  })

  const unitCaption = getHashBalancePerPhDayUnit(CURRENCY.USD_LABEL)

  if (showWeeklyCostDisclaimer) {
    return <p className="mdk-hash-balance__disclaimer">Cost data is provided on a monthly base</p>
  }

  return (
    <div className="mdk-hash-balance__cost">
      <div className="mdk-hash-balance__metrics-row mdk-hash-balance__metrics-row--three">
        {_map(costMetrics, ({ label, unit, value, isHighlighted }) => (
          <MetricCard
            key={label}
            className={cn(
              'mdk-hash-balance__metric-card',
              isHighlighted && 'mdk-hash-balance__metric-card--highlighted',
            )}
            unit={unit}
            label={label}
            bgColor={HASH_BALANCE_COLORS.panelBackground}
            value={formatHashBalanceValue(value, CURRENCY.USD_LABEL)}
          />
        ))}
      </div>

      {showCombinedCostChart && (
        <section className="mdk-hash-balance__panel mdk-hash-balance__panel--primary">
          <h2 className="mdk-hash-balance__chart-title">Cost / Revenue / Network Hashprice</h2>
          <span className="mdk-hash-balance__chart-unit">{unitCaption}</span>
          <ChartContainer
            loading={isLoading}
            empty={!isLoading && isEmpty}
            emptyMessage="No hash cost data available for the selected period."
          >
            <BarChart
              showLegend
              legendAlign="start"
              legendPosition="bottom"
              data={combinedCostChartData}
              height={HASH_BALANCE_BAR_CHART_HEIGHT}
              options={{ scales: hashBalanceBarChartScalesXY }}
              tooltip={hashBalancePhDayTooltip(CURRENCY.USD_LABEL)}
              formatYLabel={(value) => formatHashBalanceValue(value, CURRENCY.USD_LABEL)}
              formatDataLabel={(value) => formatHashBalanceValue(value, CURRENCY.USD_LABEL)}
            />
          </ChartContainer>
        </section>
      )}
    </div>
  )
}
