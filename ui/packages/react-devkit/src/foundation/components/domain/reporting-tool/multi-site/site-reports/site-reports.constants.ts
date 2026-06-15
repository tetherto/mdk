import { eachMonthOfInterval } from 'date-fns/eachMonthOfInterval'
import { eachWeekOfInterval } from 'date-fns/eachWeekOfInterval'
import { eachYearOfInterval } from 'date-fns/eachYearOfInterval'
import { startOfMonth } from 'date-fns/startOfMonth'
import { startOfWeek } from 'date-fns/startOfWeek'
import { startOfYear } from 'date-fns/startOfYear'

export const REPORT_DURATIONS = {
  YEARLY: 'yearly',
  MONTHLY: 'monthly',
  WEEKLY: 'weekly',
} as const

export type ReportDuration = (typeof REPORT_DURATIONS)[keyof typeof REPORT_DURATIONS]

export const REPORT_DURATION_NAMES: Record<ReportDuration, string> = {
  [REPORT_DURATIONS.YEARLY]: 'Yearly',
  [REPORT_DURATIONS.MONTHLY]: 'Monthly',
  [REPORT_DURATIONS.WEEKLY]: 'Weekly',
}

export const reportDurationOptions: { id: ReportDuration; label: string }[] = [
  { id: REPORT_DURATIONS.WEEKLY, label: REPORT_DURATION_NAMES.weekly },
  { id: REPORT_DURATIONS.MONTHLY, label: REPORT_DURATION_NAMES.monthly },
  { id: REPORT_DURATIONS.YEARLY, label: REPORT_DURATION_NAMES.yearly },
]

type ReportGenerationConfig = {
  durationInterval: 'weeks' | 'months' | 'years'
  getEndDate: (date: Date | number) => Date
  getIntervals: (interval: { start: Date | number; end: Date | number }) => Date[]
}

export const REPORTS_GENERATION_CONFIG: Record<ReportDuration, ReportGenerationConfig> = {
  [REPORT_DURATIONS.WEEKLY]: {
    durationInterval: 'weeks',
    getEndDate: startOfWeek,
    getIntervals: eachWeekOfInterval,
  },
  [REPORT_DURATIONS.MONTHLY]: {
    durationInterval: 'months',
    getEndDate: startOfMonth,
    getIntervals: eachMonthOfInterval,
  },
  [REPORT_DURATIONS.YEARLY]: {
    durationInterval: 'years',
    getEndDate: startOfYear,
    getIntervals: eachYearOfInterval,
  },
}

export const SITE_REPORTS_MIN_YEAR = 2024
