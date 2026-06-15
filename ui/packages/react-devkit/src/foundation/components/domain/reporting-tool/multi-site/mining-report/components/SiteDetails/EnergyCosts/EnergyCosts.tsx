import _map from 'lodash/map'

import { CURRENCY, formatNumber, Mosaic, UNITS } from '@core'

import type { BarChartData, LineChartData } from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import type { MetricCardData } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'
import { ReportBarChart } from '../../../report-charts/report-bar-chart'
import { ReportLineChart } from '../../../report-charts/report-line-chart'
import { ReportMetricCard } from '../../../report-metric-card/report-metric-card'

type EnergyCostsProps = {
  timeframeType?: string
  energyMetrics: MetricCardData[]
  revenueVsCost: BarChartData
  powerSeries: LineChartData
}

const EnergyCosts = ({
  timeframeType,
  energyMetrics,
  revenueVsCost,
  powerSeries,
}: EnergyCostsProps) => (
  <Mosaic template={['metrics charts']} gap="24px" columns="280px 1fr">
    <Mosaic.Item area="metrics">
      <div className="mdk-mining-report__metrics-column">
        {_map(energyMetrics, (m) => (
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
      <Mosaic template={['revenue-cost', 'power']} gap="24px" rowHeight="1fr">
        <Mosaic.Item area="revenue-cost">
          <ReportBarChart
            chartTitle="Revenue vs Cost"
            data={revenueVsCost}
            unit={`${CURRENCY.USD}/${UNITS.ENERGY_MWH}`}
            yTicksFormatter={(v) => formatNumber(v)}
            isLegendVisible
            showDataLabels
          />
        </Mosaic.Item>

        <Mosaic.Item area="power">
          <ReportLineChart
            title="Power"
            data={powerSeries}
            unit={UNITS.ENERGY_MW}
            timeframeType={timeframeType}
          />
        </Mosaic.Item>
      </Mosaic>
    </Mosaic.Item>
  </Mosaic>
)

export default EnergyCosts
