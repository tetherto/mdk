import type { ReportDuration } from './site-reports.constants'

export type SiteReportRecord = {
  from: Date
  to: Date
  publishedAt: Date
}

export type SiteReportViewContext = {
  duration: ReportDuration
  siteName?: string
}

export type SiteReportsProps = {
  className?: string
  pageTitle?: string
  siteName?: string
  duration?: ReportDuration
  defaultDuration?: ReportDuration
  onDurationChange?: (duration: ReportDuration) => void
  reports?: SiteReportRecord[]
  referenceDate?: Date
  onViewReport?: (record: SiteReportRecord, context: SiteReportViewContext) => void
}
