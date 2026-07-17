import { Spinner } from '@primitives'

import type { EnergyReportSiteViewProps } from '../energy-report.types'
import { useEnergyReportSite } from '../use-energy-report-site'
import { EnergyReportSiteViewLoaded } from './energy-report-site-view-loaded'
import './site-view.scss'

export type { EnergyReportSiteViewProps } from '../energy-report.types'

/**
 * Energy report site tab — power trend, power-mode table, and per–mining-unit activity cards.
 *
 * @category charts
 * @domain mining-operations
 * @tier advanced
 */
export const EnergyReportSiteView = ({
  dateRange,
  onRefetchSnapshot,
  snapshotLoading,
  ...siteInput
}: EnergyReportSiteViewProps) => {
  const siteData = useEnergyReportSite({ dateRange, ...siteInput })

  const showSpinner = siteData.isLoading || snapshotLoading

  if (showSpinner) {
    return (
      <div className="mdk-energy-report-site-view mdk-energy-report-site-view--loading">
        <Spinner color="secondary" size="lg" />
      </div>
    )
  }

  return (
    <EnergyReportSiteViewLoaded siteData={siteData} onRefetchSnapshot={onRefetchSnapshot} />
  )
}
