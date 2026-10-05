export type MinMaxAvgValues = Partial<{
  /** Minimum value (hidden if empty) */
  min: string
  /** Maximum value (hidden if empty) */
  max: string
  /** Average value (hidden if empty) */
  avg: string
}>

export type MinMaxAvgProps = MinMaxAvgValues & {
  /** Additional root class */
  className?: string
}
