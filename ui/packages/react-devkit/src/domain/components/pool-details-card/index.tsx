import { cn } from '@primitives'
import { forwardRef } from 'react'

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

/**
 * Compact key/value card for displaying pool metadata (URL, fee, worker count,
 * etc.). Empty list renders a "No data available" placeholder.
 *
 * @category cards
 * @kernelCapability pool-performance
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <PoolDetailsCard
 *   label="Pool details"
 *   details={[
 *     { title: 'URL', value: 'stratum+tcp://...' },
 *     { title: 'Worker', value: 'rig01' },
 *   ]}
 * />
 * ```
 * @tier agent-ready
 */
const PoolDetailsCard = forwardRef<HTMLDivElement, PoolDetailsCardProps>(
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
                <span className="mdk-pool-details-card__item-title">{item.title}:</span>
                <span className="mdk-pool-details-card__item-value">
                  {item.value !== undefined && item.value !== '' ? String(item.value) : '-'}
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
