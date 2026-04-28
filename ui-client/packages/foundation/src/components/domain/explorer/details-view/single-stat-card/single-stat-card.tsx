import { cn, formatValueUnit, SimpleTooltip } from '@tetherto/core'
import type { ReactNode } from 'react'
import './single-stat-card.scss'

const LONG_VALUE_THRESHOLD = 6 // chars

type SingleStatCardProps = {
  /** Stat name/label */
  name?: string
  /** Subtitle text */
  subtitle?: string
  /** Stat value */
  value?: number | string | null
  /** Unit of measurement */
  unit?: string
  /** Color for flash/border */
  color?: string
  /** Enable flash animation */
  flash?: boolean
  /** Enable superflash animation (faster) */
  superflash?: boolean
  /** Custom tooltip text */
  tooltipText?: string
  /** Card variant */
  variant?: 'primary' | 'secondary' | 'tertiary'
  /** Row layout */
  row?: boolean
}

/**
 * Single Stat Card Component
 *
 * Displays a single statistic with optional animations and variants.
 *
 * @example
 * ```tsx
 * <SingleStatCard name="Temperature" value={42} unit="°C" />
 * <SingleStatCard name="Hashrate" value="95.5" unit="TH/s" variant="secondary" />
 * <SingleStatCard name="Alarm" value="Critical" color="red" flash />
 * ```
 */
export const SingleStatCard = ({
  name,
  subtitle = '',
  value = null,
  unit = '',
  color = 'inherit',
  flash = false,
  superflash = false,
  tooltipText = '',
  variant = 'primary',
  row = false,
}: SingleStatCardProps): ReactNode => {
  const valueFormatted = unit && value !== null ? formatValueUnit(value, unit) : value

  const isLongValue = String(value || '').length > LONG_VALUE_THRESHOLD

  const renderContent = (): ReactNode => {
    const textContent = (
      <>
        <div className="mdk-single-stat-card__name">{name}</div>
        {subtitle && <div className="mdk-single-stat-card__subtitle">{subtitle}</div>}
      </>
    )

    return (
      <div
        className={cn(
          'mdk-single-stat-card',
          variant && `mdk-single-stat-card--${variant}`,
          flash && 'mdk-single-stat-card--flash',
          superflash && 'mdk-single-stat-card--superflash',
          row && 'mdk-single-stat-card--row',
          isLongValue && 'mdk-single-stat-card--long-value',
        )}
        style={{ '--stat-color': color } as React.CSSProperties}
      >
        {variant === 'primary' ? (
          textContent
        ) : (
          <div className="mdk-single-stat-card__text">{textContent}</div>
        )}
        <div className="mdk-single-stat-card__value">{valueFormatted}</div>
      </div>
    )
  }

  if (value === null || value === undefined) {
    return renderContent()
  }

  return (
    <SimpleTooltip
      content={`${tooltipText || name}${subtitle ? ` (${subtitle})` : ''}: ${valueFormatted}`}
    >
      {renderContent()}
    </SimpleTooltip>
  )
}
