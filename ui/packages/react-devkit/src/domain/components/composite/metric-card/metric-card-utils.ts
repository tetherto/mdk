import { COLOR } from '@primitives'
import type { MetricCardValueColorProps } from './props'

/**
 * The MetricCard value colour as a hex string.
 *
 * @deprecated MetricCard no longer uses this: the colour comes from the
 * `mdk-metric-card__value--highlighted` / `--transparent` modifiers in
 * `styles.scss`. This mirrors their default-theme values only, so it does not
 * follow a theme that overrides `--mdk-color-primary` or `--mdk-color-white`.
 * It will be removed in a future release.
 */
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
