import { cn, COLOR, FALLBACK } from '@primitives'
import type { CSSProperties, ReactElement } from 'react'

import { getMetricCardValueColor } from './metric-card-utils'
import type { MetricCardProps } from './props'

export { getMetricCardValueColor } from './metric-card-utils'

/**
 * Compact card displaying a labelled metric value with optional highlight and transparency states.
 *
 * @category cards
 * @domain mining-operations
 * @kernelCapability pool-performance
 * @tier agent-ready
 */
export const MetricCard = ({
  unit,
  label,
  value,
  bgColor,
  className,
  noMinWidth = false,
  isHighlighted = false,
  isValueMedium = false,
  showDashForZero = false,
  isTransparentColor = false,
}: MetricCardProps): ReactElement => {
  const displayValue = showDashForZero && value === 0 ? FALLBACK : value

  return (
    <div
      className={cn('mdk-metric-card', noMinWidth && 'mdk-metric-card--no-min-width', className)}
      style={
        {
          '--mdk-metric-card-bg': bgColor ?? COLOR.BLACK_ALPHA_05,
        } as CSSProperties
      }
    >
      <div className="mdk-metric-card__label">{label}</div>
      <div
        className={cn('mdk-metric-card__value', isValueMedium && 'mdk-metric-card__value--medium')}
        style={{ color: getMetricCardValueColor({ isHighlighted, isTransparentColor }) }}
      >
        {displayValue}
        {displayValue !== FALLBACK && unit ? ` ${unit}` : null}
      </div>
    </div>
  )
}
