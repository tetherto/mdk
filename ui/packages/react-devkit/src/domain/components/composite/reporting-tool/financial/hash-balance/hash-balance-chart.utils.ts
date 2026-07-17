import { CURRENCY } from '@primitives'
import _map from 'lodash/map'
import _sortBy from 'lodash/sortBy'

import type { HashRevenueLogEntry } from '@domain/types/finance'
import { getPeriodKey, type PeriodType } from '../../../../reporting-tool/utils/financial-period'
import type { ToBarChartDataInput } from '../../../../reporting-tool/utils/to-bar-chart-data'

import {
  HASH_BALANCE_BAR_WIDTH,
  HASH_BALANCE_COLORS,
  HASH_BALANCE_NETWORK_HASHRATE_LINE_WIDTH,
  hashCostLegendLabel,
  hashRevenueLegendLabel,
  hashRevenueUsdLegendLabel,
  NETWORK_HASHRATE_LINE_LABEL,
  networkHashpriceLegendLabel,
  networkHashpriceUsdLegendLabel,
} from './hash-balance.constants'
import type { HashBalanceCurrency } from './hash-balance.types'

const sortedLog = (log: HashRevenueLogEntry[]): HashRevenueLogEntry[] => _sortBy(log, 'ts')

const labelsFromLog = (log: HashRevenueLogEntry[], periodType: PeriodType): string[] =>
  _map(sortedLog(log), (entry) => getPeriodKey(entry.ts, periodType))

const siteHashRevenuePerPhDay = (
  entry: HashRevenueLogEntry,
  currency: HashBalanceCurrency,
): number =>
  currency === CURRENCY.BTC_LABEL
    ? (entry.hashRevenueBTCPerPHsPerDay ?? 0)
    : (entry.hashRevenueUSDPerPHsPerDay ?? 0)

const networkHashpricePerPhDay = (
  entry: HashRevenueLogEntry,
  currency: HashBalanceCurrency,
): number =>
  currency === CURRENCY.BTC_LABEL
    ? (entry.networkHashPriceBTCPerPHsPerDay ?? 0)
    : (entry.networkHashPriceUSDPerPHsPerDay ?? 0)

export const buildSiteHashRevenueChartInput = (
  log: HashRevenueLogEntry[],
  periodType: PeriodType,
  currency: HashBalanceCurrency,
): ToBarChartDataInput => {
  const ordered = sortedLog(log)

  return {
    labels: labelsFromLog(ordered, periodType),
    series: [
      {
        label: hashRevenueLegendLabel(currency),
        values: _map(ordered, (entry) => siteHashRevenuePerPhDay(entry, currency)),
        color:
          currency === CURRENCY.BTC_LABEL
            ? HASH_BALANCE_COLORS.siteHashRevenueBtc
            : HASH_BALANCE_COLORS.siteHashRevenueUsd,
      },
    ],
    barWidth: HASH_BALANCE_BAR_WIDTH,
  }
}

export const buildNetworkHashpriceChartInput = (
  log: HashRevenueLogEntry[],
  periodType: PeriodType,
  currency: HashBalanceCurrency,
): ToBarChartDataInput => {
  const ordered = sortedLog(log)

  return {
    labels: labelsFromLog(ordered, periodType),
    series: [
      {
        label: networkHashpriceLegendLabel(currency),
        values: _map(ordered, (entry) => networkHashpricePerPhDay(entry, currency)),
        color: HASH_BALANCE_COLORS.networkHashprice,
      },
    ],
    barWidth: HASH_BALANCE_BAR_WIDTH,
  }
}

export const buildCombinedCostChartInput = (
  log: HashRevenueLogEntry[],
  periodType: PeriodType,
): ToBarChartDataInput => {
  const ordered = sortedLog(log)

  return {
    labels: labelsFromLog(ordered, periodType),
    series: [
      {
        label: hashCostLegendLabel(),
        values: _map(ordered, (e) => e.hashCostUSDPerPHsPerDay ?? 0),
        color: HASH_BALANCE_COLORS.costHashCost,
      },
      {
        label: hashRevenueUsdLegendLabel(),
        values: _map(ordered, (e) => e.hashRevenueUSDPerPHsPerDay ?? 0),
        color: HASH_BALANCE_COLORS.costHashRevenue,
      },
      {
        label: networkHashpriceUsdLegendLabel(),
        values: _map(ordered, (e) => e.networkHashPriceUSDPerPHsPerDay ?? 0),
        color: HASH_BALANCE_COLORS.costNetworkHashprice,
      },
    ],
    barWidth: HASH_BALANCE_BAR_WIDTH,
  }
}

export const buildNetworkHashrateLineData = (log: HashRevenueLogEntry[]) => {
  const ordered = sortedLog(log)

  return {
    datasets: [
      {
        label: NETWORK_HASHRATE_LINE_LABEL,
        borderColor: HASH_BALANCE_COLORS.networkHashrateLine,
        borderWidth: HASH_BALANCE_NETWORK_HASHRATE_LINE_WIDTH,
        data: _map(ordered, (entry) => ({
          x: entry.ts,
          y: entry.networkHashrateMhs ?? 0,
        })),
      },
    ],
  }
}
