import { CURRENCY } from '@primitives'
import type { ReactElement } from 'react'

import { SingleStatCard } from '../../../../explorer/details-view/single-stat-card/single-stat-card'

import { metricValueProps } from './metric-value-props'

export type EbitdaSellingCardProps = {
  value: number
}

/**
 * Stat card projecting EBITDA assuming all produced bitcoin is sold at the daily reference price.
 *
 * @category charts
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const EbitdaSellingCard = ({ value }: EbitdaSellingCardProps): ReactElement => (
  <SingleStatCard
    variant="highlighted"
    name="EBITDA (Sell scenario - all BTC sold)"
    color="var(--mdk-color-primary)"
    {...metricValueProps(value, CURRENCY.USD)}
  />
)
