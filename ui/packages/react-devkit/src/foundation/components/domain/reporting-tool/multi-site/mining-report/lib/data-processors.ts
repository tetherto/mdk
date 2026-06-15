import _flatten from 'lodash/flatten'
import _forEach from 'lodash/forEach'
import _get from 'lodash/get'
import _keys from 'lodash/keys'
import _map from 'lodash/map'
import _slice from 'lodash/slice'
import _sortBy from 'lodash/sortBy'
import _takeRight from 'lodash/takeRight'

import type { AggregatedDataItem, LogEntry, RegionData, ReportApiResponse } from '../mining-report.types'

import { fillMissingPeriodsInAggregated, getLabelFormat } from './date-range-utils'
import { safeNum } from './mining-utils'

/**
 * Data processor types
 */

// Aggregator interface
export type Aggregator<T> = {
  init: () => T
  process: (bucket: T & { ts: number }, row: LogEntry) => void
}

// Hashrate bucket structure
export type HashrateBucket = {
  ts: number
  phsSum: number
  usdSum: number
}

// Cost bucket structure
export type CostBucket = {
  ts: number
  energyCost: number
  opsCost: number
  revenueBTC: number
  revenueUSD: number
  hashrateMHS: number[]
  count: number
}

// Efficiency bucket structure
export type EfficiencyBucket = {
  ts: number
  efficiencySum: number
  count: number
}

// Network data by timestamp
export type NetworkDataByTs = {
  [ts: number]: {
    usd: number
    phs: number
  }
}

// Nominal values extracted from region
export type NominalValues = {
  hashratePHs: number
  efficiency: number
  minerCapacity: number
}

/**
 * Process and sort logs, applying a limit
 */
export const processSortedLogs = (logs: LogEntry[][], limit?: number): LogEntry[] => {
  const flattened = _flatten(logs || [])
  const sorted = _sortBy(flattened, (r) => _get(r, ['ts'], 0))
  return limit ? _takeRight(sorted, limit) : sorted
}

/**
 * Group logs by time period using a label formatter
 */
export const groupLogsByPeriod = <T>(
  logsPerSource: LogEntry[][],
  labelFormatter: (ts: number) => string,
  aggregator: Aggregator<T>,
): Record<string, T & { ts: number }> => {
  const buckets: Record<string, T & { ts: number }> = {}

  _forEach(logsPerSource, (logs) => {
    const sorted = _sortBy(logs || [], 'ts')
    _forEach(sorted, (row) => {
      const label = labelFormatter(row.ts)
      if (!buckets[label]) {
        buckets[label] = { ts: row.ts, ...aggregator.init() }
      }
      aggregator.process(buckets[label], row)
    })
  })

  return buckets
}

/**
 * Apply day limit to bucketed data
 */
export const applyDayLimit = <T extends { ts: number }>(
  buckets: Record<string, T>,
  days: number,
): string[] => {
  const allLabels = _sortBy(_keys(buckets), (labelKey) => buckets[labelKey]?.ts ?? 0)
  return _slice(allLabels, Math.max(0, allLabels.length - days))
}

/**
 * Create aggregator for hashrate data
 */
export const createHashrateAggregator = (): Aggregator<Omit<HashrateBucket, 'ts'>> => ({
  init: () => ({ phsSum: 0, usdSum: 0 }),
  process: (bucket, row) => {
    const phs = safeNum(row.hashrateMHS) / 1e9
    const price = safeNum(row.currentBTCPrice)
    const hashRevBTC = safeNum(row.hashRevenueBTC_PHS_d ?? row.totalRevenueBTC)
    const hashRevUSD = safeNum(row.hashRevenueUSD_PHS_d) || hashRevBTC * price

    bucket.phsSum += phs
    bucket.usdSum += hashRevUSD
    bucket.ts = Math.max(bucket.ts, safeNum(row.ts))
  },
})

/**
 * Create aggregator for cost data
 */
export const createCostAggregator = (): Aggregator<Omit<CostBucket, 'ts'>> => ({
  init: () => ({
    energyCost: 0,
    opsCost: 0,
    revenueBTC: 0,
    revenueUSD: 0,
    hashrateMHS: [],
    count: 0,
  }),
  process: (bucket, row) => {
    bucket.energyCost += safeNum(row.totalEnergyCostsUSD)
    bucket.opsCost += safeNum(row.totalOperationalCostsUSD)
    bucket.revenueBTC += safeNum(row.totalRevenueBTC)
    bucket.revenueUSD += safeNum(row.revenueUSD)
    bucket.hashrateMHS.push(safeNum(row.hashrateMHS))
    bucket.count += 1
    bucket.ts = Math.max(bucket.ts, safeNum(row.ts))
  },
})

/**
 * Create aggregator for efficiency data
 */
export const createEfficiencyAggregator = (): Aggregator<Omit<EfficiencyBucket, 'ts'>> => ({
  init: () => ({
    efficiencySum: 0,
    count: 0,
  }),
  process: (bucket, row) => {
    const efficiency = safeNum(row.efficiencyWThs)
    if (efficiency > 0) {
      bucket.efficiencySum += efficiency
      bucket.count += 1
    }
    bucket.ts = Math.max(bucket.ts, safeNum(row.ts))
  },
})

/**
 * Process network data by timestamp for hashprice calculations
 */
export const processNetworkData = (globalLogs: LogEntry[]): NetworkDataByTs => {
  const networkByTs: NetworkDataByTs = {}

  _forEach(globalLogs, (row) => {
    const ts = _get(row, ['ts'], 0)
    const phs = safeNum(_get(row, ['hashrateMHS'], 0)) / 1e9
    const hrBTC = safeNum(_get(row, ['hashRevenueBTC_PHS_d']))
    const price = safeNum(_get(row, ['currentBTCPrice']))
    const hrUSD = safeNum(_get(row, ['hashRevenueUSD_PHS_d']), hrBTC * price)

    const bucket = (networkByTs[ts] ||= { usd: 0, phs: 0 })
    bucket.usd += hrUSD
    bucket.phs += phs
  })

  return networkByTs
}

/**
 * Find region data by site code
 */
export const findRegionBySite = (
  api: ReportApiResponse | null | undefined,
  siteCode: string | null | undefined,
): RegionData | null => {
  if (!siteCode || !api?.regions) return null

  return api.regions.find((r) => r?.region === siteCode) || null
}

/**
 * Extract nominal values from region data
 */
export const extractNominalValues = (region: RegionData | null | undefined): NominalValues => {
  if (!region) {
    return {
      hashratePHs: 0,
      efficiency: 0,
      minerCapacity: 0,
    }
  }

  return {
    hashratePHs: safeNum(region.nominalHashrate) / 1e15,
    efficiency: safeNum(region.nominalEfficiency),
    minerCapacity: safeNum(region.nominalMinerCapacity),
  }
}

/**
 * Process aggregated data with optional missing period filling
 * This is a common pattern used across multiple chart builders
 */
export const processAggregatedData = (
  byLabel: Record<string, Record<string, unknown>>,
  allLabels: string[],
  period: string,
  startDate: string | Date | number | null | undefined,
  endDate: string | Date | number | null | undefined,
  fallbackLimit: number,
): AggregatedDataItem[] => {
  // Convert to array format for processing
  const aggregatedData: AggregatedDataItem[] = _map(allLabels, (label) => ({
    label,
    ...byLabel[label],
  }))

  // Fill missing periods if date range is provided
  let finalAggregatedData = aggregatedData
  if (startDate && endDate) {
    // Determine label format based on period
    const labelFormat = getLabelFormat(period)
    finalAggregatedData = fillMissingPeriodsInAggregated(
      aggregatedData,
      startDate,
      endDate,
      period,
      labelFormat,
    )
  } else {
    finalAggregatedData = aggregatedData.slice(-fallbackLimit)
  }

  return finalAggregatedData
}
