import * as React from 'react'

import { cn } from '@tetherto/mdk-core-ui'

const noDataMessage = 'No data available'

export type PoolDetailItem = {
  title: string
  value?: string | number
}

type PoolDetailsCardPartialProps = Partial<{
  label: string
  underline: boolean
  className: string
}>

export type PoolDetailsCardProps = PoolDetailsCardPartialProps & {
  details: PoolDetailItem[]
}

const PoolDetailsCard = React.forwardRef<HTMLDivElement, PoolDetailsCardProps>(
  ({ label, details, underline = false, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('mdk-pool-details-card', className)} {...props}>
        {label && (
          <div
            className={cn(
              'mdk-pool-details-card__header',
              underline && 'mdk-pool-details-card__header--underline',
            )}
          >
            <span className="mdk-pool-details-card__label">{label}</span>
          </div>
        )}
        <div className="mdk-pool-details-card__list">
          {details.length === 0 ? (
            <div className="mdk-pool-details-card__empty">{noDataMessage}</div>
          ) : (
            details.map((item, index) => (
              <div key={index} className="mdk-pool-details-card__item">
                <span className="mdk-pool-details-card__item-title">{item.title}</span>
                <span className="mdk-pool-details-card__item-value">
                  {item.value !== undefined ? String(item.value) : '-'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    )
  },
)

PoolDetailsCard.displayName = 'PoolDetailsCard'

export { PoolDetailsCard }
