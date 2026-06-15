import type { ReactElement, ReactNode } from 'react'

type MiningReportShellProps = {
  exportControl: ReactNode
  children: ReactNode
}

export const MiningReportShell = ({
  exportControl,
  children,
}: MiningReportShellProps): ReactElement => (
  <>
    <div className="mdk-mining-report__export-row">{exportControl}</div>
    <div className="mdk-mining-report__details">{children}</div>
  </>
)
