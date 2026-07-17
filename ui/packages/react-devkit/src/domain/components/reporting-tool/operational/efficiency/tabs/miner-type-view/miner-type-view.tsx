import type { EfficiencyBarViewProps } from '../efficiency-bar-view'
import { EfficiencyBarView } from '../efficiency-bar-view'

export type EfficiencyMinerTypeViewProps = Omit<EfficiencyBarViewProps, 'title'>

/**
 * Efficiency drilldown grouped by miner model — J/TH and uptime for each model in the fleet.
 *
 * @category tables
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const EfficiencyMinerTypeView = (props: EfficiencyMinerTypeViewProps) => (
  <EfficiencyBarView title="Efficiency by Miner Type" {...props} />
)
