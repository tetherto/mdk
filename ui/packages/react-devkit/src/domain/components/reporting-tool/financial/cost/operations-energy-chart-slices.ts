import type { DoughnutChartDataset } from '@primitives'

import type { CostSummaryMonetaryTotals } from './build-cost-summary-view-model'
import { ENERGY_COLOR, OPERATIONS_COLOR } from './cost-chart-shared'

/**
 * Build the doughnut slices for the Operations vs Energy Cost panel.
 *
 * Zero-value buckets are dropped so the chart never renders a degenerate
 * 0-width slice (matches the OSS empty-state behavior). Returns an empty
 * array when the response has no `totals` block; consumers should treat
 * that as the empty / not-loaded state.
 */
export const buildOperationsEnergySlices = (
  totals: CostSummaryMonetaryTotals | null,
): DoughnutChartDataset[] => {
  if (!totals) return []

  const slices: DoughnutChartDataset[] = []

  if (totals.totalOperationalCostsUSD > 0) {
    slices.push({
      label: 'Operations',
      value: totals.totalOperationalCostsUSD,
      color: OPERATIONS_COLOR,
    })
  }

  if (totals.totalEnergyCostsUSD > 0) {
    slices.push({
      label: 'Energy',
      value: totals.totalEnergyCostsUSD,
      color: ENERGY_COLOR,
    })
  }

  return slices
}
