// @ts-nocheck — temporary port debt; see ../../../PORTING.md (TypeScript strictness)
import _compact from 'lodash/compact'
import _forEach from 'lodash/forEach'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _mean from 'lodash/mean'
import _reduce from 'lodash/reduce'
import _sortBy from 'lodash/sortBy'
import _uniq from 'lodash/uniq'

import { CHART_COLORS } from '@core'
import {
  buildBarChart,
  buildLineChart,
  calculateHashRevenueUSD,
  EMPTY_STRUCTURES,
  makeLabelFormatter,
  mhsToPhs,
  pickLogs,
  processAggregatedData,
  safeNum,
  validateApiData,
  validateLogs,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib'
import type { ReportApiResponse } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'

import type { HashRevenueBucket, HashRevenueTotals } from './HashRevenues.types'
import type { CurrencyUsdBtcCell, HashRevenuesChartOptions, ReportMetric } from '../site-details.types'

export const buildHashRevenuesCharts = (
  api: ReportApiResponse,
  {
    regionFilter,
    regionLabelMap,
    regionColors,
    days = 30,
    startDate,
    endDate,
  }: HashRevenuesChartOptions = {},
) => {
  const apiValidation = validateApiData(api)
  if (!apiValidation.isValid) {
    return EMPTY_STRUCTURES.hashRevenues
  }

  const { logsPerSource, period } = pickLogs(api, regionFilter)
  const logsValidation = validateLogs(logsPerSource)
  if (!logsValidation.isValid) {
    return EMPTY_STRUCTURES.hashRevenues
  }

  let sourceNames: string[]
  if (regionFilter?.length) {
    sourceNames = _map(regionFilter, (code) => regionLabelMap?.[code] || code)
  } else if (api?.data?.log) {
    sourceNames = ['All']
  } else {
    const discovered = _uniq(_compact(_map(api.regions || [], 'region')))
    sourceNames = _map(discovered, (code) => regionLabelMap?.[code] || code)
  }

  const labelOf = makeLabelFormatter(period)

  const dayAgg: Record<string, HashRevenueBucket> = {}

  _forEach(logsPerSource, (logArr, idx) => {
    const name = sourceNames[idx] || `S${idx + 1}`
    const sorted = _sortBy(logArr || [], 'ts')

    _forEach(sorted, (row) => {
      const key = labelOf(row.ts)
      const bucket = (dayAgg[key] ||= { ts: row.ts, _all: { usdSum: 0, phsSum: 0 } })

      const priceUSD = safeNum(row.currentBTCPrice)
      const hashRevBTC = safeNum(row.hashRevenueBTC ?? row.totalRevenueBTC)
      const hashRevUSD = calculateHashRevenueUSD(hashRevBTC, priceUSD, safeNum(row.hashRevenueUSD))

      const cell = (bucket[name] ||= { usd: 0, btc: 0 }) as CurrencyUsdBtcCell
      cell.usd += hashRevUSD
      cell.btc += hashRevBTC

      const phs = mhsToPhs(row.hashrateMHS)
      bucket._all.usdSum += hashRevUSD
      bucket._all.phsSum += phs

      bucket.ts = row.ts
    })
  })

  const allLabels = _sortBy(_keys(dayAgg), (labelKey) => dayAgg[labelKey].ts)

  const finalAggregatedData = processAggregatedData(
    dayAgg,
    allLabels,
    period,
    startDate,
    endDate,
    days,
  )

  const labels = _map(finalAggregatedData, 'label')

  const palette = [CHART_COLORS.blue, CHART_COLORS.red, CHART_COLORS.orange, CHART_COLORS.green]
  const pickColor = (name: string, i: number) => regionColors?.[name] || palette[i % palette.length]

  // Create a map for easy access to data by label
  const dataMap = _reduce(
    finalAggregatedData,
    (acc, item) => {
      const label = item.label as string
      acc[label] = item
      return acc
    },
    {} as Record<string, Record<string, unknown>>,
  )

  const siteHashUSD = buildBarChart(
    labels,
    _map(sourceNames, (name, i) => ({
      label: name,
      values: _map(labels, (periodLabel) => (dataMap[periodLabel]?.[name] as CurrencyUsdBtcCell)?.usd ?? 0),
      color: pickColor(name, i),
    })),
  )

  const siteHashBTC = buildBarChart(
    labels,
    _map(sourceNames, (name, i) => ({
      label: name,
      values: _map(labels, (periodLabel) => (dataMap[periodLabel]?.[name] as CurrencyUsdBtcCell)?.btc ?? 0),
      color: pickColor(name, i),
      options: { datalabels: { display: false } },
    })),
  )

  const networkHashratePoints = _map(labels, (periodLabel) => ({
    ts: Number(dataMap[periodLabel]?.ts) || 0,
    value: Number((dataMap[periodLabel]?._all as HashRevenueTotals)?.phsSum) || 0,
  }))
  const networkHashrate = buildLineChart([
    {
      label: 'Hashrate',
      data: networkHashratePoints,
      color: CHART_COLORS.orange,
    },
  ])

  const networkHashpriceValues = _map(labels, (periodLabel) => {
    const allData = dataMap[periodLabel]?._all as HashRevenueTotals | undefined
    const usd = Number(allData?.usdSum) || 0
    const phs = Number(allData?.phsSum) || 0
    return phs > 0 ? usd / phs : 0
  })
  const networkHashprice = buildBarChart(labels, [
    {
      label: 'Hashprice',
      values: networkHashpriceValues,
      color: CHART_COLORS.VIOLET,
    },
  ])

  const avgHashprice = _mean(networkHashpriceValues) || 0
  const avgHashRevenueUsdPerDay =
    _mean(
      _map(labels, (periodLabel) => Number((dataMap[periodLabel]?._all as HashRevenueTotals)?.usdSum) || 0),
    ) || 0

  const hashMetrics: ReportMetric[] = [
    {
      id: 'avg_hash_revenue',
      label: 'Avg Hash Revenue',
      value: avgHashRevenueUsdPerDay,
      unit: '$/day',
    },
    { id: 'avg_hashprice', label: 'Avg Hashprice', value: avgHashprice, unit: '$/PH/s/day' },
  ]

  return { siteHashUSD, siteHashBTC, networkHashrate, networkHashprice, hashMetrics }
}
