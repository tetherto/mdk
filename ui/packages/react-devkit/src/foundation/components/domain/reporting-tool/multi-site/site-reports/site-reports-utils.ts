import { add } from 'date-fns/add'
import { format } from 'date-fns/format'
import { sub } from 'date-fns/sub'

import { DATE_FORMAT, SHORT_DATE_FORMAT } from '@/constants/dates'

import {
  REPORT_DURATIONS,
  type ReportDuration,
  REPORTS_GENERATION_CONFIG,
  SITE_REPORTS_MIN_YEAR,
} from './site-reports.constants'
import type { SiteReportRecord } from './site-reports.types'

export const formatSiteReportPeriod = (record: SiteReportRecord): string =>
  `${format(record.from, SHORT_DATE_FORMAT)} - ${format(record.to, SHORT_DATE_FORMAT)}`

export const formatSiteReportPublishedAt = (publishedAt: Date): string =>
  format(publishedAt, DATE_FORMAT)

/** Builds rolling published report windows for weekly, monthly, or annual cadence. */
export const buildSiteReportRecords = (
  duration: ReportDuration,
  referenceDate: Date = new Date(),
): SiteReportRecord[] => {
  const config = REPORTS_GENERATION_CONFIG[duration]
  const today = referenceDate

  const end =
    duration === REPORT_DURATIONS.YEARLY ? today : sub(config.getEndDate(today), { days: 1 })

  const start = sub(end, {
    [config.durationInterval]: 10,
  })

  const dates = config.getIntervals({
    start,
    end,
  })

  const filteredDates =
    duration === REPORT_DURATIONS.YEARLY
      ? dates.filter((date) => date.getFullYear() >= SITE_REPORTS_MIN_YEAR)
      : dates

  return filteredDates.map((from) => {
    const to = add(from, {
      [config.durationInterval]: 1,
      days: -1,
    })

    return {
      from,
      to,
      publishedAt: add(to, { days: 1 }),
    }
  })
}
