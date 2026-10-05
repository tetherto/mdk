import { cn, HashrateStatIcon } from '@primitives'
import type { JSX, ReactNode } from 'react'
import { WEBAPP_SHORT_NAME } from '../../constants'

const fmt = (value: number | undefined, fractionDigits = 3): string =>
  typeof value === 'number'
    ? value.toLocaleString('en-US', {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
      })
    : '—'

export type HeaderHashrateBoxProps = {
  /** Icon shown next to the stat */
  icon?: ReactNode
  /** App-side aggregate hashrate in PH/s. */
  appPhs?: number
  /** Pool-side aggregate hashrate in PH/s. */
  poolPhs?: number
  /**
   * Hashrate unit label — defaults to `PH/s`.
   * @default PH/s
   */
  unit?: string
  /**
   * Decimal places shown for both values — defaults to `3`.
   * @default 3
   */
  fractionDigits?: number
  /**
   * Label for the app-side row
   * @default WEBAPP_SHORT_NAME ("APP")
   */
  appLabel?: string
  /** Additional class names */
  className?: string
}

/**
 * Two-row hashrate cell for the dashboard's header strip. Shows the app-side
 * and pool-side aggregate hashrate side by side. Values fall back to `—`
 * when undefined.
 *
 * @category dashboard
 * @kernelCapability hashrate-monitoring
 * @domain mining-operations
 * @tier agent-ready
 */
export const HeaderHashrateBox = ({
  icon,
  appPhs,
  poolPhs,
  unit = 'PH/s',
  fractionDigits = 3,
  appLabel = WEBAPP_SHORT_NAME,
  className,
}: HeaderHashrateBoxProps): JSX.Element => (
  <div className={cn('mdk-header-stat-box', className)}>
    <span className="mdk-header-stat-box__icon">{icon ?? <HashrateStatIcon />}</span>
    <div className="mdk-header-stat-box__body">
      <div className="mdk-header-stat-box__row">
        <span className="mdk-header-stat-box__label">Hashrate</span>
        <span className="mdk-header-stat-box__muted">{appLabel}</span>
        <span className="mdk-header-stat-box__value">{fmt(appPhs, fractionDigits)}</span>
        <span className="mdk-header-stat-box__unit">{unit}</span>
      </div>
      <div className="mdk-header-stat-box__row">
        <span className="mdk-header-stat-box__muted">Pool</span>
        <span className="mdk-header-stat-box__value">{fmt(poolPhs, fractionDigits)}</span>
        <span className="mdk-header-stat-box__unit">{unit}</span>
      </div>
    </div>
  </div>
)

HeaderHashrateBox.displayName = 'HeaderHashrateBox'
