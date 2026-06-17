import type { ToBarChartDataInput } from '../../utils/to-bar-chart-data'

import { REVENUE_SITE_COLORS } from './revenue-chart.constants'
import { getMonthlyRevenueDataset, processRevenueDataset } from './revenue-chart-helper'
import type { RevenueDataItem, RevenueDatasetValue, SiteItem } from './revenue-chart.types'

export type RevenueChartViewModel = {
  /** Chart-ready series input — pass to `toBarChartData` in the component layer. */
  chartInput: ToBarChartDataInput
  /** Resolved display unit: `'₿'` (BTC) or `'Sats'` depending on value scale. */
  currencyUnit: string
}

/**
 * Pure view-model builder for `RevenueChart`.
 * Transforms raw multi-site revenue API data into chart-ready series and resolves
 * the display currency unit (BTC vs Sats). No React, no side effects.
 *
 * @param data - Raw API entries, one per time period, with site IDs as dynamic keys.
 * @param siteList - Optional list to resolve site IDs to display names.
 */
export const buildRevenueChartViewModel = (
  data: RevenueDataItem[],
  siteList: (string | SiteItem)[] = [],
): RevenueChartViewModel => {
  const dataset = getMonthlyRevenueDataset(data, siteList)
  const { dataset: processedDataset, currencyUnit } = processRevenueDataset(dataset)

  const labelSet = new Set<string>()
  for (const entry of processedDataset) {
    for (const key of Object.keys(entry)) {
      if (key !== 'label' && key !== 'stackGroup') labelSet.add(key)
    }
  }
  const labels = [...labelSet]

  const series = processedDataset.map((entry, siteIndex) => ({
    label: entry.label as string,
    stack: entry.stackGroup as string,
    color: REVENUE_SITE_COLORS[siteIndex % REVENUE_SITE_COLORS.length],
    values: Object.fromEntries(
      labels.map((dateKey) => {
        const dateEntry = entry[dateKey]
        const value =
          dateEntry && typeof dateEntry !== 'string'
            ? ((dateEntry as RevenueDatasetValue).value ?? 0)
            : 0
        return [dateKey, value]
      }),
    ),
  }))

  return { chartInput: { labels, series }, currencyUnit }
}
