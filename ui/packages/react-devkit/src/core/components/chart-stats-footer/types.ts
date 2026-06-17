import type { MinMaxAvgValues } from '../min-max-avg/types'

export type { MinMaxAvgValues as MinMaxAvg }

export type ChartStatsFooterItem = {
  label: string
  value: string | number
}

export type SecondaryLabel = {
  title: string
  value: string | number
}

export type ChartStatsFooterProps = Partial<{
  /** Min/Max/Avg values row */
  minMaxAvg: MinMaxAvgValues
  /** Additional stats displayed in a columnar grid */
  stats: ChartStatsFooterItem[]
  /** Number of stat items per column (default: 1) */
  statsPerColumn: number
  /** Secondary label displayed below stats */
  secondaryLabel: SecondaryLabel
  /** Custom class name */
  className: string
}>
