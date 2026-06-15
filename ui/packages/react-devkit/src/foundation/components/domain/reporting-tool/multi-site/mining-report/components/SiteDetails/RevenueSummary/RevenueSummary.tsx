import _map from 'lodash/map'
import _slice from 'lodash/slice'

import { CURRENCY, Mosaic } from '@core'

import { type BarChartData, formatDataLabel } from '@/components/domain/reporting-tool/multi-site/mining-report/lib/chart-builders'
import type { MetricCardData } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'
import { ReportBarChart } from '../../../report-charts/report-bar-chart'
import { ReportOperationsEnergyCostChart } from '../../../report-charts/report-operations-energy-cost-chart'
import { ReportMetricCard } from '../../../report-metric-card/report-metric-card'

type OperationsEnergyCostData = {
  operationsCost?: number
  energyCost?: number
}

type RevenueSummaryProps = {
  data: BarChartData
  operationsEnergyCostData?: OperationsEnergyCostData
  bitcoinMetrics?: MetricCardData[]
  energyHashMetrics?: MetricCardData[]
}

const RevenuesSummary = ({
  data,
  operationsEnergyCostData,
  bitcoinMetrics = [],
  energyHashMetrics = [],
}: RevenueSummaryProps) => (
  <Mosaic template={['left revenue', 'left bottom']} gap="16px" rowHeight="auto" columns="25% 1fr">
    <Mosaic.Item area="left">
      <div className="mdk-mining-report__metrics-column mdk-mining-report__metrics-column--wide">
        {_map(bitcoinMetrics, (m, i) => (
          <ReportMetricCard
            key={m.id ?? `metric-${i}`}
            label={m.label}
            unit={m.unit ?? ''}
            value={m.value}
            isHighlighted={m.isHighlighted}
            showDashForZero
          />
        ))}
      </div>
    </Mosaic.Item>

    <Mosaic.Item area="revenue">
      <ReportBarChart
        chartTitle="Revenues"
        data={data}
        isStacked={false}
        barWidth={43}
        isLegendVisible
        showDataLabels
        yTicksFormatter={formatDataLabel}
        unit={CURRENCY.BTC}
      />
    </Mosaic.Item>

    <Mosaic.Item area="bottom">
      <Mosaic template={['ops m1 m2']} gap="16px" rowHeight="minmax(280px, auto)">
        <Mosaic.Item area="ops">
          <ReportOperationsEnergyCostChart
            data={
              operationsEnergyCostData
                ? {
                    energyCostsUSD: operationsEnergyCostData.energyCost,
                    operationalCostsUSD: operationsEnergyCostData.operationsCost,
                  }
                : undefined
            }
          />
        </Mosaic.Item>

        <Mosaic.Item area="m1">
          <div className="mdk-mining-report__metrics-column">
            {_map(_slice(energyHashMetrics, 0, 3), (m, i) => (
              <ReportMetricCard
                key={m.id ?? `metric-${i}`}
                label={m.label}
                unit={m.unit ?? ''}
                value={m.value}
                isHighlighted={m.isHighlighted}
                showDashForZero
              />
            ))}
          </div>
        </Mosaic.Item>

        <Mosaic.Item area="m2">
          <div className="mdk-mining-report__metrics-column">
            {_map(_slice(energyHashMetrics, 3), (m, i) => (
              <ReportMetricCard
                key={m.id ?? `metric-${i}`}
                label={m.label}
                unit={m.unit ?? ''}
                value={m.value}
                isHighlighted={m.isHighlighted}
                showDashForZero
              />
            ))}
          </div>
        </Mosaic.Item>
      </Mosaic>
    </Mosaic.Item>
  </Mosaic>
)

export default RevenuesSummary
