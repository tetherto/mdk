import { cn, MinersStatIcon } from '@primitives'
import type { JSX, ReactNode } from 'react'
import { WEBAPP_SHORT_NAME } from '../../constants'

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
  /** Optional app-side meta line — total miners reporting to the app. */
  appTotal?: number
  /** Optional pool-side meta — total miners as reported by upstream pools. */
  poolTotal?: number
  /** Optional pool-side online count (green). */
  poolOnline?: number
  /** Optional pool-side mismatch count (red). */
  poolMismatch?: number
  /**
   * Whether to render the pool counts on the second row. Defaults to `true` only when one
   * of `poolTotal` / `poolOnline` / `poolMismatch` is passed, so a site with no upstream
   * pool shows no empty `Pool (—) — —`. Pass it explicitly to hold the counts' space while
   * they load, or to drop them despite having a pool. The row's `online / total` ratio is
   * app-side and always rendered.
   */
  showPool?: boolean
  /**
   * Label for the app-side row
   * @default WEBAPP_SHORT_NAME ("APP")
   */
  appLabel?: string
  /** Additional class names */
  className?: string
}

/**
 * Two-row miner-count cell for the dashboard's header strip. Top row carries
 * the app-side `online / error / offline` breakdown; the bottom row pairs the
 * `online / total` ratio with the pool-side equivalent. Numbers fall back to
 * `—` when undefined, and the pool counts are dropped entirely when the site
 * has no pool (see `showPool`).
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
  appTotal,
  poolTotal,
  poolOnline,
  poolMismatch,
  appLabel = WEBAPP_SHORT_NAME,
  showPool,
  className,
}: HeaderMinersBoxProps): JSX.Element => {
  const renderPool =
    showPool ?? (poolTotal !== undefined || poolOnline !== undefined || poolMismatch !== undefined)

  return (
    <div className={cn('mdk-header-stat-box', className)}>
      <span className="mdk-header-stat-box__icon">{icon ?? <MinersStatIcon />}</span>
      <div className="mdk-header-stat-box__body">
        <div className="mdk-header-stat-box__row">
          <span className="mdk-header-stat-box__label">Miners</span>
          <span className="mdk-header-stat-box__muted">
            {appLabel} ({fmt(appTotal)})
          </span>
          <span className="mdk-header-stat-box__success">{fmt(online)}</span>
          <span className="mdk-header-stat-box__warning">{fmt(error)}</span>
          <span className="mdk-header-stat-box__danger">{fmt(offline)}</span>
        </div>
        <div className="mdk-header-stat-box__row">
          <span className="mdk-header-stat-box__accent">{fmt(online)}</span>
          <span className="mdk-header-stat-box__muted">/ {fmt(total)}</span>
          {renderPool && (
            <>
              <span className="mdk-header-stat-box__muted">Pool ({fmt(poolTotal)})</span>
              <span className="mdk-header-stat-box__success">{fmt(poolOnline)}</span>
              <span className="mdk-header-stat-box__danger">{fmt(poolMismatch)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

HeaderMinersBox.displayName = 'HeaderMinersBox'
