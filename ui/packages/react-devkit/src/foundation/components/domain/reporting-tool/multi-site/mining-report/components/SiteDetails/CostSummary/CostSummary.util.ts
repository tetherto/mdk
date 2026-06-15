// @ts-nocheck — temporary port debt; see ../../../PORTING.md (TypeScript strictness)
import _forEach from 'lodash/forEach'
import _get from 'lodash/get'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _mean from 'lodash/mean'
import _sortBy from 'lodash/sortBy'

import { CHART_COLORS } from '@core'
import {
  buildBarChart,
  EMPTY_STRUCTURES,
  makeLabelFormatter,
  pickLogs,
  processAggregatedData,
  safeNum,
  validateApiData,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib'
import type { ChartBuilderOptions, ReportApiResponse } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'

import type { CostSummaryBucket } from './CostSummary.types'

export const buildCostSummaryCharts = (
  api: ReportApiResponse,
  { regionFilter = [], buckets = 12, startDate, endDate }: ChartBuilderOptions = {},
) => {
  const apiValidation = validateApiData(api)
  if (!apiValidation.isValid) {
    return EMPTY_STRUCTURES.costSummary
  }

  const { logsPerSource, period } = pickLogs(api, regionFilter)
  if (!logsPerSource.length) {
    return EMPTY_STRUCTURES.costSummary
  }

  const labelFmt = makeLabelFormatter(period)
  const byLabel: Record<string, CostSummaryBucket> = {}

  _forEach(logsPerSource, (log) => {
    const sorted = _sortBy(log || [], 'ts')

    _forEach(sorted, (row) => {
      const ts = _get(row, ['ts'])
      const key = labelFmt(ts)

      const bucket = (byLabel[key] ||= {
        ts,
        priceSamples: [],
        prodCostNumerator: 0,
        prodCostDenominatorBTC: 0,
        energyUSD: 0,
        opsUSD: 0,
        revenueUSD: 0,
        curtailSamples: [],
        opIssueSamples: [],
      })

      const price = safeNum(_get(row, ['currentBTCPrice'], 0))
      if (price > 0) bucket.priceSamples.push(price)

      const energyUSD = safeNum(_get(row, ['totalEnergyCostsUSD'], 0))
      const opsUSD = safeNum(_get(row, ['totalOperationalCostsUSD'], 0))
      bucket.energyUSD += energyUSD
      bucket.opsUSD += opsUSD

      const revenueUSD = safeNum(_get(row, ['revenueUSD'], 0))
      bucket.revenueUSD += revenueUSD

      const totalRevBTC =
        safeNum(_get(row, ['hashRevenueBTC'], 0)) || safeNum(_get(row, ['totalRevenueBTC'], 0))

      bucket.prodCostNumerator += energyUSD + opsUSD
      bucket.prodCostDenominatorBTC += totalRevBTC

      const curtail = safeNum(_get(row, ['curtailmentRate'], 0))
      const downtime = safeNum(_get(row, ['downtimeRate'], 0))
      const opIssues = Math.max(0, downtime - curtail)
      bucket.curtailSamples.push(curtail)
      bucket.opIssueSamples.push(opIssues)

      bucket.ts = ts
    })
  })

  const allLabels = _sortBy(_keys(byLabel), (labelKey) => byLabel[labelKey].ts)

  const finalAggregatedData = processAggregatedData(
    byLabel,
    allLabels,
    period,
    startDate,
    endDate,
    buckets,
  )

  const labels = _map(finalAggregatedData, 'label')

  const btcPriceVals = _map(finalAggregatedData, (item) => {
    const priceSamples = (item?.priceSamples as number[]) || []
    return priceSamples.length ? _mean(priceSamples) : 0
  })

  const prodCostPerBTCVals = _map(finalAggregatedData, (item) => {
    const numerator = (item?.prodCostNumerator as number) || 0
    const denominatorBtc = (item?.prodCostDenominatorBTC as number) || 0
    return denominatorBtc > 0 ? numerator / denominatorBtc : 0
  })

  const btcProdCost = buildBarChart(labels, [
    {
      label: 'BTC Price',
      values: btcPriceVals,
      color: CHART_COLORS.secondaryOrange || CHART_COLORS.orange,
    },
    {
      label: 'Production Cost',
      values: prodCostPerBTCVals,
      color: CHART_COLORS.green,
    },
  ])

  const curtailVals = _map(finalAggregatedData, (item) =>
    _mean((item?.curtailSamples as number[]) || [0]),
  )

  const opIssuesVals = _map(finalAggregatedData, (item) =>
    _mean((item?.opIssueSamples as number[]) || [0]),
  )

  const avgDowntime = buildBarChart(labels, [
    {
      label: 'Curtailment',
      values: curtailVals,
      color: CHART_COLORS.blue,
      options: { stack: 'DT' },
    },
    {
      label: 'Op. Issues',
      values: opIssuesVals,
      color: CHART_COLORS.red,
      options: { stack: 'DT' },
    },
  ])

  const costVals = _map(
    finalAggregatedData,
    (item) => ((item?.energyUSD as number) || 0) + ((item?.opsUSD as number) || 0),
  )
  const revenueVals = _map(finalAggregatedData, (item) => (item?.revenueUSD as number) || 0)

  const powerCost = buildBarChart(labels, [
    {
      label: 'Cost',
      values: costVals,
      color: CHART_COLORS.VIOLET,
    },
    {
      label: 'Revenue',
      values: revenueVals,
      color: CHART_COLORS.green,
    },
  ])

  const avgCost =
    _mean(_map(labels, (labelKey) => (byLabel[labelKey]?.energyUSD || 0) + (byLabel[labelKey]?.opsUSD || 0))) || 0
  const avgEnergy = _mean(_map(labels, (labelKey) => byLabel[labelKey]?.energyUSD || 0)) || 0
  const avgOps = _mean(_map(labels, (labelKey) => byLabel[labelKey]?.opsUSD || 0)) || 0

  const metrics = [
    { id: 'all_in_cost', label: 'All-in Cost', value: avgCost, unit: '$', isHighlighted: true },
    { id: 'ene', label: 'Energy', value: avgEnergy, unit: '$' },
    { id: 'ops', label: 'Operations', value: avgOps, unit: '$' },
  ]

  return { btcProdCost, avgDowntime, powerCost, metrics }
}
