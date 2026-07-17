/**
 * Display types for the financial Energy Balance reporting surface (foundation).
 * Wire types (EnergyBalanceResponse, EnergyBalanceLogEntry, EnergyBalanceTotals)
 * live in @/types/finance and are re-exported here for consumer convenience.
 */
export type {
  EnergyBalanceLogEntry,
  EnergyBalanceResponse,
  EnergyBalanceTotals,
} from '@domain/types/finance'

export type EnergyBalanceTab = 'revenue' | 'cost'

export type EnergyRevenueMetrics = {
  curtailmentRate: number
  operationalIssuesRate: number
}

export type EnergyCostMetrics = {
  avgPowerConsumption: number
  avgEnergyCost: number
  avgAllInCost: number
  avgPowerAvailability: number
  avgOperationsCost: number
  avgEnergyRevenue: number
}

export type ThresholdBarChartInput = {
  labels: string[]
  series: Array<{
    label: string
    values: number[]
    color?: string
    stack?: string
  }>
}

export type EnergyCostChartInput = ThresholdBarChartInput & {
  btcUnit: string | null
}

export type ThresholdLineChartInput = {
  series: Array<{
    label: string
    points: Array<{ ts: number; value: number }>
    color?: string
  }>
  constants?: Array<{
    label: string
    value: number
    color?: string
    style?: { borderDash?: number[] }
  }>
}
