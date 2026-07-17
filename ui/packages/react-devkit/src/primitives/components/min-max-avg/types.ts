export type MinMaxAvgValues = Partial<{
  min: string
  max: string
  avg: string
}>

export type MinMaxAvgProps = MinMaxAvgValues & {
  className?: string
}
