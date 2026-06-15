import _forEach from 'lodash/forEach'
import _map from 'lodash/map'
import _meanBy from 'lodash/meanBy'
import _round from 'lodash/round'
import _sortBy from 'lodash/sortBy'
import _sumBy from 'lodash/sumBy'

import { CHART_COLORS, CURRENCY  } from '@core'
import {
  buildBarChart,
  makeLabelFormatter,
  pickLogs,
  processAggregatedData,
  safeNum,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib'
import type { ChartBuilderOptions, ReportApiResponse } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'
import type { ReportMetric } from '../site-details.types'

type RevenueSummaryBucket = {
  ts: number
  revenueBTC: number
  energyCostUSD: number
  opsCostUSD: number
  hashrateMHS: number[]
  downtime: number[]
  label?: string
}

const mhsToEhs = (mhs: number) => safeNum(mhs) / 1e12

export const buildRevenuesSummaryData = (
  api: ReportApiResponse,
  { regionFilter, buckets = 12, startDate, endDate }: ChartBuilderOptions = {},
) => {
  const { logsPerSource, period } = pickLogs(api, regionFilter)
  const labelFmt = makeLabelFormatter(period)

  const byLabel = new Map<string, RevenueSummaryBucket>()

  _forEach(logsPerSource, (logs) => {
    const sorted = _sortBy(logs || [], 'ts')
    _forEach(sorted, (row) => {
      const ts = safeNum(row.ts)
      const label = labelFmt(ts)
      if (!byLabel.has(label)) {
        byLabel.set(label, {
          ts,
          revenueBTC: 0,
          energyCostUSD: 0,
          opsCostUSD: 0,
          hashrateMHS: [],
          downtime: [],
        })
      }
      const bucket = byLabel.get(label)!
      bucket.ts = ts
      bucket.revenueBTC += safeNum(row.totalRevenueBTC)
      bucket.energyCostUSD += safeNum(row.totalEnergyCostsUSD)
      bucket.opsCostUSD += safeNum(row.totalOperationalCostsUSD)
      bucket.hashrateMHS.push(safeNum(row.hashrateMHS))
      bucket.downtime.push(safeNum(row.downtimeRate))
    })
  })

  const ordered = _sortBy(Array.from(byLabel.values()), 'ts')

  // Convert to object format for processAggregatedData
  const byLabelObj: Record<string, Record<string, unknown>> = {}
  const allLabels: string[] = []
  ordered.forEach((item) => {
    const label = labelFmt(item.ts)
    byLabelObj[label] = { ...item }
    allLabels.push(label)
  })

  const finalOrdered = processAggregatedData(
    byLabelObj,
    allLabels,
    period,
    startDate,
    endDate,
    buckets,
  )

  const labels = _map(finalOrdered, (b) => labelFmt(b.ts || 0))

  const revenuesChart = buildBarChart(labels, [
    {
      label: `Revenue (${CURRENCY.BTC_LABEL})`,
      values: _map(finalOrdered, (b) => Number(b.revenueBTC) || 0),
      color: CHART_COLORS.blue,
    },
  ])

  const avgEnergyUSD = _meanBy(finalOrdered, (b) => Number(b.energyCostUSD) || 0) || 0
  const avgOpsUSD = _meanBy(finalOrdered, (b) => Number(b.opsCostUSD) || 0) || 0
  const operationsEnergyCostData = {
    operationsCost: avgOpsUSD,
    energyCost: avgEnergyUSD,
  }

  const totalBTC = _sumBy(finalOrdered, (b) => Number(b.revenueBTC) || 0)
  const bitcoinMetrics: ReportMetric[] = [
    { id: 'total_bitcoin', label: 'Total Bitcoin', value: _round(totalBTC, 4), unit: 'BTC' },
  ]

  const avgHashrateEhs =
    _meanBy(finalOrdered, (b) => mhsToEhs(_meanBy(b.hashrateMHS as number[], (x) => x))) || 0
  const avgDowntimePct =
    (_meanBy(finalOrdered, (b) => _meanBy(b.downtime as number[], (x) => x)) || 0) * 100

  const energyHashMetrics: ReportMetric[] = [
    {
      id: 'avg_energy_revenue_at_prod_date_price',
      label: 'Avg Energy Revenue - At Prod. Date Price',
      value: _round(
        _meanBy(ordered, (b) => Number(b.energyCostUSD) || 0),
        2,
      ),
      unit: '$',
    },
    {
      id: 'avg_hash_revenue_at_prod_date_price',
      label: 'Avg Hash Revenue - At Prod. Date Price',
      value: _round(
        _meanBy(ordered, (b) => Number(b.revenueBTC) || 0),
        6,
      ),
      unit: 'BTC',
    },
    {
      id: 'avg_power_consumption',
      label: 'Avg Power Consumption',
      value: 0,
      unit: 'MW',
    },
    { id: 'avg_hashrate', label: 'Avg Hashrate', value: _round(avgHashrateEhs, 2), unit: 'EH/s' },
    {
      id: 'avg_downtime_rate',
      label: 'Avg Downtime Rate',
      value: _round(avgDowntimePct, 1),
      unit: '%',
    },
  ]

  return {
    revenuesChart,
    operationsEnergyCostData,
    bitcoinMetrics,
    energyHashMetrics,
  }
}
