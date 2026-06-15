import { cn, FALLBACK } from '@core'

import './report-metric-card.scss'

export type ReportMetricCardProps = {
  label: string
  value: number | string | null
  unit: string
  isValueMedium?: boolean
  isHighlighted?: boolean
  noMinWidth?: boolean
  showDashForZero?: boolean
}

export const ReportMetricCard = ({
  label,
  value,
  unit,
  isValueMedium = false,
  isHighlighted = false,
  noMinWidth = false,
  showDashForZero = false,
}: ReportMetricCardProps) => {
  const displayValue = showDashForZero && value === 0 ? FALLBACK : value

  return (
    <div
      className={cn(
        'mdk-mining-report-metric-card',
        noMinWidth && 'mdk-mining-report-metric-card--no-min-width',
      )}
    >
      <p className="mdk-mining-report-metric-card__label">{label}</p>
      <p
        className={cn(
          'mdk-mining-report-metric-card__value',
          isHighlighted && 'mdk-mining-report-metric-card__value--highlighted',
          isValueMedium && 'mdk-mining-report-metric-card__value--medium',
        )}
      >
        {displayValue}
        {displayValue !== FALLBACK && unit ? ` ${unit}` : ''}
      </p>
    </div>
  )
}
