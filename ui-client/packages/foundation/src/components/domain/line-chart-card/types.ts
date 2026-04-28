import type { MutableRefObject, ReactNode } from 'react'

import type {
  ChartStatsFooterItem,
  IChartApi,
  LightWeightLineChartProps,
  MinMaxAvg,
} from '@tetherto/core'

export type LineChartCardDataset = {
  /** Label for the dataset (used in legend) */
  label?: string
  /** Line color */
  borderColor: string
  /** Data points */
  data: Array<{ x: number; y: number | null }>
  /** Whether this dataset is visible */
  visible?: boolean
  /** Custom icon for detail legend */
  legendIcon?: ReactNode
  /** Current value for detail legend display */
  currentValue?: {
    value: number | string
    unit?: string
  }
  /** Percentage change for detail legend */
  percentChange?: number | null
}

export type LineChartCardData = {
  /** Chart datasets */
  datasets: LineChartCardDataset[]
} & Partial<{
  /** Y-axis tick formatter */
  yTicksFormatter: (value: number) => string
  /** Price formatter for lightweight-charts */
  priceFormatter: (value: number) => string
  /** Whether to skip value rounding */
  skipRound: boolean
  /** Min/Max/Avg stats for footer */
  minMaxAvg: MinMaxAvg
  /** Additional footer stats */
  footerStats: ChartStatsFooterItem[]
  /** Stats items per column in footer grid */
  footerStatsPerColumn: number
  /** Highlighted value in header */
  highlightedValue: {
    value: string | number
    unit?: string
  }
  /** Secondary label for footer */
  secondaryLabel: {
    title: string
    value: string | number
  }
}>

export type TimelineOption = {
  value: string
  label: string
  disabled?: boolean
}

export type LineChartCardProps = Partial<{
  /** Pre-adapted chart data (use this OR rawData+dataAdapter) */
  data: LineChartCardData
  /** Raw data to be transformed by dataAdapter */
  rawData: unknown
  /** Adapter to transform rawData into LineChartCardData */
  dataAdapter: (data: unknown) => LineChartCardData
  /** Timeline range selector options */
  timelineOptions: TimelineOption[]
  /** Controlled timeline value */
  timeline: string
  /** Default timeline when uncontrolled */
  defaultTimeline: string
  /** Callback when timeline changes */
  onTimelineChange: (timeline: string) => void
  /** Chart title */
  title: string
  /** Show detail legends with current values */
  detailLegends: boolean
  /** Loading state */
  isLoading: boolean
  /** Whether to reset zoom on timeline change (default: true) */
  shouldResetZoom: boolean
  /** Pass-through props to the core LineChart */
  chartProps: Partial<LightWeightLineChartProps>
  /** Ref to the lightweight-charts IChartApi */
  chartRef: MutableRefObject<IChartApi | null>
  /* Chart container min height  */
  minHeight: number | string
  /** Custom class name */
  className: string
}>
