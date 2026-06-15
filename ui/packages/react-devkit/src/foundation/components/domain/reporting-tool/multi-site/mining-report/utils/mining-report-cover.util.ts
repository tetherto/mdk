import _replace from 'lodash/replace'
import _toLower from 'lodash/toLower'
import _trim from 'lodash/trim'

import { getMonthYear } from './mining-report-date.util'

export type ReportCoverMeta = {
  title: string
  subtitle: string
}

export const normalizeReportLocationLabel = (location: string): string =>
  _trim(_replace(location, /\s+report$/i, ''))

export const getReportCoverMeta = (
  reportType: string,
  location: string,
  dateRange: string,
  options?: Partial<{ coverTitle: string }>,
): ReportCoverMeta => {
  const type = _toLower(reportType)
  const displayLocation = normalizeReportLocationLabel(location)
  const title = options?.coverTitle ?? displayLocation

  if (type === 'weekly') {
    return { title, subtitle: `Weekly • ${dateRange}` }
  }

  if (type === 'monthly') {
    const { monthName, year } = getMonthYear(dateRange)
    return {
      title,
      subtitle: monthName && year ? `${monthName} ${year}` : dateRange,
    }
  }

  return {
    title,
    subtitle: `1 Year • ${dateRange}`,
  }
}
