import { useMemo } from 'react'

import type { CostSummaryResponse } from '@/types/finance'
import type { UseFinancialDateRangeOptions } from '../../use-financial-date-range'
import { useFinancialDateRange } from '../../use-financial-date-range'

import {
  buildCostSummaryQueryParams,
  buildCostSummaryViewModel,
} from './build-cost-summary-view-model'

export type CostSummaryQueryResult = {
  data?: CostSummaryResponse
  isLoading?: boolean
  error?: unknown
}

export type UseCostSummaryOptions = UseFinancialDateRangeOptions & {
  query?: CostSummaryQueryResult
}

/**
 * Base hook for the cost-summary reporting page (single-site mode).
 *
 * Owns the date-range / period UI state and the pure transform from a v2
 * `/auth/finance/cost-summary` response into headline metrics and time-series.
 * Consumers wire their own fetch (RTK Query, TanStack Query, fixtures, ...)
 * and pass the result through `query` - the hook never fetches itself.
 *
 * Multi-site mode is composed at the page level (T-13) by feeding a different
 * response shape to the same view-model primitives; this base hook stays
 * single-site to keep the input contract narrow.
 *
 * @category utilities
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const useCostSummary = ({ query, ...dateRangeOptions }: UseCostSummaryOptions = {}) => {
  const dateRangeApi = useFinancialDateRange(dateRangeOptions)

  const queryParams = useMemo(
    () => buildCostSummaryQueryParams(dateRangeApi.dateRange),
    [dateRangeApi.dateRange],
  )

  const viewModel = useMemo(() => buildCostSummaryViewModel({ data: query?.data }), [query?.data])

  return {
    ...dateRangeApi,
    ...viewModel,
    queryParams,
    isLoading: query?.isLoading ?? false,
    error: query?.error ?? null,
  }
}
