// @ts-nocheck — temporary port debt; see ../../../PORTING.md (TypeScript strictness)
import _flatMap from 'lodash/flatMap'
import _forEach from 'lodash/forEach'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _meanBy from 'lodash/meanBy'
import _reduce from 'lodash/reduce'
import _round from 'lodash/round'
import _sortBy from 'lodash/sortBy'

import { CHART_COLORS, COLOR } from '@core'
import {
  buildBarChart,
  buildLineChart,
  EMPTY_STRUCTURES,
  makeLabelFormatter,
  pickLogs,
  processAggregatedData,
  safeNum,
  validateApiData,
  validateLogs,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib'
import type { ReportApiResponse } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'

import type { CurrencyUsdBtcCell, EnergyRevenuesChartOptions, ReportMetric } from '../site-details.types'

type EnergyRevenueBucket = {
  ts: number
  _all: {
    curtail: number[]
    opIssues: number[]
  }
  [regionName: string]: unknown
}

type PowerBucket = {
  ts: number
  cons: number[]
  avail: number[]
}

export const buildEnergyRevenuesCharts = (
  api: ReportApiResponse,
  {
    regionFilter,
    regionLabelMap,
    regionColors,
    days = 30,
    powerDays = 30,
    powerUnitDivisor = 1e6,
    startDate,
    endDate,
  }: EnergyRevenuesChartOptions = {},
) => {
  const apiValidation = validateApiData(api)
  if (!apiValidation.isValid) {
    return EMPTY_STRUCTURES.energyRevenues
  }

  const { logsPerSource, period } = pickLogs(api, regionFilter)
  const logsValidation = validateLogs(logsPerSource)
  if (!logsValidation.isValid) {
    return EMPTY_STRUCTURES.energyRevenues
  }

  let sourceNames: string[]
  if (regionFilter?.length) {
    sourceNames = _map(regionFilter, (code) => regionLabelMap?.[code] || code)
  } else if (api?.data?.log) {
    sourceNames = ['All']
  } else {
    sourceNames = _map(api?.regions || [], (r) => regionLabelMap?.[r.region] || r.region)
  }

  const labelOf = makeLabelFormatter(period)

  const dayAgg: Record<string, EnergyRevenueBucket> = {}

  _forEach(logsPerSource, (logArr, idx) => {
    const name = sourceNames[idx] || `S${idx + 1}`
    const sorted = _sortBy(logArr || [], 'ts')

    _forEach(sorted, (row) => {
      const key = labelOf(row.ts)
      const curtail = safeNum(row.curtailmentRate)
      const downtime = safeNum(row.downtimeRate)
      const opIssues = Math.max(0, downtime - curtail)

      const usd = safeNum(row.energyRevenueUSD_MW ?? row.revenueUSD)
      const btc = safeNum(row.energyRevenueBTC_MW ?? row.totalRevenueBTC)

      const cell = (dayAgg[key] ||= { ts: row.ts, _all: { curtail: [], opIssues: [] } })
      const bucket = (cell[name] ||= { usd: 0, btc: 0 }) as CurrencyUsdBtcCell

      bucket.usd += usd
      bucket.btc += btc
      cell._all.curtail.push(curtail)
      cell._all.opIssues.push(opIssues)

      cell.ts = row.ts
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

  const palette = [CHART_COLORS.blue, CHART_COLORS.red, CHART_COLORS.orange, CHART_COLORS.green]
  const pickColor = (name: string, i: number) => regionColors?.[name] || palette[i % palette.length]

  const siteRevenueUSD = buildBarChart(
    labels,
    _map(sourceNames, (name, i) => ({
      label: name,
      values: _map(labels, (periodLabel) => (dataMap[periodLabel]?.[name] as CurrencyUsdBtcCell)?.usd ?? 0),
      color: pickColor(name, i),
    })),
  )

  const siteRevenueBTC = buildBarChart(
    labels,
    _map(sourceNames, (name, i) => ({
      label: name,
      values: _map(labels, (periodLabel) => (dataMap[periodLabel]?.[name] as CurrencyUsdBtcCell)?.btc ?? 0),
      color: pickColor(name, i),
    })),
  )

  const avgDowntime = buildBarChart(labels, [
    {
      label: 'Curtailment',
      values: _map(labels, (periodLabel) =>
        _meanBy((dataMap[periodLabel]?._all as EnergyRevenueBucket['_all'])?.curtail || [0], (v) =>
          safeNum(v),
        ),
      ),
      color: CHART_COLORS.VIOLET,
      options: { stack: 'DT' },
    },
    {
      label: 'Op. Issues',
      values: _map(labels, (periodLabel) =>
        _meanBy((dataMap[periodLabel]?._all as EnergyRevenueBucket['_all'])?.opIssues || [0], (v) =>
          safeNum(v),
        ),
      ),
      color: CHART_COLORS.SKY_BLUE,
      options: { stack: 'DT' },
    },
  ])

  const dayPower: Record<string, PowerBucket> = {}
  _forEach(logsPerSource, (logArr) => {
    const sorted = _sortBy(logArr || [], 'ts')
    _forEach(sorted, (row) => {
      const key = labelOf(row.ts)
      const consMW = safeNum(row.sitePowerW) / powerUnitDivisor
      const downtime = safeNum(row.downtimeRate)
      const availMW = consMW * Math.max(0, 1 - downtime)

      const b = (dayPower[key] ||= { ts: row.ts, cons: [], avail: [] })
      b.cons.push(consMW)
      b.avail.push(availMW)
      b.ts = row.ts
    })
  })

  const powerKeys = _sortBy(_keys(dayPower), (labelKey) => dayPower[labelKey].ts).slice(-powerDays)

  const powerConsumptionData = _map(powerKeys, (labelKey) => ({
    ts: dayPower[labelKey].ts,
    value: _meanBy(dayPower[labelKey].cons, (value) => safeNum(value)),
  }))

  const powerAvailabilityData = _map(powerKeys, (labelKey) => ({
    ts: dayPower[labelKey].ts,
    value: _meanBy(dayPower[labelKey].avail, (value) => safeNum(value)),
  }))

  const powerSeries = buildLineChart([
    {
      label: 'Power Consumption',
      data: powerConsumptionData,
      color: CHART_COLORS.orange,
    },
    {
      label: 'Power Availability',
      data: powerAvailabilityData,
      color: COLOR.MINT_GREEN,
    },
  ])

  const allCurtailSamples = _flatMap(finalAggregatedData, (item) =>
    ((item._all as EnergyRevenueBucket['_all'])?.curtail) || [],
  )
  const allOpIssueSamples = _flatMap(finalAggregatedData, (item) =>
    ((item._all as EnergyRevenueBucket['_all'])?.opIssues) || [],
  )
  const avgCurtailmentRate =
    (_meanBy(allCurtailSamples, (value) => safeNum(value)) || 0) * 100
  const avgOpIssuesRate = (_meanBy(allOpIssueSamples, (value) => safeNum(value)) || 0) * 100

  const downtimeMetrics: ReportMetric[] = [
    {
      id: 'curtailment_rate',
      label: 'Curtailment Rate',
      value: _round(avgCurtailmentRate, 1),
      unit: '%',
    },
    {
      id: 'op_issues_rate',
      label: 'Op. Issues rate',
      value: _round(avgOpIssuesRate, 1),
      unit: '%',
    },
  ]

  return { siteRevenueUSD, siteRevenueBTC, avgDowntime, powerSeries, downtimeMetrics }
}
