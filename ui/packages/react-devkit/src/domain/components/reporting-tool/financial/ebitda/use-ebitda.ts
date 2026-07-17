import { useMemo } from 'react'

import type { EbitdaResponse } from '@domain/types/finance'
import type { UseFinancialDateRangeOptions } from '../../use-financial-date-range'
import { useFinancialDateRange } from '../../use-financial-date-range'

import { buildEbitdaQueryParams, buildEbitdaViewModel } from './build-ebitda-view-model'

export type UseEbitdaOptions = UseFinancialDateRangeOptions & {
  ebitda?: EbitdaResponse | undefined
  isLoading?: boolean
  fetchErrors?: string[]
}

/**
 * Transforms an `EbitdaResponse` and date-range options into query params and a chart-ready EBITDA view-model.
 *
 * @category charts
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const useEbitda = ({
  ebitda,
  isLoading = false,
  fetchErrors,
  ...dateRangeOptions
}: UseEbitdaOptions = {}) => {
  const dateRangeApi = useFinancialDateRange(dateRangeOptions)

  const queryParams = useMemo(
    () => buildEbitdaQueryParams(dateRangeApi.dateRange),
    [dateRangeApi.dateRange],
  )

  const viewModel = useMemo(
    () => buildEbitdaViewModel({ dateRange: dateRangeApi.dateRange, data: ebitda }),
    [dateRangeApi.dateRange, ebitda],
  )

  return {
    ...dateRangeApi,
    queryParams,
    isLoading,
    errors: fetchErrors ?? [],
    ...viewModel,
  }
}
