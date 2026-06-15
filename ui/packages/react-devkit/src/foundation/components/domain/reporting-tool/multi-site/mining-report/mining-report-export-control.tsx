import type { ReactNode } from 'react'

import { Button, ExportIcon } from '@core'

export type MiningReportExportControlProps = {
  isExporting?: boolean
  onExportPdf?: () => void | Promise<void>
  exportControls?: ReactNode
}

export const resolveMiningReportExportControl = ({
  isExporting = false,
  onExportPdf,
  exportControls,
}: MiningReportExportControlProps): ReactNode =>
  exportControls ?? (
    <Button icon={<ExportIcon />} loading={isExporting} onClick={() => void onExportPdf?.()}>
      Export PDF
    </Button>
  )
