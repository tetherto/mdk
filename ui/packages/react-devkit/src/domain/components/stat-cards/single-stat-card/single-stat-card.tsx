import { cn, formatValueUnit } from '@primitives'
import type { ReactNode } from 'react'
import './single-stat-card.scss'

const LONG_VALUE_THRESHOLD = 6 // chars

// Whether an optional slot (caption, tag, detail) has anything to show: null,
// undefined, false and '' all leave it out.
const hasContent = (node: ReactNode): boolean => node != null && node !== false && node !== ''

export type SingleStatCardVariant = 'primary' | 'secondary' | 'tertiary' | 'highlighted' | 'compact'

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
   * Color for the value on every variant, plus the border on `tertiary` and the flash animations
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
   * Card variant. `compact` is a centred name-over-value tile in muted text, for
   * dense grids of secondary metrics
   * @default "primary"
   */
  variant?: SingleStatCardVariant
  /**
   * Row layout
   * @default false
   */
  row?: boolean
  /** Short text beside the name, e.g. the unit basis ("per PH/s/day") */
  caption?: string
  /** Badge after the value, e.g. "estimated" or a change */
  tag?: ReactNode
  /** Line below the value, e.g. how the figure was reached */
  detail?: ReactNode
  /** Additional class for the root element */
  className?: string
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
 * <SingleStatCard name="Uptime" value="99.8 %" variant="compact" />
 * <SingleStatCard name="Alarm" value="Critical" color="red" flash />
 * <SingleStatCard name="Hash cost" caption="per PH/s/day" value="16.39" unit="$" tag="estimated" detail="From 12 payouts" />
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
  caption,
  tag,
  detail,
  className,
}: SingleStatCardProps): ReactNode => {
  const valueFormatted = unit && value !== null ? formatValueUnit(value, unit) : value

  const isLongValue = String(value || '').length > LONG_VALUE_THRESHOLD

  const textContent = (
    <>
      <div className="mdk-single-stat-card__name">
        {name}
        {hasContent(caption) && <span className="mdk-single-stat-card__caption">{caption}</span>}
      </div>
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
        className,
      )}
      style={color === 'inherit' ? undefined : ({ '--stat-color': color } as React.CSSProperties)}
    >
      {variant === 'primary' || variant === 'compact' ? (
        textContent
      ) : (
        <div className="mdk-single-stat-card__text">{textContent}</div>
      )}
      {!hasContent(tag) ? (
        <div className="mdk-single-stat-card__value">{valueFormatted}</div>
      ) : (
        <div className="mdk-single-stat-card__value-row">
          <div className="mdk-single-stat-card__value">{valueFormatted}</div>
          <span className="mdk-single-stat-card__tag">{tag}</span>
        </div>
      )}
      {hasContent(detail) && <div className="mdk-single-stat-card__detail">{detail}</div>}
    </div>
  )
}
