import * as AvatarPrimitive from '@radix-ui/react-avatar'

import { cn } from '../../utils'
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react'

/**
 * Circular avatar surface that shows a profile image with a graceful text fallback when the image fails to load.
 * @category display
 * @domain generic
 * @tier agent-ready
 */
const Avatar = forwardRef<
  ComponentRef<typeof AvatarPrimitive.Root>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root ref={ref} className={cn('mdk-avatar', className)} {...props} />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

/**
 * Profile image slot inside `<Avatar>` — renders `src` and triggers the fallback on load failure.
 * @category display
 * @domain generic
 * @tier agent-ready
 */
const AvatarImage = forwardRef<
  ComponentRef<typeof AvatarPrimitive.Image>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn('mdk-avatar__image', className)} {...props} />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

/**
 * Initials or icon placeholder shown inside `<Avatar>` while the image loads or when no image is available.
 * @category display
 * @domain generic
 * @tier agent-ready
 */
const AvatarFallback = forwardRef<
  ComponentRef<typeof AvatarPrimitive.Fallback>,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('mdk-avatar__fallback', className)}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarFallback, AvatarImage }
