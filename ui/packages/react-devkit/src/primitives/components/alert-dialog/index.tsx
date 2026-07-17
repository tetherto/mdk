import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'

import { cn } from '../../utils'
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
  type HTMLAttributes,
  type JSX,
} from 'react'

const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal = AlertDialogPrimitive.Portal

/**
 * Full-viewport scrim rendered behind an `<AlertDialog>` to block interaction with the page.
 *
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const AlertDialogOverlay = forwardRef<
  ComponentRef<typeof AlertDialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn('mdk-dialog__overlay', className)}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

/**
 * Modal content surface for an `<AlertDialog>` — renders the centered panel above the overlay with focus trap.
 *
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const AlertDialogContent = forwardRef<
  ComponentRef<typeof AlertDialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn('mdk-dialog__content', className)}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

/**
 * Top section of an `<AlertDialog>` that groups the title and description above the action row.
 *
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const AlertDialogHeader = ({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>): JSX.Element => {
  return (
    <div className={cn('mdk-dialog__header', className)} {...props}>
      <div className="mdk-dialog__header__container">{children}</div>
    </div>
  )
}
AlertDialogHeader.displayName = 'AlertDialogHeader'

/**
 * Right-aligned action row inside an `<AlertDialog>` — hosts the cancel and confirm buttons.
 *
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const AlertDialogFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): JSX.Element => {
  return <div className={cn('mdk-dialog__footer', className)} {...props} />
}
AlertDialogFooter.displayName = 'AlertDialogFooter'

/**
 * Prominent title text inside an `<AlertDialog>` summarising the action that requires confirmation.
 *
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const AlertDialogTitle = forwardRef<
  ComponentRef<typeof AlertDialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title ref={ref} className={cn('mdk-dialog__title', className)} {...props} />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

/**
 * Supporting body text inside an `<AlertDialog>`; conveys the consequences of the action being confirmed.
 *
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const AlertDialogDescription = forwardRef<
  ComponentRef<typeof AlertDialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn('mdk-dialog__description', className)}
    {...props}
  />
))
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName

/**
 * Primary confirmation button inside an `<AlertDialog>`; clicking dismisses the dialog and runs the action handler.
 *
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const AlertDialogAction = forwardRef<
  ComponentRef<typeof AlertDialogPrimitive.Action>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn('mdk-button mdk-button--variant-primary mdk-button--size-md', className)}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

/**
 * Secondary dismiss button inside an `<AlertDialog>`; closes the dialog without invoking the destructive action.
 *
 * @category dialogs
 * @domain generic
 * @tier agent-ready
 */
const AlertDialogCancel = forwardRef<
  ComponentRef<typeof AlertDialogPrimitive.Cancel>,
  ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn('mdk-button mdk-button--variant-outline mdk-button--size-md', className)}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
