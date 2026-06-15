import { CURRENCY } from '@core'
import type { ReactElement } from 'react'

import { SingleStatCard } from '../../../../explorer/details-view/single-stat-card/single-stat-card'

import { metricValueProps } from './metric-value-props'

export type ActualEbitdaCardProps = {
  value: number
}

/**
 * Stat card summarising the realised EBITDA for the selected reporting window vs the prior period.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const ActualEbitdaCard = ({ value }: ActualEbitdaCardProps): ReactElement => (
  <SingleStatCard
    variant="highlighted"
    name="Actual EBITDA"
    {...metricValueProps(value, CURRENCY.USD)}
  />
)
