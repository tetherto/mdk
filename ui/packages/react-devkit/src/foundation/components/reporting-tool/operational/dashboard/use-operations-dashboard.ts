import { mhsToThs, toMW } from '@core'
import { useMemo } from 'react'

import type { LineChartCardData } from '../../../line-chart-card'

import {
  CONSUMPTION_LABELS,
  EFFICIENCY_LABELS,
  formatTrendValue,
  HASHRATE_LABELS,
  MINERS_STACK_GROUP,
  MINERS_STATUS_CONFIG,
  NOMINAL_LINE_COLOR,
  TREND_SERIES_COLOR,
} from './dashboard.constants'
import type {
  MinersStatusChartData,
  OperationsMinersInput,
  OperationsTrendInput,
  UseOperationsDashboardInput,
  UseOperationsDashboardResult,
} from './dashboard.types'

type TrendLabels = { series: string; nominal: string }

const EMPTY_TREND: LineChartCardData = { datasets: [] }

/**
 * Builds a {@link LineChartCardData} payload from a raw metric log, converting
 * each value to its display unit and adding a flat reference-line dataset when
 * a nominal value is supplied (lightweight-charts has no native reference line).
 */
const buildTrendData = (
  input: OperationsTrendInput | undefined,
  labels: TrendLabels,
  convert: (value: number) => number,
): LineChartCardData => {
  const log = input?.log ?? []
  if (log.length === 0) return EMPTY_TREND

  const points = log.map(({ ts, value }) => ({ x: ts, y: convert(value) }))

  const datasets: LineChartCardData['datasets'] = [
    { label: labels.series, borderColor: TREND_SERIES_COLOR, data: points },
  ]

  const nominal = input?.nominalValue
  if (nominal != null && Number.isFinite(nominal)) {
    const nominalY = convert(nominal)
    datasets.push({
      label: labels.nominal,
      borderColor: NOMINAL_LINE_COLOR,
      data: points.map(({ x }) => ({ x, y: nominalY })),
    })
  }

  return { datasets, yTicksFormatter: formatTrendValue }
}

/** Formats an epoch-ms bucket timestamp as an `MM-DD` x-axis label. */
const formatDayLabel = (ts: number): string => {
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

const buildMinersData = (input: OperationsMinersInput | undefined): MinersStatusChartData => {
  const valid = (input?.log ?? [])
    .map((entry) => ({ entry, label: formatDayLabel(entry.ts) }))
    .filter(({ label }) => label !== '')
  if (valid.length === 0) return { labels: [], datasets: [] }

  const labels = valid.map(({ label }) => label)
  const datasets = MINERS_STATUS_CONFIG.map((status) => ({
    label: status.label,
    stack: MINERS_STACK_GROUP,
    borderColor: status.color,
    data: valid.map(({ entry }) => entry[status.key] ?? 0),
  }))

  return { labels, datasets }
}

/**
 * Shapes raw operational metric logs into chart-ready payloads for the four
 * operational-dashboard cards. DI-style: it never fetches - wire your data
 * layer (RTK Query, TanStack, fixtures) and pass the results in. All unit
 * conversion and series shaping happens here so the chart components stay
 * purely presentational.
 *
 * @category hooks
 * @domain mining-operations
 * @orkCapability hashrate-monitoring
 * @orkCapability energy-consumption
 * @orkCapability device-telemetry
 * @tier agent-ready
 */
export const useOperationsDashboard = (
  input: UseOperationsDashboardInput = {},
): UseOperationsDashboardResult => {
  const { hashrate, consumption, efficiency, miners } = input

  return useMemo(
    () => ({
      hashrate: {
        data: buildTrendData(hashrate, HASHRATE_LABELS, mhsToThs),
        isLoading: hashrate?.isLoading ?? false,
        error: hashrate?.error ?? null,
      },
      consumption: {
        data: buildTrendData(consumption, CONSUMPTION_LABELS, toMW),
        isLoading: consumption?.isLoading ?? false,
        error: consumption?.error ?? null,
      },
      efficiency: {
        data: buildTrendData(efficiency, EFFICIENCY_LABELS, (value) => value),
        isLoading: efficiency?.isLoading ?? false,
        error: efficiency?.error ?? null,
      },
      miners: {
        data: buildMinersData(miners),
        isLoading: miners?.isLoading ?? false,
        error: miners?.error ?? null,
      },
    }),
    [hashrate, consumption, efficiency, miners],
  )
}
