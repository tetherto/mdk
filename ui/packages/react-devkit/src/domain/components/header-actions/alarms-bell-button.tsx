import { cn, NotificationBellIcon } from '@primitives'
import type { JSX, MouseEvent } from 'react'
import './header-actions.scss'

/** Severity buckets surfaced by the bell badge, highest → lowest. */
export type AlarmSeverity = 'critical' | 'high' | 'medium'

export type AlarmsBellButtonCounts = {
  critical?: number
  high?: number
  medium?: number
}

export type AlarmsBellButtonProps = {
  /** Severity-bucketed alarm counts rendered in the stacked badge. */
  counts?: AlarmsBellButtonCounts
  /** Click handler — typically opens an alerts panel or routes to /alerts. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  /**
   * Click handler for an individual severity count. When provided, each badge
   * row becomes its own button so an operator can jump straight to the alerts
   * page filtered by that severity (e.g. `/alerts?severity=critical`). When
   * omitted, the counts render as plain (non-interactive) text.
   */
  onSeverityClick?: (severity: AlarmSeverity, event: MouseEvent<HTMLButtonElement>) => void
  /** Accessible label. Defaults to "Active alarms". */
  label?: string
  className?: string
}

const fmt = (value: number | undefined): string | undefined =>
  typeof value === 'number' ? value.toLocaleString('en-US') : undefined

const SEVERITY_ORDER: AlarmSeverity[] = ['critical', 'high', 'medium']

/**
 * Top-bar bell button with a three-line severity badge (critical / high /
 * medium). Counts are caller-provided so the button stays domain-agnostic;
 * pair with `useActiveIncidents` or `useSiteMinerCounts` to wire them.
 *
 * `onClick` fires for the bell itself; pass `onSeverityClick` to make each
 * count its own button (severity-filtered deep-link). The two are independent
 * — clicking a severity does not also fire `onClick`.
 *
 * @category dashboard
 * @kernelCapability alerting
 * @domain mining-operations
 * @tier agent-ready
 */
export const AlarmsBellButton = ({
  counts = {},
  onClick,
  onSeverityClick,
  label = 'Active alarms',
  className,
}: AlarmsBellButtonProps): JSX.Element => {
  const formatted: Record<AlarmSeverity, string | undefined> = {
    critical: fmt(counts.critical),
    high: fmt(counts.high),
    medium: fmt(counts.medium),
  }
  const hasAny = SEVERITY_ORDER.some((severity) => formatted[severity] !== undefined)

  return (
    <div className={cn('mdk-alarms-bell-button-group', className)}>
      {hasAny ? (
        <span className="mdk-alarms-bell-button__badge" aria-hidden={onSeverityClick ? undefined : true}>
          {SEVERITY_ORDER.map((severity) => {
            const value = formatted[severity]
            if (value === undefined) return null
            const rowClassName = cn(
              'mdk-alarms-bell-button__badge-row',
              `mdk-alarms-bell-button__badge-row--${severity}`,
              onSeverityClick && 'mdk-alarms-bell-button__badge-row--interactive',
            )
            return onSeverityClick ? (
              <button
                key={severity}
                type="button"
                aria-label={`${severity} alarms`}
                className={rowClassName}
                onClick={(event) => {
                  event.stopPropagation()
                  onSeverityClick(severity, event)
                }}
              >
                {value}
              </button>
            ) : (
              <span key={severity} className={rowClassName}>
                {value}
              </span>
            )
          })}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn('mdk-header-action-button', 'mdk-alarms-bell-button')}
      >
        <span className="mdk-header-action-button__icon">
          <NotificationBellIcon />
        </span>
      </button>
    </div>
  )
}

AlarmsBellButton.displayName = 'AlarmsBellButton'
