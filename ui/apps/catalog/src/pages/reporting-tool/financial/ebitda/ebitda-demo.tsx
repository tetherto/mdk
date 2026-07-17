import {
  Ebitda,
  type EbitdaResponse,
  PERIOD,
  useEbitda,
} from '@tetherto/mdk-react-devkit/domain'
import { endOfMonth } from 'date-fns/endOfMonth'
import { startOfMonth } from 'date-fns/startOfMonth'
import type { ReactElement } from 'react'
import { useMemo } from 'react'

const MOCK_EBITDA: EbitdaResponse = {
  log: [
    {
      ts: new Date('2025-01-15T12:00:00.000Z').getTime(),
      revenueBTC: 0.08,
      revenueUSD: 4800,
      btcPrice: 60_000,
      powerW: 900_000,
      hashrateMhs: 900_000_000,
      consumptionMWh: 72,
      energyCostsUSD: 800,
      operationalCostsUSD: 400,
      totalCostsUSD: 1200,
      ebitdaSelling: 3600,
      ebitdaHodl: 3200,
      btcProductionCost: 17_500,
    },
    {
      ts: new Date('2025-02-15T12:00:00.000Z').getTime(),
      revenueBTC: 0.09,
      revenueUSD: 5400,
      btcPrice: 62_000,
      powerW: 920_000,
      hashrateMhs: 920_000_000,
      consumptionMWh: 78,
      energyCostsUSD: 880,
      operationalCostsUSD: 420,
      totalCostsUSD: 1300,
      ebitdaSelling: 4100,
      ebitdaHodl: 3600,
      btcProductionCost: 18_000,
    },
  ],
  summary: {
    totalRevenueBTC: 0.17,
    totalRevenueUSD: 10_200,
    totalCostsUSD: 2500,
    totalEbitdaSelling: 7700,
    totalEbitdaHodl: 6800,
    avgBtcProductionCost: 17_750,
    currentBtcPrice: 61_000,
  },
}

const EbitdaDemoInner = (): ReactElement => {
  const reporting = useEbitda({
    timezone: 'UTC',
    ebitda: MOCK_EBITDA,
    isLoading: false,
    defaultPeriod: PERIOD.MONTHLY,
  })

  const hasSelection = Boolean(reporting.dateRange?.start && reporting.dateRange?.end)

  const props = useMemo(
    () => ({
      metrics: reporting.metrics,
      ebitdaChartInput: reporting.ebitdaChartInput,
      btcProducedChartInput: reporting.btcProducedChartInput,
      hasBtcProducedAllZeros: reporting.hasBtcProducedAllZeros,
      showEbitdaBarChart: reporting.showEbitdaBarChart,
      currentBTCPrice: reporting.currentBTCPrice,
      datePicker: reporting.datePicker,
      isLoading: reporting.isLoading,
      errors: reporting.errors,
      hasDateSelection: hasSelection,
      setCostHref: '/reports/financial/cost-input',
    }),
    [
      reporting.btcProducedChartInput,
      reporting.currentBTCPrice,
      reporting.datePicker,
      reporting.dateRange?.end,
      reporting.dateRange?.start,
      reporting.ebitdaChartInput,
      reporting.errors,
      reporting.hasBtcProducedAllZeros,
      reporting.isLoading,
      reporting.metrics,
      reporting.showEbitdaBarChart,
    ],
  )

  return <Ebitda {...props} />
}

const QueryParamsPreview = (): ReactElement => {
  const jan = new Date(2025, 0, 1)
  const mockRange = {
    start: startOfMonth(jan).getTime(),
    end: endOfMonth(jan).getTime(),
    period: 'monthly' as const,
  }
  return (
    <pre>
      {JSON.stringify(
        {
          exampleQuery: { start: mockRange.start, end: mockRange.end, period: mockRange.period },
        },
        null,
        2,
      )}
    </pre>
  )
}

export const EbitdaDemo = (): ReactElement => {
  return (
    <>
      <EbitdaDemoInner />

      <details>
        <summary>Developer notes (queryParams for /auth/finance/ebitda)</summary>
        <p>
          useEbitda composes useFinancialDateRange with EBITDA payloads. In the host app, pass RTK
          Query data into the hook and wire queryParams to your finance client.
        </p>
        <QueryParamsPreview />
      </details>
    </>
  )
}
