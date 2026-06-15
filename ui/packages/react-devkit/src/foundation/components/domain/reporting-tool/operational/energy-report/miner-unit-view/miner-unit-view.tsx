import type { EnergyReportMinerUnitViewProps } from '../energy-report.types'
import { ENERGY_REPORT_MINER_VIEW_SLICES } from '../energy-report.constants'
import { EnergyReportGroupedBarView } from '../energy-report-grouped-bar-view'

export type { EnergyReportMinerUnitViewProps } from '../energy-report.types'

/**
 * Energy report — power consumption grouped by mining unit / container.
 *
 * @category charts
 * @domain mining-operations
 * @tier advanced
 */
export const EnergyReportMinerUnitView = (props: EnergyReportMinerUnitViewProps) => (
  <EnergyReportGroupedBarView slice={ENERGY_REPORT_MINER_VIEW_SLICES.MINER_UNIT} {...props} />
)
