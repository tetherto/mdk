import { type DateRange, DateRangePicker } from '@tetherto/mdk-react-devkit/core'
import {
  EnergyBalance,
  type EnergyBalanceResponse,
  type FinancialDateRange,
  PERIOD,
  useEnergyBalanceViewModel,
} from '@tetherto/mdk-react-devkit/foundation'
import { useState } from 'react'
import type { ReactElement } from 'react'

const DEMO_ENERGY_BALANCE_DATA: EnergyBalanceResponse = {
  log: [
    {
      ts: new Date('2025-01-05').getTime(),
      powerW: 20_500_000,
      consumptionMWh: 95,
      revenueBTC: 0.48,
      revenueUSD: 24000,
      btcPrice: 50000,
      energyCostUSD: 4800,
      totalCostUSD: 7600,
      energyRevenuePerMWh: 252,
      allInCostPerMWh: 80,
      profitUSD: 16400,
      curtailmentMWh: 0.8,
      curtailmentRate: 0.018,
      operationalIssuesRate: 0.012,
      powerUtilization: 0.91,
    },
    {
      ts: new Date('2025-01-12').getTime(),
      powerW: 21_200_000,
      consumptionMWh: 102,
      revenueBTC: 0.52,
      revenueUSD: 26000,
      btcPrice: 50000,
      energyCostUSD: 5100,
      totalCostUSD: 8100,
      energyRevenuePerMWh: 255,
      allInCostPerMWh: 79,
      profitUSD: 17900,
      curtailmentMWh: 0.6,
      curtailmentRate: 0.015,
      operationalIssuesRate: 0.009,
      powerUtilization: 0.93,
    },
    {
      ts: new Date('2025-01-19').getTime(),
      powerW: 19_800_000,
      consumptionMWh: 88,
      revenueBTC: 0.45,
      revenueUSD: 22500,
      btcPrice: 50000,
      energyCostUSD: 4500,
      totalCostUSD: 7200,
      energyRevenuePerMWh: 256,
      allInCostPerMWh: 82,
      profitUSD: 15300,
      curtailmentMWh: 1.1,
      curtailmentRate: 0.022,
      operationalIssuesRate: 0.011,
      powerUtilization: 0.88,
    },
    {
      ts: new Date('2025-01-26').getTime(),
      powerW: 22_000_000,
      consumptionMWh: 108,
      revenueBTC: 0.55,
      revenueUSD: 27500,
      btcPrice: 50000,
      energyCostUSD: 5400,
      totalCostUSD: 8500,
      energyRevenuePerMWh: 254,
      allInCostPerMWh: 79,
      profitUSD: 19000,
      curtailmentMWh: 0.5,
      curtailmentRate: 0.012,
      operationalIssuesRate: 0.008,
      powerUtilization: 0.94,
    },
  ],
  summary: {
    totalRevenueBTC: 2,
    totalRevenueUSD: 100000,
    totalCostUSD: 31400,
    totalProfitUSD: 68600,
    avgCostPerMWh: 80,
    avgRevenuePerMWh: 254,
    totalConsumptionMWh: 393,
    avgCurtailmentRate: 0.01675,
    avgOperationalIssuesRate: 0.01,
    avgPowerUtilization: 0.915,
  },
}

const toFinancialDateRange = (range: DateRange | undefined): FinancialDateRange | null => {
  if (!range?.from || !range?.to) return null
  return {
    start: range.from.getTime(),
    end: range.to.getTime(),
    period: PERIOD.MONTHLY,
  }
}

const DEFAULT_DEMO_RANGE: DateRange = {
  from: new Date('2025-01-01T00:00:00'),
  to: new Date('2025-01-31T23:59:59'),
}

export const EnergyBalanceDemo = (): ReactElement => {
  const [pickerRange, setPickerRange] = useState<DateRange | undefined>(DEFAULT_DEMO_RANGE)
  const dateRange = toFinancialDateRange(pickerRange)

  const { queryParams: _queryParams, ...componentProps } = useEnergyBalanceViewModel({
    data: DEMO_ENERGY_BALANCE_DATA,
    dateRange,
    availablePowerMW: 22,
  })

  return (
    <div className="energy-balance-demo">
      <EnergyBalance
        {...componentProps}
        isDemoMode
        timeframeControls={<DateRangePicker selected={pickerRange} onSelect={setPickerRange} />}
      />
    </div>
  )
}
