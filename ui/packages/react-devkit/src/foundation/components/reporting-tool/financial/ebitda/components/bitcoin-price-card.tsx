import { CURRENCY } from '@core'
import type { ReactElement } from 'react'

import { SingleStatCard } from '../../../../explorer/details-view/single-stat-card/single-stat-card'

import { metricValueProps } from './metric-value-props'

export type BitcoinPriceCardProps = {
  value: number
}

/**
 * Stat card showing the BTC reference price used by the reporting view with currency and timestamp.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const BitcoinPriceCard = ({ value }: BitcoinPriceCardProps): ReactElement => (
  <SingleStatCard
    variant="highlighted"
    name="Bitcoin Price"
    {...metricValueProps(value, CURRENCY.USD)}
  />
)
