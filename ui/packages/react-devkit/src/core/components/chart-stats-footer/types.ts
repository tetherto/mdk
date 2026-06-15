export type ChartStatsFooterItem = {
  label: string
  value: string | number
}

export type MinMaxAvg = Partial<{
  min: string
  max: string
  avg: string
}>

export type SecondaryLabel = {
  title: string
  value: string | number
}

export type ChartStatsFooterProps = Partial<{
  /** Min/Max/Avg values row */
  minMaxAvg: MinMaxAvg
  /** Additional stats displayed in a columnar grid */
  stats: ChartStatsFooterItem[]
  /** Number of stat items per column (default: 1) */
  statsPerColumn: number
  /** Secondary label displayed below stats */
  secondaryLabel: SecondaryLabel
  /** Custom class name */
  className: string
}>
