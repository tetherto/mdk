import type { HashRevenueResponse } from '@/types/finance'
import {
  CURRENCY,
  getInitialHashBalanceDateRange,
  type HashBalanceCurrency,
  HashBalanceRevenuePanel,
} from '@tetherto/mdk-react-devkit'
import { useState } from 'react'

const mockHashBalanceData: HashRevenueResponse = {
  log: [
    {
      ts: Date.UTC(2026, 4, 15, 12),
      revenueBTC: 0.01,
      feesBTC: 0,
      revenueUSD: 100,
      feesUSD: 0,
      btcPrice: 60_000,
      hashrateMhs: 1,
      hashRevenueBTCPerPHsPerDay: 0.00001,
      hashRevenueUSDPerPHsPerDay: 0.4,
      hashCostBTCPerPHsPerDay: 0,
      hashCostUSDPerPHsPerDay: 0,
      networkHashPriceBTCPerPHsPerDay: 0.007,
      networkHashPriceUSDPerPHsPerDay: 0.01,
      networkHashrateMhs: 36_000_000_000_000,
    },
  ],
  summary: {
    avgHashRevenueBTCPerPHsPerDay: 0.00001,
    avgHashRevenueUSDPerPHsPerDay: 0.4,
    avgHashCostBTCPerPHsPerDay: 0,
    avgHashCostUSDPerPHsPerDay: 0,
    avgNetworkHashPriceBTCPerPHsPerDay: 0.007,
    avgNetworkHashPriceUSDPerPHsPerDay: 0.01,
    totalRevenueBTC: 0.01,
    totalRevenueUSD: 100,
    totalFeesBTC: 0,
    totalFeesUSD: 0,
  },
}

export const HashBalanceRevenuePanelExample = () => {
  const [currency, setCurrency] = useState<HashBalanceCurrency>(CURRENCY.USD_LABEL)

  return (
    <div className="mdk-example-row">
      <HashBalanceRevenuePanel
        data={mockHashBalanceData}
        dateRange={getInitialHashBalanceDateRange(new Date(2026, 4, 19))}
        currency={currency}
        onCurrencyChange={setCurrency}
        isLoading={false}
      />
    </div>
  )
}
