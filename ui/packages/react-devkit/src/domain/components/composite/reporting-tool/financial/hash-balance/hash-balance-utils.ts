import { CURRENCY, getBeginningOfMonth, getEndOfYesterday } from '@primitives'

import { PERIOD, TIMEFRAME_TYPE, type TimeframeTypeValue } from '../../../../../constants/ranges'
import type { HashRevenueLogEntry, HashRevenueResponse, HashRevenueTotals } from '@domain/types/finance'
import {
  type FinancialDateRange,
  getPeriodType,
} from '../../../../reporting-tool/utils/financial-period'
import { rangeOfYear } from '../../../../reporting-tool/timeframe-controls/timeframe-controls.helper'

import {
  buildCombinedCostChartInput,
  buildNetworkHashpriceChartInput,
  buildNetworkHashrateLineData,
  buildSiteHashRevenueChartInput,
} from './hash-balance-chart.utils'
import { getHashBalancePerPhDayUnit } from './hash-balance-format.utils'
import type {
  HashBalanceCurrency,
  HashBalanceMetric,
  UseHashBalanceDerived,
} from './hash-balance.types'

const filterLogByDateRange = (
  log: HashRevenueLogEntry[],
  dateRange: FinancialDateRange | null,
): HashRevenueLogEntry[] => {
  if (!dateRange) return []

  return log.filter((entry) => entry.ts >= dateRange.start && entry.ts <= dateRange.end)
}

export const getHashBalanceDefaultRange = (
  timeframeType: TimeframeTypeValue | null,
  now: Date = new Date(),
): FinancialDateRange => {
  const isDailyPeriod =
    timeframeType === TIMEFRAME_TYPE.MONTH || timeframeType === TIMEFRAME_TYPE.WEEK

  if (isDailyPeriod) {
    return {
      period: PERIOD.DAILY,
      start: getBeginningOfMonth(now).getTime(),
      end: getEndOfYesterday().getTime(),
    }
  }

  const [start, end] = rangeOfYear(now.getFullYear())

  return {
    start: start.getTime(),
    end: end.getTime(),
    period: PERIOD.MONTHLY,
  }
}

export const getInitialHashBalanceDateRange = (now: Date = new Date()): FinancialDateRange =>
  getHashBalanceDefaultRange(TIMEFRAME_TYPE.YEAR, now)

export const getRevenueMetrics = (
  summary: HashRevenueTotals | undefined,
  currency: HashBalanceCurrency,
): HashBalanceMetric[] => [
  {
    label: 'Avg Hash Revenue',
    unit: getHashBalancePerPhDayUnit(currency),
    value:
      currency === CURRENCY.BTC_LABEL
        ? (summary?.avgHashRevenueBTCPerPHsPerDay ?? 0)
        : (summary?.avgHashRevenueUSDPerPHsPerDay ?? 0),
  },
  {
    label: 'Avg Network Hashprice',
    unit: getHashBalancePerPhDayUnit(currency),
    value:
      currency === CURRENCY.BTC_LABEL
        ? (summary?.avgNetworkHashPriceBTCPerPHsPerDay ?? 0)
        : (summary?.avgNetworkHashPriceUSDPerPHsPerDay ?? 0),
  },
]

export const getCostMetrics = (summary: HashRevenueTotals | undefined): HashBalanceMetric[] => [
  {
    label: 'Avg Hash Cost',
    unit: getHashBalancePerPhDayUnit(CURRENCY.USD_LABEL),
    value: summary?.avgHashCostUSDPerPHsPerDay ?? 0,
    isHighlighted: true,
  },
  {
    label: 'Avg Hash Revenue',
    unit: getHashBalancePerPhDayUnit(CURRENCY.USD_LABEL),
    value: summary?.avgHashRevenueUSDPerPHsPerDay ?? 0,
  },
  {
    label: 'Avg Network Hashprice',
    unit: getHashBalancePerPhDayUnit(CURRENCY.USD_LABEL),
    value: summary?.avgNetworkHashPriceUSDPerPHsPerDay ?? 0,
  },
]

export const isYearlyMonthlyView = (timeframeType: TimeframeTypeValue | null): boolean =>
  timeframeType === TIMEFRAME_TYPE.YEAR

export const isWeeklyCostDisclaimer = (timeframeType: TimeframeTypeValue | null): boolean =>
  timeframeType === TIMEFRAME_TYPE.WEEK

export const hasNetworkHashrateInLog = (log: HashRevenueLogEntry[]): boolean =>
  log.some((entry) => entry.networkHashrateMhs != null && Number.isFinite(entry.networkHashrateMhs))

export const deriveHashBalanceView = (
  data: HashRevenueResponse | null | undefined,
  log: HashRevenueLogEntry[] | undefined,
  dateRange: FinancialDateRange,
  currency: HashBalanceCurrency,
  timeframeType: TimeframeTypeValue | null = TIMEFRAME_TYPE.YEAR,
): UseHashBalanceDerived => {
  const periodType = getPeriodType(dateRange)
  const sourceLog = data?.log ?? log ?? []
  const filteredLog = filterLogByDateRange(sourceLog, dateRange)
  const summary = data?.summary

  return {
    filteredLog,
    periodType,
    revenueMetrics: getRevenueMetrics(summary, currency),
    costMetrics: getCostMetrics(summary),
    siteHashRevenueInput: buildSiteHashRevenueChartInput(filteredLog, periodType, currency),
    networkHashpriceInput: buildNetworkHashpriceChartInput(filteredLog, periodType, currency),
    combinedCostInput: buildCombinedCostChartInput(filteredLog, periodType),
    networkHashrateLineData: buildNetworkHashrateLineData(filteredLog),
    showCombinedCostChart: isYearlyMonthlyView(timeframeType) && filteredLog.length > 0,
    showWeeklyCostDisclaimer: isWeeklyCostDisclaimer(timeframeType),
    isEmpty: filteredLog.length === 0,
    isNetworkHashrateEmpty: !hasNetworkHashrateInLog(filteredLog),
  }
}
