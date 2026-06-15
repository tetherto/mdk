import { cn, HashrateStatIcon } from '@core'
import type { JSX, ReactNode } from 'react'

const fmt = (value: number | undefined, fractionDigits = 3): string =>
  typeof value === 'number'
    ? value.toLocaleString('en-US', {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
      })
    : '—'

export type HeaderHashrateBoxProps = {
  icon?: ReactNode
  /** MOS-side aggregate hashrate in PH/s. */
  mosPhs?: number
  /** Pool-side aggregate hashrate in PH/s. */
  poolPhs?: number
  /** Hashrate unit label — defaults to `PH/s`. */
  unit?: string
  className?: string
}

/**
 * Two-row hashrate cell for the dashboard's header strip. Shows the MOS-side
 * and pool-side aggregate hashrate side by side. Values fall back to `—`
 * when undefined.
 *
 * @category dashboard
 * @orkCapability hashrate-monitoring
 * @domain mining-operations
 * @tier agent-ready
 */
export const HeaderHashrateBox = ({
  icon,
  mosPhs,
  poolPhs,
  unit = 'PH/s',
  className,
}: HeaderHashrateBoxProps): JSX.Element => (
  <div className={cn('mdk-header-stat-box', className)}>
    <span className="mdk-header-stat-box__icon">{icon ?? <HashrateStatIcon />}</span>
    <div className="mdk-header-stat-box__body">
      <div className="mdk-header-stat-box__row">
        <span className="mdk-header-stat-box__label">Hashrate</span>
        <span className="mdk-header-stat-box__muted">MOS</span>
        <span className="mdk-header-stat-box__value">{fmt(mosPhs)}</span>
        <span className="mdk-header-stat-box__unit">{unit}</span>
      </div>
      <div className="mdk-header-stat-box__row">
        <span className="mdk-header-stat-box__muted">Pool</span>
        <span className="mdk-header-stat-box__value">{fmt(poolPhs)}</span>
        <span className="mdk-header-stat-box__unit">{unit}</span>
      </div>
    </div>
  </div>
)

HeaderHashrateBox.displayName = 'HeaderHashrateBox'
