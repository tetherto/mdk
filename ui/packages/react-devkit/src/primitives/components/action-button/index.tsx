import { QuestionMarkCircledIcon } from '@radix-ui/react-icons'
import { cn } from '../../utils'
import { Button } from '../button'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { forwardRef, useState } from 'react'

type TActionButtonVariant = 'primary' | 'danger' | 'secondary'

type ActionButtonConfirmation = {
  /** Heading shown in the confirmation UI */
  title: string
  /**
   * Label for the cancel button
   * @default 'Cancel'
   */
  cancelLabel?: string
  /**
   * Label for the confirm button. Defaults to `'OK'` in popover mode and
   * `'Confirm'` in dialog mode.
   * @default 'OK' (popover) / 'Confirm' (dialog)
   */
  confirmLabel?: string
  /**
   * Icon shown in the popover header (popover mode only)
   * @default <QuestionMarkCircledIcon>
   */
  icon?: React.ReactNode
  /** Fired when the user cancels */
  onCancel?: VoidFunction
  /** Fired when the user confirms */
  onConfirm?: VoidFunction
  /** Body text or node shown below the title */
  description?: React.ReactNode
}

type ActionButtonProps = {
  /** Button label text */
  label?: string
  /** Shows a spinner on the trigger button */
  loading?: boolean
  /** Disables the trigger button */
  disabled?: boolean
  /** Additional class for the trigger button */
  className?: string
  /**
   * Visual style of the trigger button
   * @default 'secondary'
   */
  variant?: TActionButtonVariant
  /** Configuration for the confirmation UI */
  confirmation: ActionButtonConfirmation
  /**
   * Confirmation mode: popover (inline) or dialog (modal)
   * @default 'popover'
   */
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
 * @category actions
 * @domain generic
 * @tier agent-ready
 */
const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    { label, loading, disabled, className, confirmation, variant = 'secondary', mode = 'popover' },
    ref,
  ) => {
    const [open, setOpen] = useState(false)

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
