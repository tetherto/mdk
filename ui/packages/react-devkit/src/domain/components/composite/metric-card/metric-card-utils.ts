import { COLOR } from '@primitives'
import type { MetricCardValueColorProps } from './props'

export const getMetricCardValueColor = ({
  isHighlighted,
  isTransparentColor,
}: MetricCardValueColorProps): string => {
  if (isHighlighted) {
    return COLOR.COLD_ORANGE
  }

  if (isTransparentColor) {
    return COLOR.WHITE_ALPHA_05
  }

  return COLOR.WHITE
}
