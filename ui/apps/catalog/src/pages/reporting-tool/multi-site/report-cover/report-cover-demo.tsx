import {
  MiningReport,
  parseDateRange,
  PERIOD_MAP,
  type ReportPeriod,
} from '@tetherto/mdk-react-devkit/foundation'
import { type ReactElement, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { buildDemoMiningReportResponse } from '../build-demo-mining-report-response'
import { DEMO_REPORT_SITES } from '../demo-report-sites'
import { getDemoReportScope } from '../demo-report-routes'

const DEFAULT_DATE_RANGE = 'Mar 15 - Mar 21, 2026'

export const ReportCoverDemo = (): ReactElement => {
  const { siteId: routeSiteId } = useParams<{ siteId?: string }>()
  const [searchParams] = useSearchParams()

  const scope = useMemo(() => getDemoReportScope(routeSiteId), [routeSiteId])

  const reportType = searchParams.get('reportType') || 'weekly'
  const dateRange = searchParams.get('dateRange') || DEFAULT_DATE_RANGE
  const location = searchParams.get('location') || scope.locationLabel

  const period = (PERIOD_MAP[reportType] ?? 'daily') as ReportPeriod

  const reportData = useMemo(() => {
    const { startDate, endDate } = parseDateRange(dateRange)
    return buildDemoMiningReportResponse({
      regions: scope.siteId ? [scope.siteId] : undefined,
      startDate,
      endDate,
      period,
    })
  }, [dateRange, period, scope.siteId])

  return (
    <>
      <MiningReport
        reportType={reportType}
        dateRange={dateRange}
        location={location}
        coverTitle={scope.coverTitle}
        data={reportData}
        sites={DEMO_REPORT_SITES}
        siteId={scope.siteId}
        onExportPdf={() => void Promise.resolve()}
      />
    </>
  )
}
