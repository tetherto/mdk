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
  hint: string
  onReset: VoidFunction
  showResetButton: boolean
  isWeekSelectVisible: boolean
  isMonthSelectVisible: boolean
  layout: 'horizontal' | 'stacked'
  dateRange: TimeframeControlsDateRange
  timeframeType: TimeframeTypeValue | null
  onRangeChange: TimeframeControlsOnRangeChange
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
