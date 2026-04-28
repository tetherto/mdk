import * as React from 'react'

import { cn, SkeletonBlock } from '@tetherto/mdk-core-ui'
import { IncidentRow } from './incident-row'
import type { TIncidentRowProps } from './incident-row'

export type ActiveIncidentsCardPartialProps = Partial<{
  label: string
  isLoading: boolean
  className: string
  skeletonRows: number
  emptyMessage: string
  items: TIncidentRowProps[]
  onItemClick: (id: string) => void
}>

const ActiveIncidentsCard = React.forwardRef<HTMLDivElement, ActiveIncidentsCardPartialProps>(
  (
    {
      className,
      items = [],
      onItemClick,
      emptyMessage,
      skeletonRows = 4,
      isLoading = false,
      label = 'Active Alerts',
      ...props
    },
    ref,
  ) => {
    return (
      <div ref={ref} className={cn('mdk-active-incidents-card', className)} {...props}>
        {label && (
          <div className="mdk-active-incidents-card__header">
            <span className="mdk-active-incidents-card__label">{label}</span>
          </div>
        )}

        {isLoading ? (
          <div className="mdk-active-incidents-card__skeleton-container">
            {Array.from({ length: skeletonRows }).map((_, index) => (
              <SkeletonBlock key={index} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mdk-active-incidents-card__empty">{emptyMessage}</div>
        ) : (
          <div className="mdk-active-incidents-card__list">
            {items.map((item) => (
              <IncidentRow key={item.id} {...item} onClick={onItemClick} />
            ))}
          </div>
        )}
      </div>
    )
  },
)

ActiveIncidentsCard.displayName = 'ActiveIncidentsCard'

export { ActiveIncidentsCard }
export type { TIncidentRowProps }
