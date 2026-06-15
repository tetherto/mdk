import { useMemo } from 'react'

import type { SubsidyFeesLogEntry, SubsidyFeesResponse } from '@/types/finance'
import { type FinancialDateRange, getPeriodType } from '../../utils/financial-period'
import { toBarChartData } from '../../utils/to-bar-chart-data'
import {
  filterLogByDateRange,
  mapLogToPeriodData,
  summarizeSubsidyFees,
  transformToAverageFeesChartData,
  transformToSubsidyFeesChartData,
} from './subsidy-fee-utils'

export type UseSubsidyFeesInput = {
  log?: SubsidyFeesLogEntry[]
  data?: SubsidyFeesResponse | null
  dateRange: FinancialDateRange | null
}

/**
 * Aggregates raw subsidy-fee log entries into chart-ready datasets keyed by
 * the active period type (day / week / month / year) and surfaces a summary
 * for the matching reporting widgets. Used by `SubsidyFee`; expose to
 * downstream apps that need to recompose the same datasets in a custom UI.
 *
 * @category misc
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const useSubsidyFees = ({ data, log, dateRange }: UseSubsidyFeesInput) => {
  const periodType = useMemo(() => getPeriodType(dateRange), [dateRange])
  const sourceLog = data?.log ?? log ?? []

  const filteredLog = useMemo(
    () => filterLogByDateRange(sourceLog, dateRange),
    [dateRange, sourceLog],
  )

  const aggregatedData = useMemo(
    () => mapLogToPeriodData(filteredLog, periodType),
    [filteredLog, periodType],
  )

  const subsidyFeesChartInput = useMemo(
    () => transformToSubsidyFeesChartData(aggregatedData),
    [aggregatedData],
  )

  const averageFeesChartInput = useMemo(
    () => transformToAverageFeesChartData(aggregatedData),
    [aggregatedData],
  )

  const summary = useMemo(
    () => summarizeSubsidyFees(aggregatedData, data?.summary),
    [aggregatedData, data?.summary],
  )

  const subsidyFeesChartData = useMemo(
    () => toBarChartData(subsidyFeesChartInput),
    [subsidyFeesChartInput],
  )

  const averageFeesChartData = useMemo(
    () => toBarChartData(averageFeesChartInput),
    [averageFeesChartInput],
  )

  return {
    summary,
    filteredLog,
    aggregatedData,
    subsidyFeesChartData,
    averageFeesChartData,
    isEmpty: aggregatedData.length === 0,
  }
}
