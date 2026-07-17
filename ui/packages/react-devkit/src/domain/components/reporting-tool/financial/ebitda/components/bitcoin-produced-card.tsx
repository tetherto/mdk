import { CURRENCY } from '@primitives'
import type { ReactElement } from 'react'

import { SingleStatCard } from '../../../../explorer/details-view/single-stat-card/single-stat-card'

import { metricValueProps } from './metric-value-props'

export type BitcoinProducedCardProps = {
  value: number
}

/**
 * Stat card summarising the bitcoin produced during the reporting window with delta to prior period.
 *
 * @category charts
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const BitcoinProducedCard = ({ value }: BitcoinProducedCardProps): ReactElement => (
  <SingleStatCard
    variant="highlighted"
    name="Bitcoin Produced"
    {...metricValueProps(value, CURRENCY.BTC)}
  />
)
