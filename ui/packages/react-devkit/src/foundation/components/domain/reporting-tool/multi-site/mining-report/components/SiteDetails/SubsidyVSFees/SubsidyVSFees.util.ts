// @ts-nocheck — temporary port debt; see ../../../PORTING.md (TypeScript strictness)
import _compact from 'lodash/compact'
import _filter from 'lodash/filter'
import _forEach from 'lodash/forEach'
import _get from 'lodash/get'
import _includes from 'lodash/includes'
import _isNil from 'lodash/isNil'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _mean from 'lodash/mean'
import _sortBy from 'lodash/sortBy'
import _takeRight from 'lodash/takeRight'
import _uniq from 'lodash/uniq'

import { CHART_COLORS } from '@core'
import {
  buildBarChart,
  EMPTY_STRUCTURES,
  makeLabelFormatter,
  pickLogs,
  safeNum,
  validateApiData,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib'
import type { ReportApiResponse } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'

import type { SubsidyFeesChartOptions } from '../site-details.types'

type SubsidyFeesBucket = {
  subsidyBTC: number
  feesBTC: number
  avgFeesSamples: number[]
  ts?: number
}

export const buildSubsidyFeesCharts = (
  api: ReportApiResponse,
  { days = 15, regionFilter, regionLabelMap, regionColors }: SubsidyFeesChartOptions = {},
) => {
  const apiValidation = validateApiData(api)
  if (!apiValidation.isValid) {
    return EMPTY_STRUCTURES.subsidyVSFees
  }

  const { logsPerSource, period } = pickLogs(api, regionFilter)
  const labelOf = makeLabelFormatter(period)

  const discovered = _uniq(_compact(_map(api.regions, 'region')))
  const activeRegions = regionFilter?.length
    ? _filter(discovered, (r) => _includes(regionFilter, r))
    : discovered

  const toDisplay = (code: string) => (regionLabelMap && regionLabelMap[code]) || code
  const primaryColor =
    (activeRegions.length && regionColors && regionColors[toDisplay(activeRegions[0])]) ||
    CHART_COLORS.blue

  const byLabel: Record<string, SubsidyFeesBucket> = {}

  _forEach(logsPerSource, (logArr) => {
    const sorted = _sortBy(logArr || [], 'ts')

    _forEach(sorted, (row) => {
      const label = labelOf(row.ts)
      if (!byLabel[label]) byLabel[label] = { subsidyBTC: 0, feesBTC: 0, avgFeesSamples: [] }

      const feesBTC = safeNum(_get(row, ['totalFeesBTC'], 0))
      const hashRevBTC = safeNum(_get(row, ['hashRevenueBTC'], 0))
      const subsidyBTC = Math.max(0, hashRevBTC - feesBTC)

      byLabel[label].feesBTC += feesBTC
      byLabel[label].subsidyBTC += subsidyBTC

      const avgFees = _get(row, ['avgFeesSatsVByte'])
      if (!_isNil(avgFees)) {
        const v = safeNum(avgFees)
        if (v !== 0 || avgFees === 0) byLabel[label].avgFeesSamples.push(v)
      }
    })
  })

  const allLabels = _sortBy(_keys(byLabel), (l) => byLabel[l].ts || l)
  const labels = _takeRight(allLabels, days)

  const subsidyVals = _map(labels, (l) => byLabel[l]?.subsidyBTC ?? 0)
  const feesVals = _map(labels, (l) => byLabel[l]?.feesBTC ?? 0)

  const avgFeesVals = _map(labels, (l) => {
    const samples = byLabel[l]?.avgFeesSamples || []
    return samples.length ? _mean(samples) : 0
  })

  const subsidyFees = buildBarChart(labels, [
    {
      label: 'Subsidy',
      values: subsidyVals,
      color: primaryColor,
      options: { stack: 'rev' },
    },
    {
      label: 'Fees',
      values: feesVals,
      color: CHART_COLORS.VIOLET,
      options: { stack: 'rev' },
    },
  ])

  const avgFeesSats = buildBarChart(labels, [
    {
      label: 'Avg Fee',
      values: avgFeesVals,
      color: CHART_COLORS.VIOLET,
    },
  ])

  return { subsidyFees, avgFeesSats }
}
