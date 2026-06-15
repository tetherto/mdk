/**
 * Display metrics for the financial EBITDA reporting surface (foundation).
 * Values mirror Moria `Views/Financial/EBITDA/EBITDA.types` `EbitdaMetrics`.
 */
export type EbitdaDisplayMetrics = {
  bitcoinProductionCost: number
  bitcoinPrice: number
  bitcoinProduced: number
  ebitdaSellingBTC: number
  actualEbitda: number
  ebitdaNotSellingBTC: number
}
