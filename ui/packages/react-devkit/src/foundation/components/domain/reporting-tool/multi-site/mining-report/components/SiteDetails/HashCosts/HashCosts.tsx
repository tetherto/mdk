import _map from 'lodash/map'

import { CURRENCY, formatNumber, Mosaic, UNITS } from '@core'

import type { BarChartData, LineChartData } from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import type { MetricCardData } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'
import { ReportBarChart } from '../../../report-charts/report-bar-chart'
import { ReportLineChart } from '../../../report-charts/report-line-chart'
import { ReportMetricCard } from '../../../report-metric-card/report-metric-card'

type HashCostsProps = {
  timeframeType?: string
  revCostHashprice: BarChartData
  hashrate: LineChartData
  hashCostMetrics: MetricCardData[]
}

const HashCosts = ({
  timeframeType,
  revCostHashprice,
  hashrate,
  hashCostMetrics,
}: HashCostsProps) => (
  <Mosaic template={['metrics charts']} gap="24px" columns="280px 1fr">
    <Mosaic.Item area="metrics">
      <div className="mdk-mining-report__metrics-column">
        {_map(hashCostMetrics, (m) => (
          <ReportMetricCard
            key={m.id}
            label={m.label}
            unit={m.unit ?? ''}
            value={m.value}
            isHighlighted={m.isHighlighted}
            showDashForZero
          />
        ))}
      </div>
    </Mosaic.Item>

    <Mosaic.Item area="charts">
      <Mosaic template={['rev-cost-hashprice', 'avg-hashrate']} gap="24px" rowHeight="1fr">
        <Mosaic.Item area="rev-cost-hashprice">
          <ReportBarChart
            chartTitle="Revenue/Cost/Network Hashprice"
            data={revCostHashprice}
            unit={`${CURRENCY.USD}/${UNITS.HASHRATE_PH_S}/day`}
            yTicksFormatter={(v) => formatNumber(v)}
            isLegendVisible
            showDataLabels
          />
        </Mosaic.Item>

        <Mosaic.Item area="avg-hashrate">
          <ReportLineChart
            title="Average Hashrate"
            data={hashrate}
            unit={UNITS.HASHRATE_PH_S}
            timeframeType={timeframeType}
          />
        </Mosaic.Item>
      </Mosaic>
    </Mosaic.Item>
  </Mosaic>
)

export default HashCosts
