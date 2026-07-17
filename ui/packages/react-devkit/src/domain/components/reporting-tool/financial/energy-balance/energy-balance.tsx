import { Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from '@primitives'
import { GearIcon } from '@radix-ui/react-icons'
import type { ReactElement, ReactNode } from 'react'
import { useMemo } from 'react'

import { PERIOD } from '@domain/constants/ranges'

import { checkIfAllValuesAreZero } from '../../utils/financial-period'
import { toBarChartData } from '../../utils/to-bar-chart-data'

import { EnergyBalanceCostCharts } from './energy-balance-cost-charts'
import { EnergyBalanceCostMetrics } from './energy-balance-cost-metrics'
import { EnergyBalanceRevenueCharts } from './energy-balance-revenue-charts'
import type { EnergyBalanceTab } from './energy-balance.types'
import './energy-balance.scss'
import { timeframeSelectLabel } from './energy-balance.constants'
import type { DisplayMode, EnergyBalanceViewModel } from './use-energy-balance'

export type EnergyBalanceProps = {
  viewModel: EnergyBalanceViewModel
  onTabChange: (tab: EnergyBalanceTab) => void
  onRevenueDisplayModeChange: (mode: DisplayMode) => void
  onCostDisplayModeChange: (mode: DisplayMode) => void
  isDemoMode?: boolean
  /** Slot for timeframe / date-range controls rendered by the host app. */
  timeframeControls?: ReactNode
  /** Optional URL for the "Set Monthly Cost" control (hidden when omitted). */
  setCostHref?: string
}

/**
 * Full energy balance view with tabbed revenue and cost sections, charts, and metric cards.
 *
 * @category charts
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const EnergyBalance = ({
  viewModel,
  onTabChange,
  onRevenueDisplayModeChange,
  onCostDisplayModeChange,
  isDemoMode = false,
  timeframeControls,
  setCostHref,
}: EnergyBalanceProps): ReactElement => {
  const {
    revenueMetrics,
    costMetrics,
    energyRevenueChartInput,
    averageDowntimeData,
    powerChartInput,
    powerChartCostInput,
    energyCostChartInput,
    activeTab,
    revenueDisplayMode,
    costDisplayMode,
    revenueBarLabelFormatter,
    costBarLabelFormatter,
    period,
    periodType,
    hasData,
    isLoading = false,
    errors = [],
    hasDateSelection,
  } = viewModel

  const revenueChartData = useMemo(
    () => toBarChartData({ ...energyRevenueChartInput, barWidth: 45 }),
    [energyRevenueChartInput],
  )

  const costChartData = useMemo(
    () => toBarChartData({ ...energyCostChartInput, barWidth: 45 }),
    [energyCostChartInput],
  )

  const revenueNoData = checkIfAllValuesAreZero(energyRevenueChartInput)

  return (
    <div className="mdk-energy-balance">
      {isLoading && (
        <div className="mdk-energy-balance__loading" aria-busy="true" aria-live="polite">
          <Spinner color="secondary" size="lg" />
        </div>
      )}

      <header className="mdk-energy-balance__header">
        <h1 className="mdk-energy-balance__page-title">Energy Balance</h1>
        {setCostHref ? (
          <div className="mdk-energy-balance__header-actions">
            <a className="mdk-energy-balance__set-cost" href={setCostHref}>
              <GearIcon aria-hidden />
              Set Monthly Cost
            </a>
          </div>
        ) : null}
      </header>

      <div className="mdk-energy-balance__period">{timeframeSelectLabel}</div>

      {timeframeControls && <div className="mdk-energy-balance__controls">{timeframeControls}</div>}

      {!isDemoMode && errors.length > 0 && (
        <div className="mdk-energy-balance__error" role="alert">
          Error loading Energy Balance data. Please try again later.
          {errors.map((msg) => (
            <div key={msg}>• {msg}</div>
          ))}
        </div>
      )}

      {!hasDateSelection && (
        <p className="mdk-energy-balance__info">
          Please select a time period using the Year, Month, or Week selectors above to view energy
          balance data.
        </p>
      )}

      {hasDateSelection && !isLoading && !hasData && (
        <div className="mdk-energy-balance__error" role="status">
          No data available for the selected period.
        </div>
      )}

      {hasDateSelection && (
        <Tabs
          value={activeTab}
          onValueChange={(value) => onTabChange(value as EnergyBalanceTab)}
          className="mdk-energy-balance__tabs"
        >
          <TabsList variant="side" className="mdk-energy-balance__tabs-list">
            <TabsTrigger
              variant="side"
              value="revenue"
              className="mdk-energy-balance__tabs-trigger"
            >
              Energy Revenue
            </TabsTrigger>
            <TabsTrigger variant="side" value="cost" className="mdk-energy-balance__tabs-trigger">
              Energy Cost
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mdk-energy-balance__tabs-content">
            {!isLoading && hasData && revenueMetrics && (
              <EnergyBalanceRevenueCharts
                revenueMetrics={revenueMetrics}
                revenueChartData={
                  revenueNoData ? { labels: [], datasets: [], isEmpty: true } : revenueChartData
                }
                averageDowntimeData={averageDowntimeData}
                powerChartInput={powerChartInput}
                displayMode={revenueDisplayMode}
                barLabelFormatter={revenueBarLabelFormatter}
                onDisplayModeChange={onRevenueDisplayModeChange}
                periodType={periodType}
              />
            )}
          </TabsContent>

          <TabsContent value="cost" className="mdk-energy-balance__tabs-content">
            {!isLoading && hasData && costMetrics && (
              <>
                <EnergyBalanceCostMetrics metrics={costMetrics} />
                <EnergyBalanceCostCharts
                  costChartData={costChartData}
                  btcUnit={energyCostChartInput.btcUnit}
                  powerChartInput={powerChartCostInput}
                  displayMode={costDisplayMode}
                  barLabelFormatter={costBarLabelFormatter}
                  onDisplayModeChange={onCostDisplayModeChange}
                  showCostBarChart={period !== PERIOD.DAILY}
                  periodType={periodType}
                />
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
