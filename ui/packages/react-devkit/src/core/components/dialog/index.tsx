import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Cross2Icon } from '@radix-ui/react-icons'

import { cn } from '../../utils'
import { Button } from '../button'
import {
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
  type HTMLAttributes,
  type JSX,
} from 'react'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

export type DialogHeaderProps = {
  bare?: boolean
  closable?: boolean
  onClose?: VoidFunction
}

export type DialogContentProps = {
  title?: string
  description?: string
  closeOnClickOutside?: boolean
  closeOnEscape?: boolean
} & DialogHeaderProps

/**
 * Full-viewport scrim rendered behind an open `<Dialog>` to block background interaction.
 *
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const DialogOverlay = forwardRef<
  ComponentRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} className={cn('mdk-dialog__overlay', className)} {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * Top region of a `<Dialog>` that groups the title and description.
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const DialogHeader = ({
  onClose,
  closable,
  children,
  className,
  bare = false,
  ...props
}: DialogHeaderProps & HTMLAttributes<HTMLDivElement>): JSX.Element => {
  return (
    <div
      className={cn('mdk-dialog__header', { 'mdk-dialog__header--bare': bare }, className)}
      {...props}
    >
      <div className="mdk-dialog__header__container">{children}</div>
      {closable && (
        <DialogClose asChild>
          <Button
            icon={<Cross2Icon />}
            onClick={onClose}
            variant="secondary"
            className="mdk-dialog__header__close"
          />
        </DialogClose>
      )}
    </div>
  )
}
DialogHeader.displayName = 'DialogHeader'

/**
 * Prominent title text at the top of a `<Dialog>` summarising the modal's purpose.
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const DialogTitle = forwardRef<
  ComponentRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('mdk-dialog__title', className)} {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

/**
 * Supporting body copy inside a `<Dialog>` rendered below the title.
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const DialogDescription = forwardRef<
  ComponentRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('mdk-dialog__description', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

type DialogPrimitiveContentProps = ComponentProps<typeof DialogPrimitive.Content>

/**
 * Centered modal surface for a `<Dialog>` — renders above the overlay with focus trap and Escape-to-close.
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const DialogContent = forwardRef<
  ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps & ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(
  (
    {
      className,
      closable,
      onClose,
      title,
      description,
      children,
      bare,
      closeOnClickOutside = true,
      closeOnEscape = true,
      onInteractOutside,
      onEscapeKeyDown,
      ...props
    },
    ref,
  ) => {
    const handleInteractOutside: DialogPrimitiveContentProps['onInteractOutside'] = (event) => {
      if (!closeOnClickOutside) {
        event.preventDefault()
      }

      onInteractOutside?.(event)
    }

    const handleEscapeKeyDown: DialogPrimitiveContentProps['onEscapeKeyDown'] = (event) => {
      if (!closeOnEscape) {
        event.preventDefault()
      }
      onEscapeKeyDown?.(event)
    }

    const contentProps = {
      ...props,
      ...(description ? {} : { 'aria-describedby': undefined }),
    }

    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn('mdk-dialog__content', className)}
          onInteractOutside={handleInteractOutside}
          onEscapeKeyDown={handleEscapeKeyDown}
          {...contentProps}
        >
          <DialogHeader closable={closable} onClose={onClose} bare={bare}>
            {title && (
              <>
                <DialogTitle>{title}</DialogTitle>
                {description && <DialogDescription>{description}</DialogDescription>}
              </>
            )}
          </DialogHeader>
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    )
  },
)
DialogContent.displayName = DialogPrimitive.Content.displayName

/**
 * Action row at the bottom of a `<Dialog>` — typically primary/secondary buttons.
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const DialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element => {
  return <div className={cn('mdk-dialog__footer', className)} {...props} />
}
DialogFooter.displayName = 'DialogFooter'

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
