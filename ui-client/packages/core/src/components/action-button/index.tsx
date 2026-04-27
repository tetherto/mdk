import { QuestionMarkCircledIcon } from '@radix-ui/react-icons'
import * as React from 'react'

import { cn } from '../../utils'
import { Button } from '../button'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'

type TActionButtonVariant = 'primary' | 'danger' | 'secondary'

type ActionButtonConfirmation = {
  title: string
  cancelLabel?: string
  confirmLabel?: string
  icon?: React.ReactNode
  onCancel?: VoidFunction
  onConfirm?: VoidFunction
  description?: React.ReactNode
}

type ActionButtonProps = {
  label?: string
  loading?: boolean
  disabled?: boolean
  className?: string
  variant?: TActionButtonVariant
  confirmation: ActionButtonConfirmation
  /** Confirmation mode: popover (inline) or dialog (modal). Default: popover */
  mode?: 'popover' | 'dialog'
}

/**
 * ActionButton component with confirmation popover or dialog
 *
 * @example
 * ```tsx
 * <ActionButton
 *   label={`Reboot ${WEBAPP_NAME}`}
 *   variant="secondary"
 *   confirmation={{
 *     title: {`Reboot ${WEBAPP_NAME}`},
 *     description: "The Reboot feature restarts all the device communication workers.",
 *     onConfirm: () => console.log('Confirmed'),
 *     onCancel: () => console.log('Cancelled'),
 *   }}
 * />
 *
 * <ActionButton
 *   label="Factory Reset"
 *   variant="danger"
 *   mode="dialog"
 *   confirmation={{
 *     title: "Confirm Factory Reset",
 *     description: "This action cannot be undone.",
 *     onConfirm: () => console.log('Confirmed'),
 *   }}
 * />
 * ```
 */
const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    { label, loading, disabled, className, confirmation, variant = 'secondary', mode = 'popover' },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false)

    const handleConfirm = (): void => {
      confirmation.onConfirm?.()
      setOpen(false)
    }

    const handleCancel = (): void => {
      confirmation.onCancel?.()
      setOpen(false)
    }

    if (mode === 'dialog') {
      return (
        <>
          <Button
            ref={ref}
            loading={loading}
            variant={variant}
            disabled={disabled}
            onClick={() => setOpen(true)}
            className={cn('mdk_action_button__trigger', className)}
          >
            {label}
          </Button>
          <Dialog open={open} onOpenChange={(isOpen) => !isOpen && setOpen(false)}>
            <DialogContent
              title={confirmation.title}
              closable
              onClose={() => setOpen(false)}
              closeOnClickOutside={false}
            >
              {confirmation.description && (
                <div className="mdk_action_button__description">{confirmation.description}</div>
              )}
              <DialogFooter>
                <Button variant="secondary" onClick={handleCancel}>
                  {confirmation.cancelLabel ?? 'Cancel'}
                </Button>
                <Button variant={variant} onClick={handleConfirm}>
                  {confirmation.confirmLabel ?? 'Confirm'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            ref={ref}
            loading={loading}
            variant={variant}
            disabled={disabled}
            className={cn('mdk_action_button__trigger', className)}
          >
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="mdk_action_button__popover" align="start">
          <div className="mdk_action_button__header">
            <span className={cn('mdk_action_button__icon', `mdk_action_button__icon--${variant}`)}>
              {confirmation.icon ?? <QuestionMarkCircledIcon />}
            </span>
            {confirmation.title && (
              <span className="mdk_action_button__title">{confirmation.title}</span>
            )}
          </div>
          {confirmation.description && (
            <div className="mdk_action_button__description">{confirmation.description}</div>
          )}
          <div className="mdk_action_button__actions">
            <Button variant="secondary" onClick={handleCancel}>
              {confirmation.cancelLabel ?? 'Cancel'}
            </Button>
            <Button variant="primary" onClick={handleConfirm}>
              {confirmation.confirmLabel ?? 'OK'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    )
  },
)

ActionButton.displayName = 'ActionButton'

export { ActionButton }
export type { ActionButtonConfirmation, ActionButtonProps }
