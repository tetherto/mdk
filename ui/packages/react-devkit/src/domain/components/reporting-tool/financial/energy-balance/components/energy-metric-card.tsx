import { formatNumber } from '@primitives'
import type { ReactElement } from 'react'

import { SingleStatCard } from '../../../../explorer/details-view/single-stat-card/single-stat-card'

export type EnergyMetricCardProps = {
  name: string
  value: number
  unit: string
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
