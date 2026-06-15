import { cn, CURRENCY, Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from '@core'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'

import {
  type PeriodValue,
  TIMEFRAME_TYPE,
  type TimeframeTypeValue,
} from '../../../../../constants/ranges'
import {
  TimeframeControls,
  type TimeframeControlsOnRangeChange,
} from '../../../../reporting-tool/timeframe-controls'
import {
  type FinancialDateRange,
  toFinancePeriod,
} from '../../../../reporting-tool/utils/financial-period'

import { HashBalanceCostPanel } from './hash-balance-cost-panel'
import { HashBalanceRevenuePanel } from './hash-balance-revenue-panel'
import type { HashBalanceCurrency, HashBalanceProps } from './hash-balance.types'
import { HASH_BALANCE_TIMEFRAME_HINT } from './hash-balance.constants'
import { getHashBalanceDefaultRange, getInitialHashBalanceDateRange } from './hash-balance-utils'
import './hash-balance.scss'

/**
 * Hash balance reporting page — revenue vs cost tabs with site hash revenue,
 * network hashrate, hashprice charts, and integrated timeframe controls.
 *
 * @category dashboards
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const HashBalance = ({
  data,
  isError = false,
  isLoading = false,
  errorMessage = 'Error loading hash balance data. Please try again later.',
  initialDateRange,
  onDateRangeChange,
  className,
  tabsClassName,
  tabsListClassName,
}: HashBalanceProps): ReactElement => {
  const [currency, setCurrency] = useState<HashBalanceCurrency>(CURRENCY.USD_LABEL)
  const [timeframeType, setTimeframeType] = useState<TimeframeTypeValue | null>(TIMEFRAME_TYPE.YEAR)
  const [financeDateRange, setFinanceDateRange] = useState<FinancialDateRange>(
    () => initialDateRange ?? getInitialHashBalanceDateRange(),
  )

  useEffect(() => {
    onDateRangeChange?.(financeDateRange, {
      start: financeDateRange.start,
      end: financeDateRange.end,
      period: toFinancePeriod(financeDateRange.period),
    })
  }, [financeDateRange, onDateRangeChange])

  const handleRangeChange: TimeframeControlsOnRangeChange = (range, options) => {
    setFinanceDateRange({
      start: range[0].getTime(),
      end: range[1].getTime(),
      period: options.period as PeriodValue | undefined,
    })
  }

  const handleReset = (): void => {
    setFinanceDateRange(getHashBalanceDefaultRange(timeframeType))
  }

  return (
    <div className={cn('mdk-hash-balance', className)}>
      {isLoading && (
        <div className="mdk-hash-balance__loading" aria-busy="true" aria-live="polite">
          <Spinner color="secondary" size="lg" />
        </div>
      )}

      <TimeframeControls
        hint={HASH_BALANCE_TIMEFRAME_HINT}
        isMonthSelectVisible
        isWeekSelectVisible
        showResetButton
        onReset={handleReset}
        timeframeType={timeframeType}
        onTimeframeTypeChange={setTimeframeType}
        dateRange={{
          start: financeDateRange.start,
          end: financeDateRange.end,
        }}
        onRangeChange={handleRangeChange}
      />

      {isError && (
        <div className="mdk-hash-balance__error" role="alert">
          {errorMessage}
        </div>
      )}

      <Tabs defaultValue="revenue" className={cn('mdk-hash-balance__tabs', tabsClassName)}>
        <TabsList variant="side" className={cn('mdk-hash-balance__tabs-list', tabsListClassName)}>
          <TabsTrigger variant="side" value="revenue" className="mdk-hash-balance__tabs-trigger">
            Hash Revenue
          </TabsTrigger>
          <TabsTrigger variant="side" value="cost" className="mdk-hash-balance__tabs-trigger">
            Hash Cost
          </TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mdk-hash-balance__tabs-content">
          <HashBalanceRevenuePanel
            data={data}
            dateRange={financeDateRange}
            timeframeType={timeframeType}
            currency={currency}
            onCurrencyChange={setCurrency}
            isLoading={isLoading}
          />
        </TabsContent>
        <TabsContent value="cost" className="mdk-hash-balance__tabs-content">
          <HashBalanceCostPanel
            data={data}
            dateRange={financeDateRange}
            timeframeType={timeframeType}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
