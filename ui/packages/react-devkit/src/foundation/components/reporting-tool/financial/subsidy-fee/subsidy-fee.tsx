import { BarChart, ChartContainer, COLOR, CURRENCY, UNITS } from '@core'
import { type ReactElement, useEffect, useState } from 'react'

import type { PeriodValue } from '../../../../constants/ranges'
import type { FinanceQueryParams, SubsidyFeesLogEntry, SubsidyFeesResponse } from '@/types/finance'
import { SingleStatCard } from '../../../explorer/details-view'
import { TimeframeControls, type TimeframeControlsOnRangeChange } from '../../timeframe-controls'
import { type FinancialDateRange, toFinancePeriod } from '../../utils/financial-period'
import {
  averageFeesTooltip,
  SUBSIDY_FEE_CHART_HEIGHT,
  SUBSIDY_FEE_TIMEFRAME_HINT,
  subsidyFeeBarChartScalesXY,
  subsidyFeesTooltip,
} from './subsidy-fee.constants'
import { getInitialSubsidyFeeDateRange } from './subsidy-fee-utils'
import { useSubsidyFees } from './use-subsidy-fee'

import './subsidy-fee.scss'

type SubsidyFeeProps = Partial<{
  isError: boolean
  isLoading: boolean
  errorMessage: string
  showSummaryCards: boolean
  log: SubsidyFeesLogEntry[]
  data: SubsidyFeesResponse | null
  onDateRangeChange: (dateRange: FinancialDateRange, query: FinanceQueryParams) => void
}>

/**
 * Subsidy & fees reporting view — combines a stacked bar chart of mining
 * rewards (subsidy vs fees) with optional summary stat cards and a
 * timeframe selector. Drives data through the companion `useSubsidyFees`
 * hook and is intended to be embedded inside the financial reporting page.
 *
 * @category dashboards
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const SubsidyFee = ({
  data,
  log,
  isError = false,
  onDateRangeChange,
  isLoading = false,
  showSummaryCards = false,
  errorMessage = 'Error loading block data. Please try again later.',
}: SubsidyFeeProps): ReactElement => {
  const [financeDateRange, setFinanceDateRange] = useState<FinancialDateRange>(
    getInitialSubsidyFeeDateRange,
  )
  const { summary, subsidyFeesChartData, averageFeesChartData, isEmpty } = useSubsidyFees({
    data,
    log,
    dateRange: financeDateRange,
  })

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

  return (
    <div>
      <TimeframeControls
        hint={SUBSIDY_FEE_TIMEFRAME_HINT}
        isMonthSelectVisible
        isWeekSelectVisible
        dateRange={{
          start: financeDateRange.start,
          end: financeDateRange.end,
        }}
        onRangeChange={handleRangeChange}
      />
      {isError && <div role="alert">{errorMessage}</div>}
      {showSummaryCards && (
        <div>
          <SingleStatCard
            name="Total Subsidy"
            variant="secondary"
            unit={CURRENCY.BTC_LABEL}
            value={summary.totalSubsidyBTC}
          />
          <SingleStatCard
            name="Total Fees"
            variant="secondary"
            unit={CURRENCY.BTC_LABEL}
            value={summary.totalFeesBTC}
          />
          <SingleStatCard
            name="Average Fees"
            variant="secondary"
            unit={`${UNITS.SATS}/${UNITS.VBYTE}`}
            value={summary.averageFeesSatsPerVByte}
          />
        </div>
      )}
      <div>
        <section className="mdk-subsidy-fee__panel mdk-subsidy-fee__panel--primary">
          <ChartContainer
            title="Subsidy/Fees"
            loading={isLoading}
            empty={!isLoading && isEmpty}
            emptyMessage="No subsidy or fee data available for the selected period."
          >
            <BarChart
              isStacked
              showDataLabels
              legendAlign="start"
              legendPosition="bottom"
              data={subsidyFeesChartData}
              tooltip={subsidyFeesTooltip}
              height={SUBSIDY_FEE_CHART_HEIGHT}
              formatDataLabel={(value) => value.toFixed(2)}
              options={{
                scales: {
                  ...subsidyFeeBarChartScalesXY,
                  y1: {
                    position: 'right' as const,
                    beginAtZero: true,
                    grid: { drawOnChartArea: false },
                    ticks: {
                      color: COLOR.WHITE_ALPHA_06,
                      callback: (value: string | number) => `${value}${UNITS.PERCENT}`,
                    },
                  },
                },
              }}
            />
          </ChartContainer>
        </section>

        <section className="mdk-subsidy-fee__panel mdk-subsidy-fee__panel--primary">
          <ChartContainer
            loading={isLoading}
            empty={!isLoading && isEmpty}
            title={`Average Fees in ${UNITS.SATS}/${UNITS.VBYTE}`}
            emptyMessage="No average fee data available for the selected period."
          >
            <BarChart
              showDataLabels
              legendAlign="start"
              legendPosition="bottom"
              data={averageFeesChartData}
              tooltip={averageFeesTooltip}
              height={SUBSIDY_FEE_CHART_HEIGHT}
              formatDataLabel={(value) => value.toFixed(2)}
              options={{ scales: subsidyFeeBarChartScalesXY }}
            />
          </ChartContainer>
        </section>
      </div>
    </div>
  )
}
