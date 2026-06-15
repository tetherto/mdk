import { type ReportDuration, SiteReports } from '@tetherto/mdk-react-devkit/foundation'
import { format } from 'date-fns/format'
import { type ReactElement, useCallback, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { DemoPageHeader } from '../../../../components/demo-page-header'
import { getDemoReportScope, getSiteReportDetailPath } from '../demo-report-routes'

export const SiteReportsDemo = (): ReactElement => {
  const navigate = useNavigate()
  const { siteId: routeSiteId } = useParams<{ siteId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const scope = useMemo(() => getDemoReportScope(routeSiteId), [routeSiteId])

  const durationParam = searchParams.get('duration')
  const duration: ReportDuration =
    durationParam === 'weekly' || durationParam === 'monthly' || durationParam === 'yearly'
      ? durationParam
      : 'weekly'

  const setDuration = useCallback(
    (next: ReportDuration) => {
      const params = new URLSearchParams(searchParams)
      params.set('duration', next)
      setSearchParams(params)
    },
    [searchParams, setSearchParams],
  )

  return (
    <>
      <DemoPageHeader title={scope.pageTitle} className="demo-page-header--tight" />
      <SiteReports
        pageTitle="Reports"
        siteName={scope.locationLabel}
        duration={duration}
        onDurationChange={setDuration}
        onViewReport={(record, context) => {
          const reportParams = new URLSearchParams({
            reportType: context.duration,
            dateRange: `${format(record.from, 'MMM dd')} - ${format(record.to, 'MMM dd, yyyy')}`,
            location: scope.locationLabel,
          })

          navigate(getSiteReportDetailPath(scope.siteId, reportParams.toString()))
        }}
      />
    </>
  )
}
