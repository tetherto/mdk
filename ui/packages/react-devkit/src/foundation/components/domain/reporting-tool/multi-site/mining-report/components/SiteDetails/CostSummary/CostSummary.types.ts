export type CostSummaryBucket = {
  ts: number
  priceSamples: number[]
  prodCostNumerator: number
  prodCostDenominatorBTC: number
  energyUSD: number
  opsUSD: number
  revenueUSD: number
  curtailSamples: number[]
  opIssueSamples: number[]
  [key: string]: unknown
}
