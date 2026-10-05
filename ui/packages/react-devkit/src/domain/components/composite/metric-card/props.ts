export type MetricCardValueColorProps = Partial<{
  isHighlighted: boolean
  isTransparentColor: boolean
}>

type MetricCardPartialProps = Partial<{
  /**
   * Custom background color (CSS color string)
   * @default BLACK_ALPHA_05
   */
  bgColor: string
  /** Additional class names appended to the root element */
  className: string
  /**
   * Removes the default minimum width so the card shrinks to content
   * @default false
   */
  noMinWidth: boolean
  /**
   * Applies a medium-weight variant to the value typography
   * @default false
   */
  isValueMedium: boolean
  /**
   * Renders the value in orange to draw attention
   * @default false
   */
  isHighlighted: boolean
  /**
   * Displays `—` instead of `0` when value is zero
   * @default false
   */
  showDashForZero: boolean
  /**
   * Renders the value in a low-opacity white for de-emphasized display
   * @default false
   */
  isTransparentColor: boolean
}>

export type MetricCardProps = {
  /** Text label shown above the value */
  label: string
  /** Unit suffix appended after the value (e.g. `"TH/s"`, `"W"`, `"USD"`) */
  unit: string
  /** Metric value to display */
  value: number | string | null
} & MetricCardPartialProps
