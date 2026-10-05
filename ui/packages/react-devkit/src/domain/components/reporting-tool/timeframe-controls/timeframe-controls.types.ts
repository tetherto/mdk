import type { TimeframeTypeValue } from '../../../constants/ranges'

export type TimeframeControlsDateRange = {
  start: number
  end: number
}

export type TimeframeControlsOnRangeChange = (
  range: [Date, Date],
  options: Partial<{ year: number; month: number; period: string }>,
) => void

export type TimeframeControlsProps = Partial<{
  /** Helper text below the controls */
  hint: string
  /** Called when the Reset button is clicked */
  onReset: VoidFunction
  /**
   * Shows the Reset button
   * @default false
   */
  showResetButton: boolean
  /**
   * Show week selector
   * @default true
   */
  isWeekSelectVisible: boolean
  /**
   * Show month selector
   * @default true
   */
  isMonthSelectVisible: boolean
  /**
   * Layout direction
   * @default 'horizontal'
   */
  layout: 'horizontal' | 'stacked'
  /** Current date range */
  dateRange: TimeframeControlsDateRange
  /** Active timeframe type */
  timeframeType: TimeframeTypeValue | null
  /** Called when the range changes */
  onRangeChange: TimeframeControlsOnRangeChange
  /** Called when timeframe type changes */
  onTimeframeTypeChange: (type: TimeframeTypeValue) => void
}>

export type TimeSelection = {
  end: Date
  start: Date
  year: number
  month?: number
  label?: string
}

export type WeekData = {
  start: Date
  end: Date
  label?: string
  bucketYear?: number
  bucketMonth?: number
  disabled?: boolean
}
