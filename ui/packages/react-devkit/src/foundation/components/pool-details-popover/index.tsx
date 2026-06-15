import { Button, cn, Dialog, DialogContent, DialogTrigger } from '@core'
import type { ButtonVariant } from '@core'
import { PoolDetailsCard } from '../pool-details-card'
import type { PoolDetailItem } from '../pool-details-card'
import { forwardRef } from 'react'

const TRIGGER_BUTTON_VARIANT: ButtonVariant = 'secondary'

type PoolDetailsPopoverPartialProps = Partial<{
  title: string
  description: string
  disabled: boolean
  className: string
  triggerLabel: string
}>

type PoolDetailsPopoverProps = PoolDetailsPopoverPartialProps & {
  details: PoolDetailItem[]
}

/**
 * Button-triggered popover that displays a pool's key/value details (URL,
 * fee, worker count, status, …) inside a Radix `Dialog`. Wraps
 * `PoolDetailsCard` so the read-out matches the embedded card variant.
 *
 * @category cards
 * @orkCapability pool-performance
 * @domain mining-operations
 *
 * @example
 * ```tsx
 * <PoolDetailsPopover
 *   triggerLabel="View details"
 *   title="Primary pool"
 *   details={[
 *     { title: 'URL', value: 'stratum+tcp://...' },
 *     { title: 'Fee', value: '1.5 %' },
 *   ]}
 * />
 * ```
 *
 * @tier agent-ready
 */
const PoolDetailsPopover = forwardRef<HTMLDivElement, PoolDetailsPopoverProps>(
  ({ details, title, description, triggerLabel, disabled = false, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('mdk-pool-details-popover', className)} {...props}>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant={TRIGGER_BUTTON_VARIANT} disabled={disabled}>
              {triggerLabel}
            </Button>
          </DialogTrigger>
          <DialogContent
            title={title}
            description={description}
            closable
            className="mdk-pool-details-popover-content"
          >
            <div className="mdk-pool-details-popover-content__body">
              <PoolDetailsCard details={details} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  },
)

PoolDetailsPopover.displayName = 'PoolDetailsPopover'

export { PoolDetailsPopover }
