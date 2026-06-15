import type { ReactElement, ReactNode } from 'react'

import ReportCover from './components/ReportCover/ReportCover'
import ReportPage from './components/ReportPage/ReportPage'
import { resolveMiningReportExportControl } from './mining-report-export-control'
import { MiningReportShell } from './mining-report-shell'
import type { DateRangeString } from './mining-report.types'
import { getReportCoverMeta } from './mining-report.util'

export type MiningReportCoverProps = {
  reportType: string
  dateRange: DateRangeString
  coverTitle: string
  location?: string
  isLoading?: boolean
  onExportPdf?: () => void | Promise<void>
  isExporting?: boolean
  exportControls?: ReactNode
}

/**
 * Cover-only mining report page — hero layout and export slot without period body sections.
 *
 * @category dashboards
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier advanced
 */
export const MiningReportCover = ({
  reportType,
  dateRange,
  coverTitle,
  location,
  isLoading = false,
  onExportPdf,
  isExporting = false,
  exportControls,
}: MiningReportCoverProps): ReactElement => {
  const locationLabel = location ?? coverTitle
  const { title, subtitle } = getReportCoverMeta(reportType, locationLabel, dateRange, {
    coverTitle,
  })

  const exportControl = resolveMiningReportExportControl({
    isExporting,
    onExportPdf,
    exportControls,
  })

  return (
    <MiningReportShell exportControl={exportControl}>
      <ReportPage isCover>
        <ReportCover title={title} subtitle={subtitle} isLoading={isLoading} />
      </ReportPage>
    </MiningReportShell>
  )
}

export default MiningReportCover
