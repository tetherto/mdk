import { CURRENCY } from '@core'
import type { ReactElement } from 'react'

import { SingleStatCard } from '../../../../explorer/details-view/single-stat-card/single-stat-card'

import { metricValueProps } from './metric-value-props'

export type BitcoinProductionCostCardProps = {
  value: number
}

/**
 * Stat card showing the average cost in USD to produce one bitcoin during the reporting window.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const BitcoinProductionCostCard = ({
  value,
}: BitcoinProductionCostCardProps): ReactElement => (
  <SingleStatCard
    variant="highlighted"
    name="Bitcoin Production Cost"
    {...metricValueProps(value, CURRENCY.USD)}
  />
)
