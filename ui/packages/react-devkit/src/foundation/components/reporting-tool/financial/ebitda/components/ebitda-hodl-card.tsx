import { CURRENCY, formatValueUnit } from '@core'
import type { ReactElement } from 'react'

import { SingleStatCard } from '../../../../explorer/details-view/single-stat-card/single-stat-card'

import { metricValueProps } from './metric-value-props'

export type EbitdaHodlCardProps = {
  value: number
  currentBTCPrice: number
}

/**
 * Stat card projecting EBITDA assuming all produced bitcoin is held instead of sold.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const EbitdaHodlCard = ({ value, currentBTCPrice }: EbitdaHodlCardProps): ReactElement => (
  <SingleStatCard
    variant="highlighted"
    name="EBITDA (HODL scenario - no BTC sold)"
    subtitle={`Current price: ${formatValueUnit(currentBTCPrice, CURRENCY.USD)}`}
    {...metricValueProps(value, CURRENCY.USD)}
  />
)
