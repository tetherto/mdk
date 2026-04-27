import type { ReactNode } from 'react'

import { cn } from '@mdk/core'

import './alerts-table-title.scss'

export type AlertsTableTitleProps = {
  title: ReactNode
  subtitle?: ReactNode
  className?: string
}

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
