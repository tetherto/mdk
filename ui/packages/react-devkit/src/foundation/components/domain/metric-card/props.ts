export type MetricCardValueColorProps = Partial<{
  isHighlighted: boolean
  isTransparentColor: boolean
}>

type MetricCardPartialProps = Partial<{
  bgColor: string
  className: string
  noMinWidth: boolean
  isValueMedium: boolean
  isHighlighted: boolean
  showDashForZero: boolean
  isTransparentColor: boolean
}>

export type MetricCardProps = {
  label: string
  unit: string
  value: number | string | null
} & MetricCardPartialProps
