import type { JSX, ReactNode } from 'react'

import { cn } from '@primitives'

import './alerts-table-title.scss'

export type AlertsTableTitleProps = {
  /** Section heading */
  title: ReactNode
  /** Optional subtitle or count badge */
  subtitle?: ReactNode
  /** Additional CSS class */
  className?: string
}

/**
 * Title strip for an alerts table with the section heading and an optional count badge.
 *
 * @category tables
 * @domain mining-operations
 * @kernelCapability hashrate-monitoring
 * @tier agent-ready
 */
export const AlertsTableTitle = ({
  title,
  subtitle,
  className,
}: AlertsTableTitleProps): JSX.Element => (
  <div className={cn('mdk-alerts-table-title', className)}>
    <div className="mdk-alerts-table-title__title">{title}</div>
    {subtitle ? <div className="mdk-alerts-table-title__subtitle">{subtitle}</div> : null}
  </div>
)
