import { formatNumber } from '@primitives'
import type { ReactElement } from 'react'

import { SingleStatCard } from '../../../../explorer/details-view/single-stat-card/single-stat-card'

export type EnergyMetricCardProps = {
  /** Metric label shown on the card */
  name: string
  /** Metric value, formatted via `formatNumber` */
  value: number
  /** Unit suffix shown next to the value */
  unit: string
  /** Text shown when `value` can't be formatted */
  fallback?: string
}

/**
 * Stat card for a single energy balance metric.
 *
 * @category charts
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const EnergyMetricCard = ({
  name,
  value,
  unit,
  fallback,
}: EnergyMetricCardProps): ReactElement => (
  <SingleStatCard
    name={name}
    value={formatNumber(value, {}, fallback)}
    unit={unit}
    variant="highlighted"
  />
)
