/**
 * Finance v2 API types - shapes returned by `/auth/finance/*` endpoints.
 *
 * These are the contracts consumers feed back through the reporting-tool
 * base hooks (`useEbitda`, `useEnergyBalance`, ...). The mdk hooks accept
 * `{ data, isLoading, error }` where `data` matches the *Response types
 * declared here. Foundation does not own the RTK Query / HTTP layer
 * itself - see api-integration-todo.md.
 */

export type FinancePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type FinanceQueryParams = {
  start: number
  end: number
  period?: FinancePeriod
  overwriteCache?: boolean
}

export type FinanceResponse<Log, Summary> = {
  log: Log[]
  summary: Summary
}

// ============================================================================
// /auth/finance/revenue-summary
// ============================================================================

export type RevenueSummaryLogEntry = {
  ts: number
  revenueBTC: number
  feesBTC: number
  revenueUSD: number
  feesUSD: number
  btcPrice: number
  powerW: number
  consumptionMWh: number
  hashrateMhs: number
  energyCostsUSD: number
  operationalCostsUSD: number
  totalCostsUSD: number
  ebitdaSelling: number
  ebitdaHodl: number
  btcProductionCost: number | null
  energyRevenuePerMWh: number | null
  allInCostPerMWh: number | null
  hashRevenueBTCPerPHsPerDay: number | null
  hashRevenueUSDPerPHsPerDay: number | null
  blockReward: number
  blockTotalFees: number
  curtailmentMWh: number | null
  curtailmentRate: number | null
  operationalIssuesRate: number | null
  powerUtilization: number | null
}

export type RevenueSummaryTotals = {
  totalRevenueBTC: number
  totalRevenueUSD: number
  totalFeesBTC: number
  totalFeesUSD: number
  totalCostsUSD: number
  totalConsumptionMWh: number
  avgCostPerMWh: number | null
  avgRevenuePerMWh: number | null
  avgBtcPrice: number | null
  avgCurtailmentRate: number | null
  avgPowerUtilization: number | null
  totalEbitdaSelling: number
  totalEbitdaHodl: number
  currentBtcPrice: number
}

export type RevenueSummaryResponse = FinanceResponse<RevenueSummaryLogEntry, RevenueSummaryTotals>

// ============================================================================
// /auth/finance/ebitda
// ============================================================================

export type EbitdaLogEntry = {
  ts: number
  revenueBTC: number
  revenueUSD: number
  btcPrice: number
  powerW: number
  hashrateMhs: number
  consumptionMWh: number
  energyCostsUSD: number
  operationalCostsUSD: number
  totalCostsUSD: number
  ebitdaSelling: number
  ebitdaHodl: number
  btcProductionCost: number | null
}

export type EbitdaTotals = {
  totalRevenueBTC: number
  totalRevenueUSD: number
  totalCostsUSD: number
  totalEbitdaSelling: number
  totalEbitdaHodl: number
  avgBtcProductionCost: number | null
  currentBtcPrice: number
}

export type EbitdaResponse = FinanceResponse<EbitdaLogEntry, EbitdaTotals>

// ============================================================================
// /auth/finance/energy-balance
// ============================================================================

export type EnergyBalanceLogEntry = {
  ts: number
  powerW: number
  consumptionMWh: number
  revenueBTC: number
  revenueUSD: number
  btcPrice: number
  energyCostUSD: number
  totalCostUSD: number
  energyRevenuePerMWh: number | null
  allInCostPerMWh: number | null
  profitUSD: number
  curtailmentMWh: number | null
  curtailmentRate: number | null
  operationalIssuesRate: number | null
  powerUtilization: number | null
}

export type EnergyBalanceTotals = {
  totalRevenueBTC: number
  totalRevenueUSD: number
  totalCostUSD: number
  totalProfitUSD: number
  avgCostPerMWh: number | null
  avgRevenuePerMWh: number | null
  totalConsumptionMWh: number
  avgCurtailmentRate: number | null
  avgOperationalIssuesRate: number | null
  avgPowerUtilization: number | null
}

export type EnergyBalanceResponse = FinanceResponse<EnergyBalanceLogEntry, EnergyBalanceTotals>

// ============================================================================
// /auth/finance/cost-summary
// ============================================================================

export type CostSummaryLogEntry = {
  ts: number
  consumptionMWh: number
  energyCostsUSD: number
  operationalCostsUSD: number
  totalCostsUSD: number
  allInCostPerMWh: number | null
  energyCostPerMWh: number | null
  btcPrice: number
}

export type CostSummaryTotals = {
  totalEnergyCostsUSD: number
  totalOperationalCostsUSD: number
  totalCostsUSD: number
  totalConsumptionMWh: number
  avgAllInCostPerMWh: number | null
  avgEnergyCostPerMWh: number | null
  avgBtcPrice: number | null
}

export type CostSummaryResponse = FinanceResponse<CostSummaryLogEntry, CostSummaryTotals>

// ============================================================================
// /auth/finance/subsidy-fees
// ============================================================================

export type SubsidyFeesLogEntry = {
  ts: number
  blockReward: number
  blockTotalFees: number
  avgFeesSatsVByte?: number | null
}

export type SubsidyFeesTotals = {
  totalBlockReward: number
  totalBlockTotalFees: number
  avgBlockReward: number | null
  avgBlockTotalFees: number | null
}

export type SubsidyFeesResponse = FinanceResponse<SubsidyFeesLogEntry, SubsidyFeesTotals>

// ============================================================================
// /auth/finance/revenue
// ============================================================================

export type FinanceRevenueQueryParams = FinanceQueryParams & {
  pool?: string
}

export type FinanceRevenueLogEntry = {
  ts: number
  revenueBTC: number
  feesBTC: number
  netRevenueBTC: number
}

export type FinanceRevenueTotals = {
  totalRevenueBTC: number
  totalFeesBTC: number
  totalNetRevenueBTC: number
}

export type FinanceRevenueResponse = FinanceResponse<FinanceRevenueLogEntry, FinanceRevenueTotals>

// ============================================================================
// /auth/finance/hash-revenue
// ============================================================================

export type HashRevenueLogEntry = {
  ts: number
  revenueBTC: number
  feesBTC: number
  revenueUSD: number
  feesUSD: number
  btcPrice: number
  hashrateMhs: number
  hashRevenueBTCPerPHsPerDay: number | null
  hashRevenueUSDPerPHsPerDay: number | null
  hashCostBTCPerPHsPerDay: number | null
  hashCostUSDPerPHsPerDay: number | null
  networkHashPriceBTCPerPHsPerDay: number | null
  networkHashPriceUSDPerPHsPerDay: number | null
  networkHashrateMhs: number
}

export type HashRevenueTotals = {
  avgHashRevenueBTCPerPHsPerDay: number | null
  avgHashRevenueUSDPerPHsPerDay: number | null
  avgHashCostBTCPerPHsPerDay: number | null
  avgHashCostUSDPerPHsPerDay: number | null
  avgNetworkHashPriceBTCPerPHsPerDay: number | null
  avgNetworkHashPriceUSDPerPHsPerDay: number | null
  totalRevenueBTC: number
  totalRevenueUSD: number
  totalFeesBTC: number
  totalFeesUSD: number
}

export type HashRevenueResponse = FinanceResponse<HashRevenueLogEntry, HashRevenueTotals>
