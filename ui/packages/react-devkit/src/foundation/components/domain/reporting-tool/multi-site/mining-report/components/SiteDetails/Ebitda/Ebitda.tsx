import _map from 'lodash/map'

import { CURRENCY, Mosaic } from '@core'

import { type BarChartData, formatDataLabel } from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import type { MetricCardData } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'
import { ReportBarChart } from '../../../report-charts/report-bar-chart'
import { ReportMetricCard } from '../../../report-metric-card/report-metric-card'

type EbitdaProps = {
  ebitdaChart: BarChartData
  btcProducedChart: BarChartData
  ebitdaMetrics: MetricCardData[]
}

const Ebitda = ({ ebitdaChart, btcProducedChart, ebitdaMetrics }: EbitdaProps) => (
  <Mosaic template={['metrics charts']} gap="24px" columns="320px 1fr">
    <Mosaic.Item area="metrics">
      <div className="mdk-mining-report__metrics-column">
        {_map(ebitdaMetrics, (metric, index) => (
          <ReportMetricCard
            key={metric.id ?? `metric-${index}`}
            label={metric.label}
            unit={metric.unit ?? ''}
            value={metric.value}
            isHighlighted={metric.isHighlighted}
            showDashForZero
          />
        ))}
      </div>
    </Mosaic.Item>

    <Mosaic.Item area="charts">
      <Mosaic template={['ebitda-chart', 'bitcoin-chart']} gap="24px" rowHeight="1fr">
        <Mosaic.Item area="ebitda-chart">
          <ReportBarChart
            chartTitle="EBITDA"
            data={ebitdaChart}
            unit={CURRENCY.USD}
            yTicksFormatter={formatDataLabel}
            isStacked
            isLegendVisible
          />
        </Mosaic.Item>

        <Mosaic.Item area="bitcoin-chart">
          <ReportBarChart
            chartTitle="Bitcoin Produced"
            data={btcProducedChart}
            unit={CURRENCY.BTC}
            yTicksFormatter={formatDataLabel}
            isLegendVisible
            showDataLabels
          />
        </Mosaic.Item>
      </Mosaic>
    </Mosaic.Item>
  </Mosaic>
)

export default Ebitda
