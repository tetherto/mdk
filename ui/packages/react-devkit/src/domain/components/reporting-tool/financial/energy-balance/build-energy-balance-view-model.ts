import { type AverageDowntimeChartData, CHART_COLORS, CURRENCY, formatNumber } from '@primitives'
import _isNil from 'lodash/isNil'
import _map from 'lodash/map'
import _meanBy from 'lodash/meanBy'
import _sumBy from 'lodash/sumBy'

import type { EnergyBalanceLogEntry, EnergyBalanceResponse, FinancePeriod } from '@domain/types/finance'
import type { FinancialDateRange, PeriodType } from '../../utils/financial-period'
import { getPeriodKey, getPeriodType, toFinancePeriod } from '../../utils/financial-period'

import type {
  EnergyCostChartInput,
  EnergyCostMetrics,
  EnergyRevenueMetrics,
  ThresholdBarChartInput,
  ThresholdLineChartInput,
} from './energy-balance.types'

// TODO: Candidate for extraction into @tetherto/mdk-ui-foundation
const BTC_SATS = 100_000_000
const SATS_THRESHOLD = 100_000

export type DisplayMode = typeof CURRENCY.USD_LABEL | typeof CURRENCY.BTC_LABEL

export const barLabelFormatter = (value: number): string => {
  if (_isNil(value)) return ''
  if (value === 0) return '0'
  return formatNumber(value)
}

export const usdBarLabelFormatter = (value: number): string => {
  if (_isNil(value)) return ''
  if (value === 0) return '0'
  return formatNumber(value, { maximumFractionDigits: 0 })
}

export const usdBarLabelFormatterWithDecimals = (value: number): string => {
  if (_isNil(value)) return ''
  if (value === 0) return '0'
  return formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export const rateLabelFormatter = (value: number): string =>
  formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 4 })

export const btcBarLabelFormatter = (value: number): string => {
  if (_isNil(value)) return ''
  if (value === 0) return '0'
  return formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 6 })
}

type PeriodRow = {
  ts: number
  period: string
  sitePowerMW: number
  consumptionMWh: number
  revenueBTC: number
  revenueUSD: number
  energyRevenueUsdPerMw: number
  energyRevenueBtcPerMw: number
  totalCostsUSD: number
  energyCostsUSD: number
  operationalCostsUSD: number
  curtailmentRate: number
  operationalIssuesRate: number
}

export type EnergyBalanceQueryParams = {
  start: number
  end: number
  period: FinancePeriod
}

export type EnergyBalanceData = {
  revenueMetrics: EnergyRevenueMetrics | null
  costMetrics: EnergyCostMetrics | null
  energyRevenueChartInput: ThresholdBarChartInput
  averageDowntimeData: AverageDowntimeChartData
  powerChartInput: ThresholdLineChartInput
  powerChartCostInput: ThresholdLineChartInput
  energyCostChartInput: EnergyCostChartInput
  revenueBarLabelFormatter: (v: number) => string
  costBarLabelFormatter: (v: number) => string
  hasData: boolean
  period: FinancePeriod
  periodType: PeriodType
}

export const buildEnergyBalanceQueryParams = (
  dateRange: FinancialDateRange | null,
): EnergyBalanceQueryParams | null => {
  if (dateRange == null || !dateRange.start || !dateRange.end) return null
  return {
    start: dateRange.start,
    end: dateRange.end,
    period: toFinancePeriod(dateRange.period),
  }
}

const buildPeriodRows = (log: EnergyBalanceLogEntry[], periodType: PeriodType): PeriodRow[] =>
  _map(log, (entry) => {
    const sitePowerMW = (entry.powerW || 0) / 1e6
    const energyCostsUSD = entry.energyCostUSD || 0
    const totalCostsUSD = entry.totalCostUSD || 0
    const operationalCostsUSD = Math.max(totalCostsUSD - energyCostsUSD, 0)
    const energyRevenueUsdPerMw = entry.energyRevenuePerMWh ?? 0
    const energyRevenueBtcPerMw =
      entry.consumptionMWh > 0 ? entry.revenueBTC / entry.consumptionMWh : 0

    return {
      ts: entry.ts,
      period: getPeriodKey(entry.ts, periodType),
      sitePowerMW,
      consumptionMWh: entry.consumptionMWh || 0,
      revenueBTC: entry.revenueBTC || 0,
      revenueUSD: entry.revenueUSD || 0,
      energyRevenueUsdPerMw,
      energyRevenueBtcPerMw,
      totalCostsUSD,
      energyCostsUSD,
      operationalCostsUSD,
      curtailmentRate: entry.curtailmentRate ?? 0,
      operationalIssuesRate: entry.operationalIssuesRate ?? 0,
    }
  })

const buildEnergyCostChartInput = (
  rows: PeriodRow[],
  labels: string[],
  costDisplayMode: DisplayMode,
): EnergyCostChartInput => {
  const revenueValuesUSD = _map(rows, 'energyRevenueUSD_MW')
  const allInCostValuesUSD = _map(rows, (r) =>
    r.sitePowerMW > 0 ? r.totalCostsUSD / r.sitePowerMW : 0,
  )

  if (costDisplayMode === CURRENCY.USD_LABEL) {
    return {
      labels,
      series: [
        { label: 'All-In Cost', values: allInCostValuesUSD, color: CHART_COLORS.orange },
        { label: 'Revenue', values: revenueValuesUSD, color: CHART_COLORS.SKY_BLUE },
      ],
      btcUnit: null,
    }
  }

  const revenueValuesSats = _map(rows, (r) => r.energyRevenueBtcPerMw * BTC_SATS)
  const allInCostValuesSats = _map(rows, (r) => {
    if (r.sitePowerMW <= 0 || r.revenueBTC <= 0) return 0
    const derivedPriceUSD = r.revenueUSD / r.revenueBTC
    const costPerMW = r.totalCostsUSD / r.sitePowerMW
    return (costPerMW / derivedPriceUSD) * BTC_SATS
  })

  const maxSatsValue = Math.max(0, ...revenueValuesSats, ...allInCostValuesSats)
  const useBTC = maxSatsValue >= SATS_THRESHOLD
  const revenueValuesOut = useBTC ? _map(revenueValuesSats, (v) => v / BTC_SATS) : revenueValuesSats
  const costValuesOut = useBTC
    ? _map(allInCostValuesSats, (v) => v / BTC_SATS)
    : allInCostValuesSats

  return {
    labels,
    series: [
      { label: 'All-In Cost', values: costValuesOut, color: CHART_COLORS.orange },
      { label: 'Revenue', values: revenueValuesOut, color: CHART_COLORS.SKY_BLUE },
    ],
    btcUnit: useBTC ? CURRENCY.BTC_LABEL : CURRENCY.SATS,
  }
}

export const buildEnergyBalanceViewModel = ({
  dateRange,
  data,
  revenueDisplayMode,
  costDisplayMode,
  availablePowerMW,
}: {
  dateRange: FinancialDateRange | null
  data: EnergyBalanceResponse | undefined
  revenueDisplayMode: DisplayMode
  costDisplayMode: DisplayMode
  availablePowerMW: number
}): EnergyBalanceData => {
  const periodType = getPeriodType(dateRange)
  const period = toFinancePeriod(dateRange?.period)

  const log: EnergyBalanceLogEntry[] = data?.log ?? []
  const summary = data?.summary

  const rows = buildPeriodRows(log, periodType)
  const hasData = Boolean(dateRange && rows.length > 0)

  const revenueMetrics: EnergyRevenueMetrics | null =
    hasData && summary
      ? {
          curtailmentRate: (summary.avgCurtailmentRate ?? 0) * 100,
          operationalIssuesRate: (summary.avgOperationalIssuesRate ?? 0) * 100,
        }
      : null

  const costMetrics: EnergyCostMetrics | null = hasData
    ? (() => {
        const avgPowerConsumption = _meanBy(rows, 'sitePowerMW') || 0
        const totalEnergyCosts = _sumBy(rows, 'energyCostsUSD') || 0
        const totalOperationalCosts = _sumBy(rows, 'operationalCostsUSD') || 0
        const totalRevenue = _sumBy(rows, 'revenueUSD') || 0
        const totalPower = _sumBy(rows, 'sitePowerMW') || 1
        return {
          avgPowerConsumption,
          avgEnergyCost: totalEnergyCosts / totalPower,
          avgAllInCost: (totalEnergyCosts + totalOperationalCosts) / totalPower,
          avgPowerAvailability: availablePowerMW,
          avgOperationsCost: totalOperationalCosts / totalPower,
          avgEnergyRevenue: totalRevenue / totalPower,
        }
      })()
    : null

  const labels = _map(rows, 'period')
  const revenueValuesUSD = _map(rows, 'energyRevenueUsdPerMw')
  const revenueValuesBTC = _map(rows, 'energyRevenueBtcPerMw')

  const energyRevenueChartInput: ThresholdBarChartInput = {
    labels,
    series: [
      {
        label:
          revenueDisplayMode === CURRENCY.USD_LABEL
            ? 'Revenue (USD/MWh)'
            : `Revenue (${CURRENCY.BTC_LABEL}/MWh)`,
        values: revenueDisplayMode === CURRENCY.USD_LABEL ? revenueValuesUSD : revenueValuesBTC,
        color: CHART_COLORS.red,
      },
    ],
  }

  const averageDowntimeData: AverageDowntimeChartData = {
    labels,
    curtailment: _map(rows, 'curtailmentRate'),
    operationalIssues: _map(rows, 'operationalIssuesRate'),
  }

  const powerPoints = _map(rows, (r) => ({ ts: r.ts, value: r.sitePowerMW }))

  const powerChartInput: ThresholdLineChartInput = {
    series: [{ label: 'Power Consumption', points: powerPoints, color: CHART_COLORS.orange }],
    constants: [
      {
        label: 'Power Availability',
        value: availablePowerMW,
        color: CHART_COLORS.green,
        style: { borderDash: [5, 5] },
      },
    ],
  }

  const powerChartCostInput: ThresholdLineChartInput = {
    series: [{ label: 'Power Consumption', points: powerPoints, color: CHART_COLORS.blue }],
    constants: [
      {
        label: 'Power Availability',
        value: availablePowerMW,
        color: CHART_COLORS.red,
        style: { borderDash: [5, 5] },
      },
    ],
  }

  const revenueBarLabelFormatter =
    revenueDisplayMode === CURRENCY.USD_LABEL
      ? usdBarLabelFormatterWithDecimals
      : btcBarLabelFormatter

  const costBarLabelFormatter =
    costDisplayMode === CURRENCY.USD_LABEL ? usdBarLabelFormatter : btcBarLabelFormatter

  return {
    revenueMetrics,
    costMetrics,
    energyRevenueChartInput,
    averageDowntimeData,
    powerChartInput,
    powerChartCostInput,
    energyCostChartInput: buildEnergyCostChartInput(rows, labels, costDisplayMode),
    revenueBarLabelFormatter,
    costBarLabelFormatter,
    hasData,
    period,
    periodType,
  }
}
