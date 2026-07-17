import { cn, MinersStatIcon } from '@primitives'
import type { JSX, ReactNode } from 'react'

const fmt = (value: number | undefined): string =>
  typeof value === 'number' ? value.toLocaleString('en-US') : '—'

export type HeaderMinersBoxProps = {
  /** Icon shown next to the "Miners" label. Caller-provided so the package stays icon-agnostic. */
  icon?: ReactNode
  /** Total miners across the site (denominator of the `158 / 2,188` ratio). */
  total?: number
  /** Online miners (the `158` numerator). */
  online?: number
  /** Miners flagged in warning (the small amber count). */
  error?: number
  /** Miners offline (the small red count). */
  offline?: number
  /** Optional MOS-side meta line — total miners reporting to MOS. */
  mosTotal?: number
  /** Optional pool-side meta — total miners as reported by upstream pools. */
  poolTotal?: number
  /** Optional pool-side online count (green). */
  poolOnline?: number
  /** Optional pool-side mismatch count (red). */
  poolMismatch?: number
  className?: string
}

/**
 * Two-row miner-count cell for the dashboard's header strip. Top row carries
 * the MOS-side `online / error / offline` breakdown; the bottom row shows the
 * pool-side equivalent. Numbers fall back to `—` when undefined.
 *
 * @category dashboard
 * @kernelCapability site-overview
 * @domain mining-operations
 * @tier agent-ready
 */
export const HeaderMinersBox = ({
  icon,
  total,
  online,
  error,
  offline,
  mosTotal,
  poolTotal,
  poolOnline,
  poolMismatch,
  className,
}: HeaderMinersBoxProps): JSX.Element => (
  <div className={cn('mdk-header-stat-box', className)}>
    <span className="mdk-header-stat-box__icon">{icon ?? <MinersStatIcon />}</span>
    <div className="mdk-header-stat-box__body">
      <div className="mdk-header-stat-box__row">
        <span className="mdk-header-stat-box__label">Miners</span>
        <span className="mdk-header-stat-box__muted">MOS ({fmt(mosTotal)})</span>
        <span className="mdk-header-stat-box__success">{fmt(online)}</span>
        <span className="mdk-header-stat-box__warning">{fmt(error)}</span>
        <span className="mdk-header-stat-box__danger">{fmt(offline)}</span>
      </div>
      <div className="mdk-header-stat-box__row">
        <span className="mdk-header-stat-box__accent">{fmt(online)}</span>
        <span className="mdk-header-stat-box__muted">/ {fmt(total)}</span>
        <span className="mdk-header-stat-box__muted">Pool ({fmt(poolTotal)})</span>
        <span className="mdk-header-stat-box__success">{fmt(poolOnline)}</span>
        <span className="mdk-header-stat-box__danger">{fmt(poolMismatch)}</span>
      </div>
    </div>
  </div>
)

HeaderMinersBox.displayName = 'HeaderMinersBox'
