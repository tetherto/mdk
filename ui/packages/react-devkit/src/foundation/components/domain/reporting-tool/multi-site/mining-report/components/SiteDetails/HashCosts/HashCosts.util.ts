// @ts-nocheck — temporary port debt; see ../../../PORTING.md (TypeScript strictness)
import _flatten from 'lodash/flatten'
import _get from 'lodash/get'
import _map from 'lodash/map'

import {
  avg,
  buildHashrateChart,
  buildRevenueChart,
  calculateHashRevenueUSD,
  EMPTY_STRUCTURES,
  extractNominalValues,
  findRegionBySite,
  getPeriod,
  makeLabelFormatter,
  mhsToPhs,
  pickLogs,
  processNetworkData,
  processSortedLogs,
  safeNum,
  toPerPh,
  validateApiData,
} from '@/components/domain/reporting-tool/multi-site/mining-report/lib'
import type { ReportApiResponse } from '@/components/domain/reporting-tool/multi-site/mining-report/mining-report.types'

import type { HashCostsChartOptions, ReportMetric } from '../site-details.types'

export const buildHashCostsCharts = (
  api: ReportApiResponse,
  { siteCode, buckets = 30 }: HashCostsChartOptions = {},
) => {
  const apiValidation = validateApiData(api)
  if (!apiValidation.isValid) {
    return EMPTY_STRUCTURES.hashCosts
  }

  const { logsPerSource: siteLogs } = pickLogs(api, siteCode ? [siteCode] : undefined)
  const labelFn = makeLabelFormatter(getPeriod(api))

  const siteProcessed = processSortedLogs(siteLogs, buckets)
  if (!siteProcessed.length) {
    return EMPTY_STRUCTURES.hashCosts
  }

  const { logsPerSource: globalLogs } = pickLogs(api)
  const networkData = processNetworkData(_flatten(globalLogs || []))

  const labels = _map(siteProcessed, (row) => labelFn(_get(row, ['ts'], 0)))

  const phsArr = _map(siteProcessed, (row) => mhsToPhs(_get(row, ['hashrateMHS'], 0)))
  const energyCostArr = _map(siteProcessed, (row) => safeNum(_get(row, ['totalEnergyCostsUSD'], 0)))
  const opsCostArr = _map(siteProcessed, (row) =>
    safeNum(_get(row, ['totalOperationalCostsUSD'], 0)),
  )
  const allInCostArr = _map(energyCostArr, (v, i) => v + opsCostArr[i])

  const hrUsdArr = _map(siteProcessed, (row) => {
    const hrBTC = safeNum(_get(row, ['hashRevenueBTC']))
    const price = safeNum(_get(row, ['currentBTCPrice']))
    const hrUSD = safeNum(_get(row, ['hashRevenueUSD']))
    return calculateHashRevenueUSD(hrBTC, price, hrUSD)
  })

  const seriesAllInCostPerPh = _map(siteProcessed, (_, i) => toPerPh(allInCostArr[i], phsArr[i]))
  const seriesHashRevenuePerPh = _map(siteProcessed, (_, i) => toPerPh(hrUsdArr[i], phsArr[i]))
  const seriesNetworkHashprice = _map(siteProcessed, (row) => {
    const ts = _get(row, ['ts'], 0)
    const networkBucket = networkData[ts]
    return networkBucket ? toPerPh(networkBucket.usd, networkBucket.phs) : 0
  })

  const revCostHashprice = buildRevenueChart(labels, {
    allInCost: seriesAllInCostPerPh,
    hashRevenue: seriesHashRevenuePerPh,
    networkHashprice: seriesNetworkHashprice,
  })

  const region = findRegionBySite(api, siteCode)
  const { hashratePHs: nominalPHs } = extractNominalValues(region)

  const hashrateData = _map(siteProcessed, (row, i) => ({
    ts: _get(row, ['ts'], 0),
    value: phsArr[i],
  }))

  const hashrate = buildHashrateChart(hashrateData, nominalPHs)

  const hashCostMetrics: ReportMetric[] = [
    {
      id: 'avg_hash_cost',
      label: 'Avg Hash Cost',
      value: avg(seriesAllInCostPerPh),
      unit: '$/PH/s/day',
    },
    {
      id: 'avg_hash_revenue',
      label: 'Avg Hash Revenue',
      value: avg(seriesHashRevenuePerPh),
      unit: '$/PH/s/day',
    },
    {
      id: 'avg_network_hashprice',
      label: 'Avg Network Hashprice',
      value: avg(seriesNetworkHashprice),
      unit: '$/PH/s/day',
    },
  ]

  return { revCostHashprice, hashrate, hashCostMetrics }
}
