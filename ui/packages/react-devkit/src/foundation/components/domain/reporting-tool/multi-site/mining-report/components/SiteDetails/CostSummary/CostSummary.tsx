import _map from 'lodash/map'

import { CURRENCY, formatNumber, Mosaic, UNITS } from '@core'

import {
  type BarChartData,
  formatDataLabel,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import type { MetricCardData } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'
import { ReportBarChart } from '../../../report-charts/report-bar-chart'
import { ReportOperationsEnergyCostChart } from '../../../report-charts/report-operations-energy-cost-chart'
import { ReportMetricCard } from '../../../report-metric-card/report-metric-card'

type OperationsEnergyCostData = Partial<{
  operationsCost?: number
  energyCost?: number
}>

type CostSummaryProps = Partial<{
  btcProdCost: BarChartData
  avgDowntime: BarChartData
  powerCost: BarChartData
  metrics: MetricCardData[]
  operationsEnergyCostData: OperationsEnergyCostData
}>

const fmtUSDk = (v: number) => `$${formatDataLabel(v / 1_000)}k`
const fmtPct = (v: number) => `${formatNumber(v * 100)}%`

const CostSummary = ({
  btcProdCost = { labels: [], series: [] },
  avgDowntime = { labels: [], series: [] },
  powerCost = { labels: [], series: [] },
  metrics = [],
  operationsEnergyCostData,
}: CostSummaryProps) => (
  <Mosaic
    template={['btc-chart downtime-chart', 'bottom-left power-chart']}
    gap="24px"
    columns="1fr 1fr"
  >
    <Mosaic.Item area="btc-chart">
      <ReportBarChart
        chartTitle="Bitcoin Production Cost"
        data={btcProdCost}
        unit={CURRENCY.USD}
        yTicksFormatter={fmtUSDk}
        isLegendVisible
        showDataLabels
      />
    </Mosaic.Item>

    <Mosaic.Item area="downtime-chart">
      <ReportBarChart
        chartTitle="Avg Downtime"
        data={avgDowntime}
        unit={UNITS.PERCENT}
        isStacked
        yTicksFormatter={fmtPct}
        isLegendVisible
        showDataLabels
      />
    </Mosaic.Item>

    <Mosaic.Item area="bottom-left">
      <Mosaic template={['chart metrics']} gap="16px" columns="auto 1fr">
        {operationsEnergyCostData ? (
          <Mosaic.Item area="chart">
            <ReportOperationsEnergyCostChart
              data={{
                energyCostsUSD: operationsEnergyCostData.energyCost,
                operationalCostsUSD: operationsEnergyCostData.operationsCost,
              }}
            />
          </Mosaic.Item>
        ) : null}

        <Mosaic.Item area="metrics">
          <div className="mdk-mining-report__metrics-column">
            {_map(metrics, (m) => (
              <ReportMetricCard
                key={m.id}
                label={m.label}
                unit={m.unit || CURRENCY.USD}
                value={m.value}
                isHighlighted={m.isHighlighted}
                showDashForZero
              />
            ))}
          </div>
        </Mosaic.Item>
      </Mosaic>
    </Mosaic.Item>

    <Mosaic.Item area="power-chart">
      <ReportBarChart
        chartTitle="Avg All-in Power Cost"
        data={powerCost}
        unit={CURRENCY.USD}
        yTicksFormatter={fmtUSDk}
        isLegendVisible
        showDataLabels
      />
    </Mosaic.Item>
  </Mosaic>
)

export default CostSummary
