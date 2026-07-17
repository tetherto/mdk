import { useMemo } from 'react'

import { toBarChartData } from '../../../../reporting-tool/utils/to-bar-chart-data'

import { deriveHashBalanceView } from './hash-balance-utils'
import type { UseHashBalanceInput } from './hash-balance.types'

/**
 * Derives hash-balance metrics and chart datasets from finance log entries for
 * the active date range, currency, and timeframe type. Used by hash balance panels.
 *
 * @category misc
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const useHashBalance = ({
  data,
  log,
  currency,
  dateRange,
  timeframeType = null,
}: UseHashBalanceInput) => {
  const derived = useMemo(
    () => deriveHashBalanceView(data, log, dateRange, currency, timeframeType),
    [currency, data, dateRange, log, timeframeType],
  )

  const siteHashRevenueChartData = useMemo(
    () => toBarChartData(derived.siteHashRevenueInput),
    [derived.siteHashRevenueInput],
  )

  const networkHashpriceChartData = useMemo(
    () => toBarChartData(derived.networkHashpriceInput),
    [derived.networkHashpriceInput],
  )

  const combinedCostChartData = useMemo(
    () => toBarChartData(derived.combinedCostInput),
    [derived.combinedCostInput],
  )

  return {
    ...derived,
    siteHashRevenueChartData,
    networkHashpriceChartData,
    combinedCostChartData,
  }
}
