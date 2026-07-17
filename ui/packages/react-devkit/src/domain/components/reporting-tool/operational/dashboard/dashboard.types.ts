import type { ReactElement } from 'react'

import type { LineChartCardData } from '../../../line-chart-card'

/** A single timestamped sample of one operational metric (base unit). */
export type OperationsTrendPoint = {
  /** Bucket timestamp in epoch ms. */
  ts: number
  /** Value in its base unit (hashrate: MH/s, power: W, efficiency: W/TH/s). */
  value: number
}

/** DI input for one of the three line-trend charts. */
export type OperationsTrendInput = Partial<{
  /** Raw metric buckets ordered by time. */
  log: ReadonlyArray<OperationsTrendPoint>
  /** Nominal/reference value in the same base unit; renders a flat reference line. */
  nominalValue: number | null
  isLoading: boolean
  error: unknown
}>

/** Per-day miner status counts, already aggregated by the data layer. */
export type OperationsMinersStatusPoint = {
  ts: number
  online: number
  error: number
  offline: number
  sleep: number
  maintenance: number
}

/** DI input for the stacked miners-status chart. */
export type OperationsMinersInput = Partial<{
  log: ReadonlyArray<OperationsMinersStatusPoint>
  isLoading: boolean
  error: unknown
}>

/** Aggregate DI input for {@link useOperationsDashboard}. */
export type UseOperationsDashboardInput = Partial<{
  hashrate: OperationsTrendInput
  consumption: OperationsTrendInput
  efficiency: OperationsTrendInput
  miners: OperationsMinersInput
}>

/** Chart.js dataset for one stacked miners-status series. */
export type MinersStatusDataset = {
  label: string
  stack: string
  borderColor: string
  data: number[]
}

/** Pre-shaped data for the miners-status bar chart. */
export type MinersStatusChartData = {
  labels: string[]
  datasets: MinersStatusDataset[]
}

/** View-model for one line-trend chart (hook output). */
export type OperationsTrendViewModel = {
  data: LineChartCardData
  isLoading: boolean
  error: unknown
}

/** View-model for the miners-status chart (hook output). */
export type OperationsMinersViewModel = {
  data: MinersStatusChartData
  isLoading: boolean
  error: unknown
}

/** Full view-model returned by {@link useOperationsDashboard}. */
export type UseOperationsDashboardResult = {
  hashrate: OperationsTrendViewModel
  consumption: OperationsTrendViewModel
  efficiency: OperationsTrendViewModel
  miners: OperationsMinersViewModel
}

/** Shared props for the three line-trend chart components. */
export type OperationalTrendChartProps = Partial<{
  data: LineChartCardData
  isLoading: boolean
  isExpanded: boolean
  onToggleExpand: VoidFunction
}>

/** Props for the miners-status chart component. */
export type OperationalMinersStatusChartProps = Partial<{
  data: MinersStatusChartData
  isLoading: boolean
  isExpanded: boolean
  onToggleExpand: VoidFunction
}>

/** Data props for one card on the composite (expand state is owned internally). */
export type OperationalDashboardTrendInput = Pick<OperationalTrendChartProps, 'data' | 'isLoading'>
export type OperationalDashboardMinersInput = Pick<
  OperationalMinersStatusChartProps,
  'data' | 'isLoading'
>

/** Props for the operational dashboard composite. */
export type OperationalDashboardProps = Partial<{
  hashrate: OperationalDashboardTrendInput
  consumption: OperationalDashboardTrendInput
  efficiency: OperationalDashboardTrendInput
  miners: OperationalDashboardMinersInput
  /** Optional controls (e.g. a date-range picker) rendered above the grid. */
  controls: ReactElement
}>
