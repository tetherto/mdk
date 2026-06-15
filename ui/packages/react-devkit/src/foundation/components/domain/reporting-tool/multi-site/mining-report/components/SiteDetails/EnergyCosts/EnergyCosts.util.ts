// @ts-nocheck — temporary port debt; see ../../../PORTING.md (TypeScript strictness)
import _flatten from 'lodash/flatten'
import _get from 'lodash/get'
import _map from 'lodash/map'
import _sortBy from 'lodash/sortBy'
import _takeRight from 'lodash/takeRight'

import { CHART_COLORS, COLOR } from '@core'
import {
  avg,
  buildBarChart,
  buildLineChart,
  EMPTY_STRUCTURES,
  getPeriod,
  makeLabelFormatter,
  pickLogs,
  safeNum,
  validateApiData,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib'
import type { ReportApiResponse } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'

import type { EnergyCostsChartOptions, ReportMetric } from '../site-details.types'

export const buildEnergyCostsCharts = (
  api: ReportApiResponse,
  { siteCode, buckets = 30, powerUnitDivisor = 1e6 }: EnergyCostsChartOptions = {},
) => {
  const apiValidation = validateApiData(api)
  if (!apiValidation.isValid) {
    return EMPTY_STRUCTURES.energyCosts
  }

  const { logsPerSource, period } = pickLogs(api, siteCode ? [siteCode] : undefined)
  const labelFn = makeLabelFormatter(getPeriod(api) || period)

  const allLogs = _flatten(logsPerSource || [])
  if (!allLogs.length) {
    return EMPTY_STRUCTURES.energyCosts
  }

  const sorted = _sortBy(allLogs, (r) => _get(r, ['ts'], 0))
  const tail = _takeRight(sorted, buckets)

  const consMW = _map(tail, (row) => safeNum(_get(row, ['sitePowerW'], 0)) / powerUnitDivisor)
  const availMW = _map(tail, (row, i) => {
    const dw = safeNum(_get(row, ['downtimeRate'], 0))
    return consMW[i] * Math.max(0, 1 - dw)
  })

  const energyCostUSD = _map(tail, (row) => safeNum(_get(row, ['totalEnergyCostsUSD'], 0)))
  const opsCostUSD = _map(tail, (row) => safeNum(_get(row, ['totalOperationalCostsUSD'], 0)))
  const allInUSD = _map(energyCostUSD, (v, i) => v + opsCostUSD[i])

  const revenueUSD = _map(tail, (row) => {
    const energyRev = _get(row, ['energyRevenueUSD_MW'])
    const fallback = safeNum(_get(row, ['revenueUSD'], 0))
    return energyRev !== null && energyRev !== undefined ? safeNum(energyRev) : fallback
  })

  const labels = _map(tail, (row) => labelFn(_get(row, ['ts'], 0)))

  const revenueVsCost = buildBarChart(labels, [
    {
      label: 'All-In Cost',
      values: allInUSD,
      color: CHART_COLORS.secondaryOrange || CHART_COLORS.orange,
    },
    {
      label: 'Revenue',
      values: revenueUSD,
      color: CHART_COLORS.SKY_BLUE,
    },
  ])

  const powerConsumptionData = _map(tail, (row, i) => ({
    ts: _get(row, ['ts'], 0),
    value: consMW[i],
  }))

  const powerAvailabilityData = _map(tail, (row, i) => ({
    ts: _get(row, ['ts'], 0),
    value: availMW[i],
  }))

  const powerSeries = buildLineChart([
    {
      label: 'Power Consumption',
      data: powerConsumptionData,
      color: CHART_COLORS.blue,
    },
    {
      label: 'Power Availability',
      data: powerAvailabilityData,
      color: COLOR.MINT_GREEN,
    },
  ])

  const energyMetrics: ReportMetric[] = [
    { id: 'avg_power_consumption', label: 'Avg Power Consumption', value: avg(consMW), unit: 'MW' },
    {
      id: 'avg_power_availability',
      label: 'Avg Power Availability',
      value: avg(availMW),
      unit: 'MW',
    },
    {
      id: 'avg_energy_cost',
      label: 'Avg Energy Cost',
      value: avg(energyCostUSD),
      unit: '$/bucket',
    },
    {
      id: 'avg_operations_cost',
      label: 'Avg Operations Cost',
      value: avg(opsCostUSD),
      unit: '$/bucket',
    },
    { id: 'avg_all_in_cost', label: 'Avg All-in Cost', value: avg(allInUSD), unit: '$/bucket' },
    {
      id: 'avg_energy_revenue',
      label: 'Avg Energy Revenue',
      value: avg(revenueUSD),
      unit: '$/bucket',
    },
  ]

  return {
    energyMetrics,
    revenueVsCost,
    powerSeries,
    units: { revenueCostUnit: '$/bucket' },
  }
}
