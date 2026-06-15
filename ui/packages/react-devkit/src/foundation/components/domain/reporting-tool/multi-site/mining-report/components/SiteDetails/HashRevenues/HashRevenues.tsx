import _map from 'lodash/map'

import { CURRENCY, formatNumber, Mosaic, UNITS } from '@core'

import {
  type BarChartData,
  formatDataLabel,
  type LineChartData,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import type { MetricCardData } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'
import { ReportBarChart } from '../../../report-charts/report-bar-chart'
import { ReportLineChart } from '../../../report-charts/report-line-chart'
import { ReportMetricCard } from '../../../report-metric-card/report-metric-card'

type HashRevenuesProps = {
  timeframeType?: string
  siteHashUSD?: BarChartData
  siteHashBTC?: BarChartData
  networkHashrate?: LineChartData
  networkHashprice?: BarChartData
  hashMetrics?: MetricCardData[]
}

const fmtSats = (rawValue: number) => {
  const isUnitKilos = rawValue >= 1_000
  const value = isUnitKilos ? rawValue / 1_000 : rawValue
  return `${formatDataLabel(value)}${isUnitKilos ? 'k' : ''}`
}

const HashRevenues = ({
  timeframeType,
  siteHashUSD,
  siteHashBTC,
  networkHashrate,
  networkHashprice,
  hashMetrics,
}: HashRevenuesProps) => (
  <Mosaic
    template={['usd-chart btc-chart', 'bottom-left hashprice-chart']}
    gap="24px"
    columns="1fr 1fr"
  >
    <Mosaic.Item area="usd-chart">
      <ReportBarChart
        chartTitle="Site Hash Revenue in USD"
        data={siteHashUSD}
        unit={`${CURRENCY.USD}/${UNITS.HASHRATE_PH_S}/day`}
        yTicksFormatter={(v) => formatNumber(v)}
        isLegendVisible
        showDataLabels
      />
    </Mosaic.Item>

    <Mosaic.Item area="btc-chart">
      <ReportBarChart
        chartTitle="Site Hash Revenue in BTC"
        data={siteHashBTC}
        unit={`${UNITS.SATS}/${UNITS.HASHRATE_PH_S}/day`}
        yTicksFormatter={fmtSats}
        isLegendVisible
      />
    </Mosaic.Item>

    <Mosaic.Item area="bottom-left">
      <Mosaic template={['metrics', 'hashrate']} gap="16px" rowHeight="auto 1fr">
        <Mosaic.Item area="metrics">
          <div className="mdk-mining-report__revenue-metrics-row">
            {_map(hashMetrics, (metric) => (
              <ReportMetricCard
                key={metric.id}
                label={metric.label}
                unit={metric.unit ?? ''}
                value={metric.value}
                isHighlighted={metric.isHighlighted}
                showDashForZero
              />
            ))}
          </div>
        </Mosaic.Item>

        <Mosaic.Item area="hashrate">
          <ReportLineChart
            title="Network Hashrate"
            data={networkHashrate}
            unit={UNITS.HASHRATE_PH_S}
            timeframeType={timeframeType}
          />
        </Mosaic.Item>
      </Mosaic>
    </Mosaic.Item>

    <Mosaic.Item area="hashprice-chart">
      <ReportBarChart
        chartTitle="Bitcoin Network Hashprice"
        data={networkHashprice}
        unit={`${CURRENCY.USD}/${UNITS.HASHRATE_PH_S}/day`}
        yTicksFormatter={(v) => formatNumber(v)}
        isLegendVisible={false}
        showDataLabels
      />
    </Mosaic.Item>
  </Mosaic>
)

export default HashRevenues
