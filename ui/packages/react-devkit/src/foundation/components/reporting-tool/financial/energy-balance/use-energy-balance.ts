import { CURRENCY } from '@core'
import { useMemo, useState } from 'react'

import type { EnergyBalanceResponse } from '@/types/finance'
import type { FinancialDateRange } from '../../utils/financial-period'

import {
  buildEnergyBalanceQueryParams,
  buildEnergyBalanceViewModel,
  type DisplayMode,
  type EnergyBalanceData,
} from './build-energy-balance-view-model'
import type { EnergyBalanceTab } from './energy-balance.types'

export type { DisplayMode } from './build-energy-balance-view-model'

export type EnergyBalanceViewModel = EnergyBalanceData & {
  activeTab: EnergyBalanceTab
  revenueDisplayMode: DisplayMode
  costDisplayMode: DisplayMode
  isLoading: boolean
  errors: string[]
  hasDateSelection: boolean
}

export type UseEnergyBalanceOptions = {
  data?: EnergyBalanceResponse
  isLoading?: boolean
  fetchErrors?: string[]
  dateRange: FinancialDateRange | null
  availablePowerMW: number
}

/**
 * Computes the full EnergyBalance view model from raw API data, managing tab selection and display-mode state.
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const useEnergyBalanceViewModel = ({
  data,
  isLoading = false,
  fetchErrors,
  dateRange,
  availablePowerMW,
}: UseEnergyBalanceOptions) => {
  const [activeTab, setActiveTab] = useState<EnergyBalanceTab>('revenue')
  const [revenueDisplayMode, setRevenueDisplayMode] = useState<DisplayMode>(CURRENCY.USD_LABEL)
  const [costDisplayMode, setCostDisplayMode] = useState<DisplayMode>(CURRENCY.USD_LABEL)

  const queryParams = useMemo(() => buildEnergyBalanceQueryParams(dateRange), [dateRange])

  const viewModel = useMemo(
    () =>
      buildEnergyBalanceViewModel({
        dateRange,
        data,
        revenueDisplayMode,
        costDisplayMode,
        availablePowerMW,
      }),
    [dateRange, data, revenueDisplayMode, costDisplayMode],
  )

  return {
    queryParams,
    viewModel: {
      ...viewModel,
      activeTab,
      revenueDisplayMode,
      costDisplayMode,
      isLoading,
      errors: fetchErrors ?? [],
      hasDateSelection: dateRange != null,
    },
    onTabChange: setActiveTab,
    onRevenueDisplayModeChange: setRevenueDisplayMode,
    onCostDisplayModeChange: setCostDisplayMode,
  }
}
