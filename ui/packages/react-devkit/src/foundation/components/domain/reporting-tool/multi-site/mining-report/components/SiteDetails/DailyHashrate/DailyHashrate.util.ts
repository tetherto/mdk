// @ts-nocheck — temporary port debt; see ../../../PORTING.md (TypeScript strictness)
import _map from 'lodash/map'
import _mean from 'lodash/mean'
import _round from 'lodash/round'

import { CHART_COLORS } from '@core'
import {
  applyDayLimit,
  buildLineChart,
  createHashrateAggregator,
  EMPTY_STRUCTURES,
  extractNominalValues,
  findRegionBySite,
  groupLogsByPeriod,
  makeLabelFormatter,
  pickLogs,
  toPerPh,
  validateApiData,
  validateLogs,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib'
import type { ReportApiResponse } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'

import type { SiteScopedChartOptions } from '../site-details.types'

export const buildDailyHashratesCharts = (
  api: ReportApiResponse,
  { siteCode, days = 30 }: SiteScopedChartOptions = {},
) => {
  const apiValidation = validateApiData(api)
  if (!apiValidation.isValid) {
    return EMPTY_STRUCTURES.dailyHashrate
  }

  const { logsPerSource, period } = pickLogs(api, siteCode ? [siteCode] : undefined)
  const logsValidation = validateLogs(logsPerSource)
  if (!logsValidation.isValid) {
    return EMPTY_STRUCTURES.dailyHashrate
  }

  const labelFormatter = makeLabelFormatter(period)
  const aggregator = createHashrateAggregator()

  const buckets = groupLogsByPeriod(logsPerSource, labelFormatter, aggregator)
  const labels = applyDayLimit(buckets, days)

  const hashratePoints = _map(labels, (labelKey) => ({
    ts: buckets[labelKey].ts,
    value: buckets[labelKey].phsSum || 0,
  }))

  const hashpricePoints = _map(labels, (labelKey) => {
    const { phsSum, usdSum, ts } = buckets[labelKey]
    return {
      ts,
      value: toPerPh(usdSum, phsSum),
    }
  })

  const region = findRegionBySite(api, siteCode)
  const { hashratePHs: nominalPHs } = extractNominalValues(region)

  const dailyHashrateChart = buildLineChart(
    [
      {
        label: 'Daily Average Hashrate',
        data: hashratePoints,
        color: CHART_COLORS.blue,
      },
    ],
    [
      {
        label: 'Installed Nominal Hashrate',
        value: nominalPHs,
        color: CHART_COLORS.red,
      },
    ],
  )

  const hashpriceChart = buildLineChart([
    {
      label: 'Hashprice',
      data: hashpricePoints,
      color: CHART_COLORS.orange,
    },
  ])

  const avgPHs = _mean(_map(hashratePoints, 'value')) || 0
  const avgEHs = avgPHs / 1000
  const avgHashprice = _mean(_map(hashpricePoints, 'value')) || 0

  const metrics = [
    {
      id: 'total_avg_hashrate_ehs',
      label: 'Total Avg Hashrate',
      value: _round(avgEHs, 2),
      unit: 'EH/s',
      isHighlighted: true,
    },
    {
      id: `${siteCode}_avg_phs`,
      label: `${siteCode} Avg Hashrate`,
      value: _round(avgPHs, 2),
      unit: 'PH/s',
    },
    {
      id: 'avg_hashprice',
      label: 'Avg Hashprice',
      value: _round(avgHashprice, 2),
      unit: '$/PH/s/day',
    },
  ]

  return { hashpriceChart, dailyHashrateChart, metrics }
}
