import { GearIcon } from '@radix-ui/react-icons'
import {
  type AvgAllInCostDataPoint,
  buildCostSummaryViewModel,
  Cost,
  type CostSummaryLogEntry,
  type CostSummaryResponse,
  type FinancialDateRange,
  PERIOD,
  TimeframeControls,
  type TimeframeControlsOnRangeChange,
} from '@tetherto/mdk-react-devkit/domain'
import { endOfMonth } from 'date-fns/endOfMonth'
import { startOfMonth } from 'date-fns/startOfMonth'
import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'

const SELECT_PERIOD_HINT = 'SELECT A PERIOD IN ONE OF THE TIMEFRAMES'

const buildInitialDateRange = (): FinancialDateRange => ({
  start: startOfMonth(new Date('2025-01-01T00:00:00.000Z')).getTime(),
  end: endOfMonth(new Date('2025-12-31T00:00:00.000Z')).getTime(),
  period: PERIOD.MONTHLY,
})

const monthTs = (month: number): number => Date.UTC(2025, month - 1, 15, 12)

const buildLogEntry = (input: {
  month: number
  consumptionMWh: number
  energyCostsUSD: number
  operationalCostsUSD: number
  btcPrice: number
}): CostSummaryLogEntry => {
  const totalCostsUSD = input.energyCostsUSD + input.operationalCostsUSD
  return {
    ts: monthTs(input.month),
    consumptionMWh: input.consumptionMWh,
    energyCostsUSD: input.energyCostsUSD,
    operationalCostsUSD: input.operationalCostsUSD,
    totalCostsUSD,
    allInCostPerMWh: totalCostsUSD / input.consumptionMWh,
    energyCostPerMWh: input.energyCostsUSD / input.consumptionMWh,
    btcPrice: input.btcPrice,
  }
}

const MOCK_LOG: CostSummaryLogEntry[] = [
  {
    month: 1,
    consumptionMWh: 1_180,
    energyCostsUSD: 14_200,
    operationalCostsUSD: 7_100,
    btcPrice: 64_500,
  },
  {
    month: 2,
    consumptionMWh: 1_320,
    energyCostsUSD: 15_900,
    operationalCostsUSD: 7_950,
    btcPrice: 67_800,
  },
  {
    month: 3,
    consumptionMWh: 1_410,
    energyCostsUSD: 17_400,
    operationalCostsUSD: 8_600,
    btcPrice: 71_200,
  },
  {
    month: 4,
    consumptionMWh: 1_290,
    energyCostsUSD: 15_500,
    operationalCostsUSD: 7_650,
    btcPrice: 65_900,
  },
  {
    month: 5,
    consumptionMWh: 1_360,
    energyCostsUSD: 16_800,
    operationalCostsUSD: 8_200,
    btcPrice: 68_400,
  },
  {
    month: 6,
    consumptionMWh: 1_470,
    energyCostsUSD: 18_500,
    operationalCostsUSD: 9_100,
    btcPrice: 72_500,
  },
  {
    month: 7,
    consumptionMWh: 1_510,
    energyCostsUSD: 19_200,
    operationalCostsUSD: 9_400,
    btcPrice: 74_900,
  },
  {
    month: 8,
    consumptionMWh: 1_580,
    energyCostsUSD: 20_400,
    operationalCostsUSD: 9_950,
    btcPrice: 78_300,
  },
  {
    month: 9,
    consumptionMWh: 1_440,
    energyCostsUSD: 17_900,
    operationalCostsUSD: 8_750,
    btcPrice: 73_100,
  },
  {
    month: 10,
    consumptionMWh: 1_390,
    energyCostsUSD: 17_100,
    operationalCostsUSD: 8_300,
    btcPrice: 69_500,
  },
  {
    month: 11,
    consumptionMWh: 1_460,
    energyCostsUSD: 18_200,
    operationalCostsUSD: 8_900,
    btcPrice: 75_400,
  },
  {
    month: 12,
    consumptionMWh: 1_540,
    energyCostsUSD: 19_800,
    operationalCostsUSD: 9_600,
    btcPrice: 81_200,
  },
].map(buildLogEntry)

const MOCK_COST_SUMMARY: CostSummaryResponse = {
  log: MOCK_LOG,
  summary: {
    totalEnergyCostsUSD: MOCK_LOG.reduce((sum, e) => sum + e.energyCostsUSD, 0),
    totalOperationalCostsUSD: MOCK_LOG.reduce((sum, e) => sum + e.operationalCostsUSD, 0),
    totalCostsUSD: MOCK_LOG.reduce((sum, e) => sum + e.totalCostsUSD, 0),
    totalConsumptionMWh: MOCK_LOG.reduce((sum, e) => sum + e.consumptionMWh, 0),
    avgAllInCostPerMWh:
      MOCK_LOG.reduce((sum, e) => sum + e.totalCostsUSD, 0) /
      MOCK_LOG.reduce((sum, e) => sum + e.consumptionMWh, 0),
    avgEnergyCostPerMWh:
      MOCK_LOG.reduce((sum, e) => sum + e.energyCostsUSD, 0) /
      MOCK_LOG.reduce((sum, e) => sum + e.consumptionMWh, 0),
    avgBtcPrice: MOCK_LOG.reduce((sum, e) => sum + e.btcPrice, 0) / MOCK_LOG.length,
  },
}

const MOCK_AVG_ALL_IN_COST: AvgAllInCostDataPoint[] = MOCK_LOG.map((entry) => ({
  ts: entry.ts,
  revenueUSDPerMWh: (entry.allInCostPerMWh ?? 0) * 1.28,
  costUSDPerMWh: entry.allInCostPerMWh ?? 0,
}))

export const CostDemo = (): ReactElement => {
  const [dateRange, setDateRange] = useState<FinancialDateRange>(buildInitialDateRange)

  const viewModel = useMemo(() => buildCostSummaryViewModel({ data: MOCK_COST_SUMMARY }), [])

  const handleRangeChange: TimeframeControlsOnRangeChange = (range, options) => {
    setDateRange({
      start: range[0].getTime(),
      end: range[1].getTime(),
      period: (options.period ?? dateRange.period) as FinancialDateRange['period'],
    })
  }

  const controls = (
    <TimeframeControls
      hint={SELECT_PERIOD_HINT}
      isMonthSelectVisible
      isWeekSelectVisible={false}
      dateRange={{ start: dateRange.start, end: dateRange.end }}
      onRangeChange={handleRangeChange}
    />
  )

  const setCostAction = (
    <a className="mdk-cost__set-cost" href="/reports/financial/cost-input">
      <GearIcon aria-hidden />
      Set Monthly Cost
    </a>
  )

  return (
    <Cost
      metrics={viewModel.metrics}
      costLog={viewModel.costLog}
      btcPriceLog={viewModel.btcPriceLog}
      totals={viewModel.totals}
      dateRange={dateRange}
      avgAllInCostData={MOCK_AVG_ALL_IN_COST}
      controls={controls}
      setCostAction={setCostAction}
    />
  )
}
