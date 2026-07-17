import {
  BarChart,
  ChartContainer,
  CURRENCY,
  CurrencyToggler,
  formatNumber,
  type IChartApi,
  type LegendItem,
  LineChart,
  UNITS,
} from '@primitives'
import type { ReactElement } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'

import _map from 'lodash/map'
import { getHashrateUnit } from '../../../../../utils/device-utils'
import { MetricCard } from '../../../metric-card'
import {
  HASH_BALANCE_BAR_CHART_HEIGHT,
  HASH_BALANCE_COLORS,
  HASH_BALANCE_LINE_CHART_HEIGHT,
  hashBalanceBarChartScalesXY,
  hashBalancePhDayTooltip,
  NETWORK_HASHRATE_LINE_LABEL,
} from './hash-balance.constants'
import { formatHashBalanceValue, getHashBalancePerPhDayUnit } from './hash-balance-format.utils'
import type { HashBalanceCurrency, HashBalanceRevenuePanelProps } from './hash-balance.types'
import { useHashBalance } from './use-hash-balance'

/**
 * Revenue tab panel for hash balance — site hash revenue, network hashrate,
 * hashprice charts, and currency toggle for per-PH/day units.
 *
 * @category dashboards
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const HashBalanceRevenuePanel = ({
  data,
  log,
  dateRange,
  currency,
  onCurrencyChange,
  isLoading = false,
  timeframeType = null,
}: HashBalanceRevenuePanelProps): ReactElement => {
  const chartRef = useRef<IChartApi | null>(null)
  const {
    revenueMetrics,
    siteHashRevenueChartData,
    networkHashpriceChartData,
    networkHashrateLineData,
    isEmpty,
    isNetworkHashrateEmpty,
  } = useHashBalance({ data, log, dateRange, currency, timeframeType })

  const unitCaption = getHashBalancePerPhDayUnit(currency)

  const siteChartHeader = useMemo(
    () => (
      <div className="mdk-hash-balance__chart-header">
        <div className="mdk-hash-balance__chart-header-text">
          <h2 className="mdk-hash-balance__chart-title">Site Hash Revenue</h2>
          <span className="mdk-hash-balance__chart-unit">{unitCaption}</span>
        </div>
        <CurrencyToggler
          value={currency}
          currencies={[CURRENCY.USD_LABEL, CURRENCY.BTC_LABEL]}
          onChange={(next) => onCurrencyChange(next as HashBalanceCurrency)}
        />
      </div>
    ),
    [currency, onCurrencyChange, unitCaption],
  )

  const phDayTooltip = hashBalancePhDayTooltip(currency)
  const formatAxisValue = (v: number) => formatHashBalanceValue(v, currency, { forAxis: true })

  const [networkHashrateLegendHidden, setNetworkHashrateLegendHidden] = useState(false)

  const networkHashrateLegend = useMemo(
    (): LegendItem[] => [
      {
        label: NETWORK_HASHRATE_LINE_LABEL,
        color: HASH_BALANCE_COLORS.networkHashrateLine,
        hidden: networkHashrateLegendHidden,
      },
    ],
    [networkHashrateLegendHidden],
  )

  const networkHashrateChartData = useMemo(
    () => ({
      datasets: networkHashrateLineData.datasets.map((dataset) => ({
        ...dataset,
        visible: !networkHashrateLegendHidden,
      })),
    }),
    [networkHashrateLineData, networkHashrateLegendHidden],
  )

  const handleNetworkHashrateLegendToggle = useCallback((index: number) => {
    if (networkHashrateLegend[index]?.label !== NETWORK_HASHRATE_LINE_LABEL) return
    setNetworkHashrateLegendHidden((prev) => !prev)
  }, [networkHashrateLegend])

  return (
    <div className="mdk-hash-balance__revenue">
      <section className="mdk-hash-balance__panel mdk-hash-balance__panel--primary">
        <ChartContainer
          header={siteChartHeader}
          loading={isLoading}
          empty={!isLoading && isEmpty}
          emptyMessage="No hash revenue data available for the selected period."
        >
          <BarChart
            showLegend
            legendAlign="start"
            legendPosition="bottom"
            tooltip={phDayTooltip}
            formatYLabel={formatAxisValue}
            data={siteHashRevenueChartData}
            height={HASH_BALANCE_BAR_CHART_HEIGHT}
            options={{ scales: hashBalanceBarChartScalesXY }}
            formatDataLabel={(value) => formatHashBalanceValue(value, currency)}
          />
        </ChartContainer>
      </section>

      <div className="mdk-hash-balance__bottom-grid">
        <div className="mdk-hash-balance__network-column">
          <div className="mdk-hash-balance__metrics-row mdk-hash-balance__metrics-row--paired">
            {_map(revenueMetrics, ({ value, unit, label }) => (
              <MetricCard
                key={label}
                unit={unit}
                label={label}
                bgColor={HASH_BALANCE_COLORS.panelBackground}
                className="mdk-hash-balance__metric-card"
                isValueMedium={currency === CURRENCY.BTC_LABEL}
                value={formatHashBalanceValue(value, currency)}
              />
            ))}
          </div>

          <section className="mdk-hash-balance__panel mdk-hash-balance__panel--stretch">
            <h2 className="mdk-hash-balance__chart-title">Network Hashrate</h2>
            <span className="mdk-hash-balance__chart-unit">{UNITS.HASHRATE_EH_S}</span>
            <ChartContainer
              className="mdk-hash-balance__network-hashrate-chart"
              legendData={isNetworkHashrateEmpty ? undefined : networkHashrateLegend}
              onToggleDataset={handleNetworkHashrateLegendToggle}
              loading={isLoading}
              empty={!isLoading && isNetworkHashrateEmpty}
              emptyMessage="No network hashrate data available for the selected period."
            >
              <LineChart
                chartRef={chartRef}
                data={networkHashrateChartData}
                height={HASH_BALANCE_LINE_CHART_HEIGHT}
                yTicksFormatter={(value) => {
                  const { value: formattedValue, unit } = getHashrateUnit(
                    value,
                    0,
                    UNITS.HASHRATE_EH_S,
                  )

                  return `${formatNumber(formattedValue ?? 0, { maximumFractionDigits: 0 })} ${unit}`
                }}
              />
            </ChartContainer>
          </section>
        </div>

        <section className="mdk-hash-balance__panel mdk-hash-balance__panel--stretch">
          <h2 className="mdk-hash-balance__chart-title">Bitcoin Network Hashprice</h2>
          <span className="mdk-hash-balance__chart-unit">{unitCaption}</span>
          <ChartContainer
            loading={isLoading}
            empty={!isLoading && isEmpty}
            emptyMessage="No network hashprice data available for the selected period."
          >
            <BarChart
              showLegend
              legendAlign="start"
              legendPosition="bottom"
              tooltip={phDayTooltip}
              formatYLabel={formatAxisValue}
              data={networkHashpriceChartData}
              height={HASH_BALANCE_LINE_CHART_HEIGHT}
              options={{ scales: hashBalanceBarChartScalesXY }}
              formatDataLabel={(value) => formatHashBalanceValue(value, currency)}
            />
          </ChartContainer>
        </section>
      </div>
    </div>
  )
}
