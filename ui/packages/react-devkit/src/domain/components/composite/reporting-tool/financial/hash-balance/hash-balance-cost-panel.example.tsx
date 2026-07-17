import type { HashRevenueResponse } from '@domain/types/finance'
import { getInitialHashBalanceDateRange, HashBalanceCostPanel } from '@tetherto/mdk-react-devkit'

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

export const HashBalanceCostPanelExample = () => (
  <div className="mdk-example-row">
    <HashBalanceCostPanel
      data={mockHashBalanceData}
      dateRange={getInitialHashBalanceDateRange(new Date(2026, 4, 19))}
      isLoading={false}
    />
  </div>
)
