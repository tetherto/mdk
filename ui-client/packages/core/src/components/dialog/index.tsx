import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as React from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'

import { cn } from '../../utils'
import { Button } from '../button'

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

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} className={cn('mdk-dialog__overlay', className)} {...props} />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * Dialog header component
 */
const DialogHeader = ({
  onClose,
  closable,
  children,
  className,
  bare = false,
  ...props
}: DialogHeaderProps & React.HTMLAttributes<HTMLDivElement>): React.JSX.Element => {
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
 * Dialog title component
 */
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('mdk-dialog__title', className)} {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

/**
 * Dialog description component
 */
const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('mdk-dialog__description', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

type DialogPrimitiveContentProps = React.ComponentProps<typeof DialogPrimitive.Content>

/**
 * Dialog content component
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps & React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
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
 * Dialog footer component
 */
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element => {
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
