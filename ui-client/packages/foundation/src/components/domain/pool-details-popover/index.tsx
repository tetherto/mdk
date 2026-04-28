import * as React from 'react'

import { Button, cn, Dialog, DialogContent, DialogTrigger } from '@tetherto/mdk-core-ui'
import type { ButtonVariant } from '@tetherto/mdk-core-ui'
import { PoolDetailsCard } from '../pool-details-card'
import type { PoolDetailItem } from '../pool-details-card'

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

const PoolDetailsPopover = React.forwardRef<HTMLDivElement, PoolDetailsPopoverProps>(
  ({ details, title, description, triggerLabel, disabled = false, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('mdk-pool-details-popover', className)} {...props}>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant={TRIGGER_BUTTON_VARIANT} disabled={disabled}>
              {triggerLabel}
            </Button>
          </DialogTrigger>
          <DialogContent title={title} description={description} closable bare>
            <div className="mdk-pool-details-popover__body">
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
