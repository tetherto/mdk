import _map from 'lodash/map'

import { CURRENCY, Mosaic, UNITS } from '@core'

import type { LineChartData } from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import type { MetricCardData } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'
import { ReportLineChart } from '../../../report-charts/report-line-chart'
import { ReportMetricCard } from '../../../report-metric-card/report-metric-card'

type DailyHashratesProps = {
  timeframeType?: string
  hashpriceChart?: LineChartData
  dailyHashrateChart?: LineChartData
  metrics?: MetricCardData[]
}

const DailyHashrates = ({
  timeframeType,
  hashpriceChart,
  dailyHashrateChart,
  metrics,
}: DailyHashratesProps) => (
  <Mosaic
    template={[
      ['left', 'rightTop'],
      ['left', 'rightBottom'],
    ]}
    gap="16px"
    columns={['420px', '1fr']}
    rowHeight="auto"
  >
    <Mosaic.Item area="left">
      <Mosaic template={[['m1'], ['m2'], ['m3'], ['hash']]} gap="16px" rowHeight="auto">
        {_map(metrics, (metric, idx) => (
          <Mosaic.Item key={metric.id ?? `metric-${idx}`} area={`m${idx + 1}`}>
            <ReportMetricCard
              label={metric.label}
              unit={metric.unit ?? ''}
              value={metric.value}
              isHighlighted={metric.isHighlighted}
              showDashForZero
            />
          </Mosaic.Item>
        ))}
      </Mosaic>
    </Mosaic.Item>

    <Mosaic.Item area="rightTop">
      <ReportLineChart
        title="Daily Average Hashrate"
        data={dailyHashrateChart}
        unit={UNITS.HASHRATE_PH_S}
        timeframeType={timeframeType}
      />
    </Mosaic.Item>

    <Mosaic.Item area="rightBottom">
      <ReportLineChart
        title="Network Hashprice"
        data={hashpriceChart}
        unit={`${CURRENCY.USD}/${UNITS.HASHRATE_PH_S}/day`}
        timeframeType={timeframeType}
      />
    </Mosaic.Item>
  </Mosaic>
)

export default DailyHashrates
