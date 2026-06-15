import type { ReactElement } from 'react'

import { ActualEbitdaCard } from './components/actual-ebitda-card'
import { BitcoinPriceCard } from './components/bitcoin-price-card'
import { BitcoinProducedCard } from './components/bitcoin-produced-card'
import { BitcoinProductionCostCard } from './components/bitcoin-production-cost-card'
import { EbitdaHodlCard } from './components/ebitda-hodl-card'
import { EbitdaSellingCard } from './components/ebitda-selling-card'
import type { EbitdaDisplayMetrics } from './ebitda.types'

export type EbitdaMetricsProps = {
  metrics: EbitdaDisplayMetrics
  currentBTCPrice: number
}

/**
 * Row of summary metric cards across the top of the EBITDA section (actual, hodl, selling, cost).
 *
 * @category charts
 * @domain financial-reporting
 * @orkCapability financial-reporting
 * @tier agent-ready
 */
export const EbitdaMetrics = ({ metrics, currentBTCPrice }: EbitdaMetricsProps): ReactElement => (
  <div className="mdk-ebitda__metrics">
    <BitcoinProductionCostCard value={metrics.bitcoinProductionCost} />
    <BitcoinPriceCard value={metrics.bitcoinPrice} />
    <BitcoinProducedCard value={metrics.bitcoinProduced} />
    <EbitdaSellingCard value={metrics.ebitdaSellingBTC} />
    <ActualEbitdaCard value={metrics.actualEbitda} />
    <EbitdaHodlCard value={metrics.ebitdaNotSellingBTC} currentBTCPrice={currentBTCPrice} />
  </div>
)
