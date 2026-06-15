import type { ReactElement } from 'react'

import { SingleStatCard } from '../../../explorer/details-view/single-stat-card/single-stat-card'

import type { CostSummaryDisplayMetrics } from './build-cost-summary-view-model'

export type CostMetricsProps = {
  metrics: CostSummaryDisplayMetrics
}

/**
 * Three "$/MWh" tiles that summarise the cost-summary period.
 * Order mirrors the OSS Cost page: All-in (highlighted), Energy, Operations.
 *
 * @category widgets
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const CostMetrics = ({ metrics }: CostMetricsProps): ReactElement => {
  const tiles = [metrics.allInCost, metrics.energyCost, metrics.operationsCost]

  return (
    <div className="mdk-cost__metrics">
      {tiles.map((tile) => (
        <SingleStatCard
          key={tile.label}
          name={tile.label}
          value={tile.value}
          unit={tile.unit}
          variant="highlighted"
          color={tile.isHighlighted ? 'var(--mdk-color-primary)' : undefined}
        />
      ))}
    </div>
  )
}
