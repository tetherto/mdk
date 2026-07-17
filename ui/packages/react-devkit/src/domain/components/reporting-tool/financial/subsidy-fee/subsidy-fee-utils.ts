import { CHART_COLORS, formatNumber } from '@primitives'
import type { Context as ChartJsPluginDataLabelsContext } from 'chartjs-plugin-datalabels'
import _isNil from 'lodash/isNil'
import _map from 'lodash/map'
import _reduce from 'lodash/reduce'

import { PERIOD } from '../../../../constants/ranges'
import type { SubsidyFeesLogEntry, SubsidyFeesTotals } from '@domain/types/finance'
import {
  type FinancialDateRange,
  getPeriodKey,
  type PeriodType,
} from '../../utils/financial-period'
import { rangeOfMonth } from '../../timeframe-controls/timeframe-controls.helper'

const BTC_SATS = 100_000_000

type AggregatedPeriodData = {
  period: string
  feesBTC: number
  firstTs: number
  feePercent: number
  subsidyBTC: number
  avgSatsPerVByte: number
}

type SubsidyFeeSummary = {
  totalFeesBTC: number
  totalRewardBTC: number
  totalSubsidyBTC: number
  averageFeePercent: number
  averageFeesSatsPerVByte: number
}

/**
 * Default finance range for the subsidy-fee view: current calendar month (via
 * `rangeOfMonth`), with daily granularity selected in the UI.
 */
export const getInitialSubsidyFeeDateRange = (now: Date = new Date()): FinancialDateRange => {
  const [start, end] = rangeOfMonth(now.getFullYear(), now.getMonth())

  return {
    start: start.getTime(),
    end: end.getTime(),
    period: PERIOD.DAILY,
  }
}

export const filterLogByDateRange = (
  log: SubsidyFeesLogEntry[],
  dateRange: FinancialDateRange | null,
): SubsidyFeesLogEntry[] => {
  if (!dateRange) return []

  return log.filter((entry) => entry.ts >= dateRange.start && entry.ts <= dateRange.end)
}

export const mapLogToPeriodData = (
  log: SubsidyFeesLogEntry[],
  periodType: PeriodType,
): AggregatedPeriodData[] =>
  _map(log, (entry) => {
    const subsidySats = Math.max(entry.blockReward - entry.blockTotalFees, 0)
    const subsidyBTC = subsidySats / BTC_SATS
    const feesBTC = entry.blockTotalFees / BTC_SATS
    const totalBTC = subsidyBTC + feesBTC

    return {
      period: getPeriodKey(entry.ts, periodType),
      subsidyBTC,
      feesBTC,
      feePercent: totalBTC > 0 ? (feesBTC / totalBTC) * 100 : 0,
      avgSatsPerVByte: entry.avgFeesSatsVByte ?? 0,
      firstTs: entry.ts,
    }
  })

export const summarizeSubsidyFees = (
  aggregatedData: AggregatedPeriodData[],
  totals?: SubsidyFeesTotals | null,
): SubsidyFeeSummary => {
  const derived = _reduce(
    aggregatedData,
    (acc, row) => {
      acc.totalSubsidyBTC += row.subsidyBTC
      acc.totalFeesBTC += row.feesBTC
      acc.averageFeesSatsPerVByte += row.avgSatsPerVByte
      return acc
    },
    { totalSubsidyBTC: 0, totalFeesBTC: 0, averageFeesSatsPerVByte: 0 },
  )

  const totalSubsidyBTC = totals
    ? Math.max(totals.totalBlockReward - totals.totalBlockTotalFees, 0) / BTC_SATS
    : derived.totalSubsidyBTC
  const totalFeesBTC = totals ? totals.totalBlockTotalFees / BTC_SATS : derived.totalFeesBTC
  const totalRewardBTC = totalSubsidyBTC + totalFeesBTC
  const averageFeePercent = totalRewardBTC > 0 ? (totalFeesBTC / totalRewardBTC) * 100 : 0
  const averageFeesSatsPerVByte =
    aggregatedData.length > 0 ? derived.averageFeesSatsPerVByte / aggregatedData.length : 0

  return {
    totalSubsidyBTC,
    totalFeesBTC,
    totalRewardBTC,
    averageFeePercent,
    averageFeesSatsPerVByte,
  }
}

export const transformToSubsidyFeesChartData = (aggregatedData: AggregatedPeriodData[]) => {
  const labels = _map(aggregatedData, 'period')
  const subsidyValues = _map(aggregatedData, 'subsidyBTC')
  const feesValues = _map(aggregatedData, 'feesBTC')
  const feePercentValues = _map(aggregatedData, (row) => row.feePercent / 100)

  const stackedBarFormatter = (value: number, context?: ChartJsPluginDataLabelsContext): string => {
    if (context?.datasetIndex !== 1) return ''
    if (_isNil(value)) return ''

    const dataIndex = context.dataIndex ?? 0
    const total = (subsidyValues[dataIndex] ?? 0) + (feesValues[dataIndex] ?? 0)
    if (total === 0) return '0'

    return formatNumber(total, { maximumFractionDigits: 3 })
  }

  return {
    labels,
    series: [
      {
        label: 'Subsidy',
        values: subsidyValues,
        color: CHART_COLORS.blue,
        stack: 'subsidy-fees',
        dataLabels: {
          formatter: stackedBarFormatter,
        },
      },
      {
        label: 'Fees',
        values: feesValues,
        color: CHART_COLORS.purple,
        stack: 'subsidy-fees',
        dataLabels: {
          formatter: stackedBarFormatter,
        },
      },
    ],
    lines: [
      {
        label: 'Fee %',
        values: feePercentValues,
        color: CHART_COLORS.red,
        yAxisID: 'y1',
        pointRadius: 0,
        pointHoverRadius: 3,
      },
    ],
    barWidth: 45,
  }
}

const avgFeesFormatter = (value: number): string => {
  if (_isNil(value)) return ''
  if (value === 0) return '0'

  return formatNumber(value, { maximumFractionDigits: 2 })
}

export const transformToAverageFeesChartData = (aggregatedData: AggregatedPeriodData[]) => ({
  labels: _map(aggregatedData, 'period'),
  series: [
    {
      label: 'Average Fees in Sats/vByte',
      values: _map(aggregatedData, 'avgSatsPerVByte'),
      color: CHART_COLORS.purple,
      dataLabels: { formatter: avgFeesFormatter },
    },
  ],
  barWidth: 45,
})
