import { CHART_COLORS, CURRENCY, formatValueUnit } from '@core'
import _isNil from 'lodash/isNil'
import _map from 'lodash/map'

import { PERIOD } from '../../../../constants/ranges'
import type { EbitdaLogEntry, EbitdaResponse, EbitdaTotals, FinancePeriod } from '@/types/finance'
import type { FinancialDateRange } from '../../utils/financial-period'
import {
  checkIfAllValuesAreZero,
  getPeriodKey,
  getPeriodType,
  toFinancePeriod,
} from '../../utils/financial-period'
import type { ToBarChartDataInput } from '../../utils/to-bar-chart-data'

import type { EbitdaDisplayMetrics } from './ebitda.types'

const ebitdaBarFormatter = (value: number): string => {
  if (_isNil(value)) return ''
  if (value === 0) return formatValueUnit(0, CURRENCY.USD)
  return formatValueUnit(value, CURRENCY.USD)
}

const btcProducedFormatter = (value: number): string => {
  if (_isNil(value)) return ''
  return formatValueUnit(value, CURRENCY.BTC)
}

export type EbitdaQueryParams = {
  start: number
  end: number
  period: FinancePeriod
}

export type EbitdaViewModel = {
  metrics: EbitdaDisplayMetrics | null
  ebitdaChartInput: ToBarChartDataInput | null
  btcProducedChartInput: ToBarChartDataInput | null
  hasBtcProducedAllZeros: boolean
  currentBTCPrice: number
  /** When false, hide the EBITDA bar group (Moria hides it for `PERIOD.DAILY`). */
  showEbitdaBarChart: boolean
}

export const buildEbitdaQueryParams = (
  dateRange: FinancialDateRange | null,
): EbitdaQueryParams | null => {
  if (dateRange == null || !dateRange.start || !dateRange.end) return null
  return {
    start: dateRange.start,
    end: dateRange.end,
    period: toFinancePeriod(dateRange.period),
  }
}

export const buildEbitdaViewModel = ({
  dateRange,
  data,
}: {
  dateRange: FinancialDateRange | null
  data: EbitdaResponse | undefined
}): EbitdaViewModel => {
  const log: EbitdaLogEntry[] = data?.log ?? []
  const summary: EbitdaTotals | undefined = data?.summary
  const currentBTCPrice = summary?.currentBtcPrice ?? 0
  const hasData = Boolean(dateRange && summary && log.length > 0)

  if (!hasData || !summary || !dateRange) {
    return {
      metrics: null,
      ebitdaChartInput: null,
      btcProducedChartInput: null,
      hasBtcProducedAllZeros: true,
      currentBTCPrice,
      showEbitdaBarChart: false,
    }
  }

  const periodType = getPeriodType(dateRange)
  const labels = _map(log, (entry) => getPeriodKey(entry.ts, periodType))

  const metrics: EbitdaDisplayMetrics = {
    bitcoinProductionCost: summary.avgBtcProductionCost ?? 0,
    bitcoinPrice:
      log.length > 0
        ? log.reduce((sum, entry) => sum + (entry.btcPrice || 0), 0) / log.length
        : currentBTCPrice,
    bitcoinProduced: summary.totalRevenueBTC,
    ebitdaSellingBTC: summary.totalEbitdaSelling,
    actualEbitda: summary.totalEbitdaSelling,
    ebitdaNotSellingBTC: summary.totalEbitdaHodl,
  }

  const ebitdaChartInput: ToBarChartDataInput = {
    labels,
    barWidth: 45,
    series: [
      {
        label: 'Sell scenario',
        values: _map(log, (e) => e.ebitdaSelling),
        color: CHART_COLORS.blue,
        dataLabels: {
          formatter: ebitdaBarFormatter,
          anchor: 'end',
          align: 'top',
          offset: 2,
          font: { size: 9 },
          padding: { right: 30 },
        },
      },
      {
        label: 'HODL scenario',
        values: _map(log, (e) => e.ebitdaHodl),
        color: CHART_COLORS.green,
        dataLabels: {
          formatter: ebitdaBarFormatter,
          anchor: 'end',
          align: 'top',
          offset: 2,
          font: { size: 9 },
          padding: { left: 30 },
        },
      },
    ],
  }

  const btcProducedChartInput: ToBarChartDataInput = {
    labels,
    barWidth: 45,
    series: [
      {
        label: 'Bitcoin Produced',
        values: _map(log, (e) => e.revenueBTC),
        color: CHART_COLORS.orange,
        dataLabels: { formatter: btcProducedFormatter },
      },
    ],
  }

  const hasBtcProducedAllZeros = checkIfAllValuesAreZero({
    series: btcProducedChartInput.series.map((s) => ({
      values: Array.isArray(s.values) ? s.values : Object.values(s.values ?? {}),
    })),
  })

  return {
    metrics,
    ebitdaChartInput,
    btcProducedChartInput,
    hasBtcProducedAllZeros,
    currentBTCPrice,
    showEbitdaBarChart: dateRange.period !== PERIOD.DAILY,
  }
}
