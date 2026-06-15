import type { ChartBuilderOptions } from '../../mining-report.types'

/** Shared metric row for site-details summary cards */
export type ReportMetric = {
  id: string
  label: string
  value: number
  unit: string
  isHighlighted?: boolean
}

/** USD/BTC pair used in stacked revenue charts */
export type CurrencyUsdBtcCell = {
  usd: number
  btc: number
}

export type RegionChartBuilderExtras = Partial<{
  regionLabelMap: Record<string, string>
  regionColors: Record<string, string>
  days: number
}>

export type SiteScopedChartOptions = Partial<{
  siteCode: string
  days: number
  buckets: number
}>

export type HashRevenuesChartOptions = ChartBuilderOptions & RegionChartBuilderExtras

export type EnergyRevenuesChartOptions = ChartBuilderOptions &
  RegionChartBuilderExtras &
  Partial<{
    powerDays: number
    powerUnitDivisor: number
  }>

export type HashCostsChartOptions = Partial<{
  siteCode: string
  buckets: number
}>

export type EnergyCostsChartOptions = Partial<{
  siteCode: string
  buckets: number
  powerUnitDivisor: number
}>

export type OperationsChartOptions = ChartBuilderOptions &
  Partial<{
    days: number
    hashrateDivisor: number
    powerDivisor: number
  }>

export type SubsidyFeesChartOptions = Partial<{
  days: number
  regionFilter: string[]
  regionLabelMap: Record<string, string>
  regionColors: Record<string, string>
}>

export type DailyHashrateChartOptions = ChartBuilderOptions & Partial<{
  days: number
}>

export type PowerConsumptionChartOptions = Partial<{
  siteCode: string
  days: number
  powerUnitDivisor: number
}>
