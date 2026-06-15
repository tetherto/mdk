export type EbitdaBucket = {
  ts: number
  producedBTC: number
  ebitdaSell: number
  ebitdaHodl: number
  energyUSD: number
  opsUSD: number
  priceSamples: number[]
  [key: string]: unknown
}

export type EbitdaMetric = {
  id: string
  label: string
  value: number
  isNegative?: boolean
} & Partial<{
  unit: string
  prefix: string
  suffix: string
}>

export type MetricFormat = {
  value: number
  unit: string
  prefix: string
}
