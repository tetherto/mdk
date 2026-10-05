import { cn, formatValueUnit } from '@primitives'
import type { ReactNode } from 'react'
import './single-stat-card.scss'

const LONG_VALUE_THRESHOLD = 6 // chars

export type SingleStatCardVariant = 'primary' | 'secondary' | 'tertiary' | 'highlighted'

type SingleStatCardProps = {
  /** Stat name/label */
  name?: string
  /**
   * Subtitle text
   * @default ''
   */
  subtitle?: string
  /**
   * Stat value
   * @default null
   */
  value?: number | string | null
  /**
   * Unit of measurement
   * @default ''
   */
  unit?: string
  /**
   * Color for flash/border
   * @default 'inherit'
   */
  color?: string
  /**
   * Enable flash animation
   * @default false
   */
  flash?: boolean
  /**
   * Enable superflash animation (faster)
   * @default false
   */
  superflash?: boolean
  /**
   * Card variant
   * @default "primary"
   */
  variant?: SingleStatCardVariant
  /**
   * Row layout
   * @default false
   */
  row?: boolean
}

/**
 * Hero stat tile rendering one big number with a label and optional delta indicator.
 *
 * Displays a single statistic with optional animations and variants.
 *
 * @example
 * ```tsx
 * <SingleStatCard name="Temperature" value={42} unit="°C" />
 * <SingleStatCard name="Hashrate" value="95.5" unit="TH/s" variant="secondary" />
 * <SingleStatCard name="Alarm" value="Critical" color="red" flash />
 * ```
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const SingleStatCard = ({
  name,
  subtitle = '',
  value = null,
  unit = '',
  color = 'inherit',
  flash = false,
  superflash = false,
  variant = 'primary',
  row = false,
}: SingleStatCardProps): ReactNode => {
  const valueFormatted = unit && value !== null ? formatValueUnit(value, unit) : value

  const isLongValue = String(value || '').length > LONG_VALUE_THRESHOLD

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
