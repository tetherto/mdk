import { Spinner } from '@primitives'
import { GearIcon } from '@radix-ui/react-icons'
import type { ReactElement } from 'react'
import { useMemo } from 'react'

import type { ToBarChartDataInput } from '../../utils/to-bar-chart-data'
import { toBarChartData } from '../../utils/to-bar-chart-data'

import { EbitdaCharts } from './ebitda-charts'
import type { EbitdaDisplayMetrics } from './ebitda.types'
import { EbitdaMetrics } from './ebitda-metrics'
import './ebitda.scss'

export type EbitdaProps = {
  /** Computed EBITDA metrics */
  metrics: EbitdaDisplayMetrics | null
  /** Data for the EBITDA bar chart */
  ebitdaChartInput: ToBarChartDataInput | null
  /** Data for the BTC produced chart */
  btcProducedChartInput: ToBarChartDataInput | null
  /** Whether all BTC produced values are zero */
  hasBtcProducedAllZeros: boolean
  /** Show the EBITDA bar chart */
  showEbitdaBarChart: boolean
  /** Current Bitcoin price in USD */
  currentBTCPrice: number
  /** Date picker element */
  datePicker: ReactElement
  /**
   * Loading state
   * @default false
   */
  isLoading?: boolean
  /**
   * Error messages to display
   * @default []
   */
  errors?: string[]
  /** When false, show the "select a period" hint instead of empty data. */
  hasDateSelection: boolean
  /** Optional URL for the "Set Monthly Cost" control (hidden when omitted). */
  setCostHref?: string
}

/**
 * Top-level EBITDA section of the reporting view — pulls together metric cards, charts, and tables.
 *
 * @category charts
 * @domain financial-reporting
 * @kernelCapability financial-reporting
 * @tier agent-ready
 */
export const Ebitda = ({
  metrics,
  ebitdaChartInput,
  btcProducedChartInput,
  hasBtcProducedAllZeros,
  showEbitdaBarChart,
  currentBTCPrice,
  datePicker,
  isLoading = false,
  errors = [],
  hasDateSelection,
  setCostHref,
}: EbitdaProps): ReactElement => {
  const ebitdaChartData = useMemo(
    () => (ebitdaChartInput ? toBarChartData(ebitdaChartInput) : null),
    [ebitdaChartInput],
  )

  const btcDisplayInput = useMemo((): ToBarChartDataInput | null => {
    if (!btcProducedChartInput) return null
    if (hasBtcProducedAllZeros) return { ...btcProducedChartInput, series: [] }
    return btcProducedChartInput
  }, [btcProducedChartInput, hasBtcProducedAllZeros])

  const btcDisplayData = useMemo(
    () => (btcDisplayInput ? toBarChartData(btcDisplayInput) : null),
    [btcDisplayInput],
  )

  return (
    <div className="mdk-ebitda">
      {isLoading && (
        <div className="mdk-ebitda__loading" aria-busy="true" aria-live="polite">
          <Spinner color="secondary" size="lg" />
        </div>
      )}

      <header className="mdk-ebitda__header">
        <h1 className="mdk-ebitda__page-title">EBITDA</h1>
        {setCostHref ? (
          <div className="mdk-ebitda__header-actions">
            <a className="mdk-ebitda__set-cost" href={setCostHref}>
              <GearIcon aria-hidden />
              Set Monthly Cost
            </a>
          </div>
        ) : null}
      </header>

      <div className="mdk-ebitda__period">SELECT A PERIOD IN ONE OF THE TIMEFRAMES</div>

      <div className="mdk-ebitda__controls">{datePicker}</div>

      {errors.length > 0 && (
        <div className="mdk-ebitda__error" role="alert">
          Error loading EBITDA data. Please try again later.
          {errors.map((msg) => (
            <div key={msg}>• {msg}</div>
          ))}
        </div>
      )}

      {!hasDateSelection && (
        <p className="mdk-ebitda__info">
          Please select a time period using the Year or Month selectors above to view Bitcoin
          network subsidy and fee data.
        </p>
      )}

      {hasDateSelection && !isLoading && metrics && (
        <>
          <EbitdaMetrics metrics={metrics} currentBTCPrice={currentBTCPrice} />
          {ebitdaChartData && btcDisplayData && (
            <EbitdaCharts
              showEbitdaBarChart={showEbitdaBarChart && Boolean(ebitdaChartInput)}
              ebitdaChartData={ebitdaChartData}
              btcDisplayData={btcDisplayData}
              isLoading={isLoading}
              hasBtcProducedAllZeros={hasBtcProducedAllZeros}
            />
          )}
        </>
      )}

      {hasDateSelection && !isLoading && !metrics && (
        <div className="mdk-ebitda__error" role="status">
          No data available for the selected period.
        </div>
      )}
    </div>
  )
}
