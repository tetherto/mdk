import { cn, ConsumptionIcon } from '@core'
import type { JSX, ReactNode } from 'react'

const fmt = (value: number | undefined, fractionDigits = 3): string =>
  typeof value === 'number'
    ? value.toLocaleString('en-US', {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
      })
    : '—'

export type HeaderConsumptionBoxProps = {
  icon?: ReactNode
  /** Current site-level power consumption, in megawatts. */
  valueMw?: number
  /** Unit label — defaults to `MW`. */
  unit?: string
  className?: string
}

/**
 * Single-row consumption cell for the dashboard's header strip. The `1.663`
 * style numeric is rendered in orange (the warning token) to match the
 * Moria visual treatment.
 *
 * @category dashboard
 * @orkCapability power-monitoring
 * @domain mining-operations
 * @tier agent-ready
 */
export const HeaderConsumptionBox = ({
  icon,
  valueMw,
  unit = 'MW',
  className,
}: HeaderConsumptionBoxProps): JSX.Element => (
  <div className={cn('mdk-header-stat-box', 'mdk-header-stat-box--accent', className)}>
    <span className="mdk-header-stat-box__icon">{icon ?? <ConsumptionIcon />}</span>
    <div className="mdk-header-stat-box__body">
      <div className="mdk-header-stat-box__row">
        <span className="mdk-header-stat-box__label">Consumption</span>
      </div>
      <div className="mdk-header-stat-box__row">
        <span className="mdk-header-stat-box__accent">{fmt(valueMw)}</span>
        <span className="mdk-header-stat-box__unit">{unit}</span>
      </div>
    </div>
  </div>
)

HeaderConsumptionBox.displayName = 'HeaderConsumptionBox'
