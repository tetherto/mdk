import { cn, EfficiencyIcon } from '@primitives'
import type { JSX, ReactNode } from 'react'

const fmt = (value: number | undefined, fractionDigits = 2): string =>
  typeof value === 'number'
    ? value.toLocaleString('en-US', {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
      })
    : '—'

export type HeaderEfficiencyBoxProps = {
  icon?: ReactNode
  /** Efficiency in watts per TH/s. */
  valueWthS?: number
  /** Unit label — defaults to `W/TH/S`. */
  unit?: string
  className?: string
}

/**
 * Single-row efficiency cell for the dashboard's header strip. Displays the
 * W/TH/s metric derived from `power_w / hashrate_th`.
 *
 * @category dashboard
 * @kernelCapability efficiency-monitoring
 * @domain mining-operations
 * @tier agent-ready
 */
export const HeaderEfficiencyBox = ({
  icon,
  valueWthS,
  unit = 'W/TH/S',
  className,
}: HeaderEfficiencyBoxProps): JSX.Element => (
  <div className={cn('mdk-header-stat-box', className)}>
    <span className="mdk-header-stat-box__icon">{icon ?? <EfficiencyIcon />}</span>
    <div className="mdk-header-stat-box__body">
      <div className="mdk-header-stat-box__row">
        <span className="mdk-header-stat-box__label">Efficiency</span>
      </div>
      <div className="mdk-header-stat-box__row">
        <span className="mdk-header-stat-box__value">{fmt(valueWthS)}</span>
        <span className="mdk-header-stat-box__unit">{unit}</span>
      </div>
    </div>
  </div>
)

HeaderEfficiencyBox.displayName = 'HeaderEfficiencyBox'
