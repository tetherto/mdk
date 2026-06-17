export type OperationsEnergyCostChartData = Partial<{
  energyCostsUSD: number
  operationalCostsUSD: number
}>

export type OperationsEnergyCostChartProps = Partial<{
  title: string
  unit: string
  height: number
  className: string
  isLoading: boolean
  emptyMessage: string
  data: OperationsEnergyCostChartData
}>
