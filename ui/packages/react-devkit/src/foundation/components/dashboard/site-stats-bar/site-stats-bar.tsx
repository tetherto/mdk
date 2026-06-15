import { cn, SkeletonBlock } from '@core'
import type { JSX } from 'react'
import { GenericDataBox } from '../../container/generic-data-box/generic-data-box'
import { WidgetTopRow } from '../../widget-top-row'
import './site-stats-bar.scss'

export type SiteStatsBarProps = {
  /** Site label rendered in the header row. */
  title: string
  /** Current site-level power consumption, in watts (or whatever `powerUnit` says). */
  power?: number
  /** Display unit for `power` — defaults to `kW`. */
  powerUnit?: string
  /** Aggregate hashrate, in TH/s. */
  totalHashrate?: number
  /** Hashrate display unit — defaults to `TH/s`. */
  hashrateUnit?: string
  /** Total miner count across the site. */
  minerCount?: number
  /** Total container count across the site. */
  containerCount?: number
  /** Render a skeleton bar while data is loading. */
  isLoading?: boolean
  /** Optional class hook. */
  className?: string
}

/**
 * Site-level summary strip composed from `WidgetTopRow` (title + power) and
 * `GenericDataBox` (hashrate / miner-count / container-count). Designed to
 * sit at the top of a dashboard page above the chart cards.
 *
 * @category dashboard
 * @orkCapability hashrate-monitoring
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <SiteStatsBar
 *   title='Site A'
 *   power={1_320_000}
 *   totalHashrate={92.3}
 *   minerCount={1024}
 *   containerCount={4}
 * />
 * ```
 * @tier agent-ready
 */
export const SiteStatsBar = ({
  title,
  power,
  powerUnit = 'kW',
  totalHashrate,
  hashrateUnit = 'TH/s',
  minerCount,
  containerCount,
  isLoading = false,
  className,
}: SiteStatsBarProps): JSX.Element => {
  if (isLoading) {
    return (
      <div className={cn('mdk-site-stats-bar mdk-site-stats-bar--loading', className)}>
        <SkeletonBlock />
      </div>
    )
  }

  return (
    <div className={cn('mdk-site-stats-bar', className)}>
      <WidgetTopRow
        title={title}
        power={power}
        unit={powerUnit}
        className="mdk-site-stats-bar__header"
      />
      <GenericDataBox
        data={[
          {
            label: 'Hashrate',
            value: totalHashrate,
            units: hashrateUnit,
            isHighlighted: true,
          },
          { label: 'Miners', value: minerCount },
          { label: 'Containers', value: containerCount },
        ]}
        fallbackValue="—"
      />
    </div>
  )
}

SiteStatsBar.displayName = 'SiteStatsBar'
