import _map from 'lodash/map'

import { CURRENCY, formatNumber, Mosaic, UNITS } from '@core'

import { ReportMetricCard } from '../../../report-metric-card/report-metric-card'

import type { ReportMetric } from '../site-details.types'
import {
  type BarChartData,
  formatDataLabel,
  type LineChartData,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import { ReportBarChart } from '../../../report-charts/report-bar-chart'
import { ReportLineChart } from '../../../report-charts/report-line-chart'

type EnergyRevenuesProps = {
  timeframeType?: string
  siteRevenueUSD?: BarChartData
  siteRevenueBTC?: BarChartData
  powerSeries?: LineChartData
  avgDowntime?: BarChartData
  avgDowntimeChartTitle?: string
  downtimeMetrics?: ReportMetric[]
}

const EnergyRevenues = ({
  timeframeType,
  siteRevenueUSD,
  siteRevenueBTC,
  powerSeries,
  avgDowntime,
  avgDowntimeChartTitle = 'Average Downtime',
  downtimeMetrics = [],
}: EnergyRevenuesProps) => {
  return (
    <Mosaic
      template={['usd-chart btc-chart', 'bottom-left power-chart']}
      gap="24px"
      columns="1fr 1fr"
    >
      <Mosaic.Item area="usd-chart">
        <ReportBarChart
          chartTitle="Site Energy Revenue in USD"
          data={siteRevenueUSD}
          unit={`${CURRENCY.USD}/${UNITS.ENERGY_MWH}`}
          yTicksFormatter={(v) => formatNumber(v)}
          isLegendVisible
          showDataLabels
        />
      </Mosaic.Item>

      <Mosaic.Item area="btc-chart">
        <ReportBarChart
          chartTitle="Site Energy Revenue in BTC"
          data={siteRevenueBTC}
          unit={`${UNITS.SATS}/${UNITS.ENERGY_MWH}`}
          yTicksFormatter={(v) => formatDataLabel(v / 1_000)}
          isLegendVisible
        />
      </Mosaic.Item>

      <Mosaic.Item area="bottom-left">
        <Mosaic template={['metrics', 'downtime']} gap="16px" rowHeight="auto 1fr">
          <Mosaic.Item area="metrics">
            <div className="mdk-mining-report__revenue-metrics-row">
              {_map(downtimeMetrics, (metric) => (
                <ReportMetricCard
                  key={metric.id}
                  label={metric.label}
                  unit={metric.unit}
                  value={metric.value}
                  isHighlighted={metric.isHighlighted}
                  showDashForZero
                />
              ))}
            </div>
          </Mosaic.Item>

          <Mosaic.Item area="downtime">
            <ReportBarChart
              chartTitle={avgDowntimeChartTitle}
              data={avgDowntime}
              isStacked
              barWidth={38}
              yTicksFormatter={(v) => formatNumber(v * 100)}
              unit={UNITS.PERCENT}
              isLegendVisible
            />
          </Mosaic.Item>
        </Mosaic>
      </Mosaic.Item>

      <Mosaic.Item area="power-chart">
        <ReportLineChart
          title="Power"
          data={powerSeries}
          unit={UNITS.ENERGY_MW}
          timeframeType={timeframeType}
        />
      </Mosaic.Item>
    </Mosaic>
  )
}

export default EnergyRevenues
