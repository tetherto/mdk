import type { EnergyReportMinerTypeViewProps } from '../energy-report.types'
import { ENERGY_REPORT_MINER_VIEW_SLICES } from '../energy-report.constants'
import { EnergyReportGroupedBarView } from '../energy-report-grouped-bar-view'

export type { EnergyReportMinerTypeViewProps } from '../energy-report.types'

/**
 * Energy report — power consumption grouped by miner model (latest day in range).
 *
 * @category charts
 * @domain mining-operations
 * @tier advanced
 */
export const EnergyReportMinerTypeView = (props: EnergyReportMinerTypeViewProps) => (
  <EnergyReportGroupedBarView slice={ENERGY_REPORT_MINER_VIEW_SLICES.MINER_TYPE} {...props} />
)
