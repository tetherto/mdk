import type { EfficiencyBarViewProps } from '../efficiency-bar-view'
import { EfficiencyBarView } from '../efficiency-bar-view'

export type EfficiencyMinerUnitViewProps = Omit<EfficiencyBarViewProps, 'title'>

/**
 * Efficiency drilldown by individual miner serial — outliers and worst-performers surface here.
 *
 * @category tables
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const EfficiencyMinerUnitView = (props: EfficiencyMinerUnitViewProps) => (
  <EfficiencyBarView title="Efficiency by Mining Unit" {...props} />
)
