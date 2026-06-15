import { type ReactElement, useMemo } from 'react'

import { createReportConfig } from './create-report-config'
import ReportCover from './components/ReportCover/ReportCover'
import ReportPage from './components/ReportPage/ReportPage'
import { resolveMiningReportExportControl } from './mining-report-export-control'
import { MiningReportShell } from './mining-report-shell'
import type { MiningReportProps } from './mining-report.types'
import { getReportCoverMeta } from './mining-report.util'
import './mining-report.scss'

/**
 * Multi-site mining report viewer — cover page plus weekly / monthly / annual
 * period layouts driven by API-shaped `ReportApiResponse` data.
 *
 * @category dashboards
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier advanced
 */
export const MiningReport = ({
  reportType,
  dateRange,
  location,
  coverTitle,
  data: reportData,
  isLoading = false,
  error,
  sites,
  siteId,
  onExportPdf,
  isExporting = false,
  exportControls,
}: MiningReportProps): ReactElement => {
  const reportConfig = useMemo(
    () =>
      reportData?.regions || reportData?.data
        ? createReportConfig(reportType, location, dateRange, reportData, sites, siteId)
        : null,
    [reportType, location, dateRange, reportData, sites, siteId],
  )

  const coverMeta = useMemo(
    () => getReportCoverMeta(reportType, location, dateRange, { coverTitle }),
    [reportType, location, dateRange, coverTitle],
  )

  const exportControl = resolveMiningReportExportControl({
    isExporting,
    onExportPdf,
    exportControls,
  })

  return (
    <MiningReportShell exportControl={exportControl}>
      <ReportPage isCover>
        <ReportCover
          title={coverMeta.title}
          subtitle={coverMeta.subtitle}
          isLoading={isLoading}
        />
      </ReportPage>

      {!isLoading && reportData && !error && reportConfig?.component}
    </MiningReportShell>
  )
}

export default MiningReport
