import type {
  HashRevenueLogEntry,
  HashRevenueResponse,
} from '@tetherto/mdk-react-devkit/foundation'

import _map from 'lodash/map'

import {
  buildMoriaStyleLogEntry,
  buildMoriaStyleYearLog,
  MORIA_HASH_BALANCE_MONTHLY,
} from './hash-balance-moria-demo.fixture'

export const DEMO_HASH_BALANCE_EMPTY_YEAR = 2024

export const DEMO_HASH_BALANCE_SPARSE_FALLBACK_MONTHS = [
  2, // February — Q1
  5, // May — Q2
  8, // August — Q3
  11, // November — Q4
] as const

const timeframePickerYears = (): number[] => {
  const current = new Date().getFullYear()
  return [current, current - 1, current - 2]
}

const sparseMoriaFallbackYear = (year: number): HashRevenueLogEntry[] => {
  const template = MORIA_HASH_BALANCE_MONTHLY[2025]?.[4]

  if (!template) return []

  return _map<number, HashRevenueLogEntry>(DEMO_HASH_BALANCE_SPARSE_FALLBACK_MONTHS, (month) =>
    buildMoriaStyleLogEntry(year, month, template),
  )
}

const summarize = (log: HashRevenueLogEntry[]): HashRevenueResponse['summary'] => {
  if (log.length === 0) {
    return {
      avgHashRevenueBTCPerPHsPerDay: null,
      avgHashRevenueUSDPerPHsPerDay: null,
      avgHashCostBTCPerPHsPerDay: null,
      avgHashCostUSDPerPHsPerDay: null,
      avgNetworkHashPriceBTCPerPHsPerDay: null,
      avgNetworkHashPriceUSDPerPHsPerDay: null,
      totalRevenueBTC: 0,
      totalRevenueUSD: 0,
      totalFeesBTC: 0,
      totalFeesUSD: 0,
    }
  }

  const n = log.length
  const avg = (pick: (e: HashRevenueLogEntry) => number | null) =>
    log.reduce((acc, e) => acc + (pick(e) ?? 0), 0) / n

  return {
    avgHashRevenueBTCPerPHsPerDay: avg((e) => e.hashRevenueBTCPerPHsPerDay),
    avgHashRevenueUSDPerPHsPerDay: avg((e) => e.hashRevenueUSDPerPHsPerDay),
    avgHashCostBTCPerPHsPerDay: avg((e) => e.hashCostBTCPerPHsPerDay),
    avgHashCostUSDPerPHsPerDay: avg((e) => e.hashCostUSDPerPHsPerDay),
    avgNetworkHashPriceBTCPerPHsPerDay: avg((e) => e.networkHashPriceBTCPerPHsPerDay),
    avgNetworkHashPriceUSDPerPHsPerDay: avg((e) => e.networkHashPriceUSDPerPHsPerDay),
    totalRevenueBTC: log.reduce((acc, e) => acc + e.revenueBTC, 0),
    totalRevenueUSD: log.reduce((acc, e) => acc + e.revenueUSD, 0),
    totalFeesBTC: log.reduce((acc, e) => acc + e.feesBTC, 0),
    totalFeesUSD: log.reduce((acc, e) => acc + e.feesUSD, 0),
  }
}

export const buildDemoHashRevenueResponse = (): HashRevenueResponse => {
  const log: HashRevenueLogEntry[] = []

  for (const year of timeframePickerYears()) {
    if (year === DEMO_HASH_BALANCE_EMPTY_YEAR) continue

    if (year in MORIA_HASH_BALANCE_MONTHLY) {
      log.push(...buildMoriaStyleYearLog(year))
      continue
    }

    log.push(...sparseMoriaFallbackYear(year))
  }

  log.sort((a, b) => a.ts - b.ts)

  return {
    log,
    summary: summarize(log),
  }
}
