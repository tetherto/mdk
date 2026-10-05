export type OperationsEnergyCostChartData = Partial<{
  energyCostsUSD: number
  operationalCostsUSD: number
}>

export type OperationsEnergyCostChartProps = Partial<{
  /**
   * Chart title
   * @default "Operations vs Energy Cost"
   */
  title: string
  /**
   * Subtitle and tooltip unit label
   * @default $/MWh
   */
  unit: string
  /**
   * Doughnut height in pixels
   * @default 200
   */
  height: number
  /** Extra class on the container */
  className: string
  /**
   * Shows loading overlay on the chart area
   * @default false
   */
  isLoading: boolean
  /** Message when both costs are zero or missing */
  emptyMessage: string
  /** `operationalCostsUSD` and `energyCostsUSD` */
  data: OperationsEnergyCostChartData
}>
