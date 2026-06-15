import { cn, NotificationBellIcon } from '@core'
import type { JSX, MouseEvent } from 'react'
import './header-actions.scss'

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
  /** Accessible label. Defaults to "Active alarms". */
  label?: string
  className?: string
}

const fmt = (value: number | undefined): string | undefined =>
  typeof value === 'number' ? value.toLocaleString('en-US') : undefined

/**
 * Top-bar bell button with a three-line severity badge (critical / high /
 * medium). Counts are caller-provided so the button stays domain-agnostic;
 * pair with `useActiveIncidents` or `useSiteMinerCounts` to wire them.
 *
 * @category dashboard
 * @orkCapability alerting
 * @domain mining-operations
 * @tier agent-ready
 */
export const AlarmsBellButton = ({
  counts = {},
  onClick,
  label = 'Active alarms',
  className,
}: AlarmsBellButtonProps): JSX.Element => {
  const critical = fmt(counts.critical)
  const high = fmt(counts.high)
  const medium = fmt(counts.medium)
  const hasAny = critical !== undefined || high !== undefined || medium !== undefined

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn('mdk-header-action-button', 'mdk-alarms-bell-button', className)}
    >
      {hasAny ? (
        <span className="mdk-alarms-bell-button__badge" aria-hidden="true">
          {critical !== undefined ? (
            <span className="mdk-alarms-bell-button__badge-row mdk-alarms-bell-button__badge-row--critical">
              {critical}
            </span>
          ) : null}
          {high !== undefined ? (
            <span className="mdk-alarms-bell-button__badge-row mdk-alarms-bell-button__badge-row--high">
              {high}
            </span>
          ) : null}
          {medium !== undefined ? (
            <span className="mdk-alarms-bell-button__badge-row mdk-alarms-bell-button__badge-row--medium">
              {medium}
            </span>
          ) : null}
        </span>
      ) : null}
      <span className="mdk-header-action-button__icon">
        <NotificationBellIcon />
      </span>
    </button>
  )
}

AlarmsBellButton.displayName = 'AlarmsBellButton'
