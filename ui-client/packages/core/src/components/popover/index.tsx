import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'

import type { FlexAlign, Position } from '../../types'
import { cn } from '../../utils'

/**
 * Popover Root - Container for a single popover
 * @example
 * ```tsx
 * <Popover>
 *   <PopoverTrigger>Click me</PopoverTrigger>
 *   <PopoverContent>Content here</PopoverContent>
 * </Popover>
 * ```
 */
const Popover = PopoverPrimitive.Root

/**
 * Popover Trigger - Element that triggers the popover
 */
const PopoverTrigger = PopoverPrimitive.Trigger

/**
 * Popover Anchor - Optional anchor point for positioning
 */
const PopoverAnchor = PopoverPrimitive.Anchor

/**
 * Popover Portal - Portals the popover content to document.body
 */
const PopoverPortal = PopoverPrimitive.Portal

/**
 * Popover Close - Button to close the popover
 */
const PopoverClose = PopoverPrimitive.Close

/**
 * Popover Arrow - Small arrow pointing to the trigger
 */
const PopoverArrow = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <PopoverPrimitive.Arrow ref={ref} className={cn('mdk-popover__arrow', className)} {...props} />
))
PopoverArrow.displayName = 'PopoverArrow'

/**
 * Popover Content - The content shown in the popover
 * @example
 * ```tsx
 * <PopoverContent side="bottom" align="start">
 *   <div>Popover content</div>
 *   <PopoverClose />
 * </PopoverContent>
 * ```
 */
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    /**
     * Whether to show the arrow
     * @default false
     */
    showArrow?: boolean
    /**
     * Whether to show a close button
     * @default false
     */
    showClose?: boolean
  }
>(
  (
    {
      className,
      align = 'center',
      sideOffset = 8,
      showArrow = false,
      showClose = false,
      children,
      ...props
    },
    ref,
  ) => (
    <PopoverPortal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn('mdk-popover__content', className)}
        {...props}
      >
        {showClose && (
          <PopoverClose className="mdk-popover__close" aria-label="Close">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </PopoverClose>
        )}
        {children}
        {showArrow && <PopoverArrow />}
      </PopoverPrimitive.Content>
    </PopoverPortal>
  ),
)
PopoverContent.displayName = 'PopoverContent'

/**
 * SimplePopover - Convenient wrapper for basic popover usage
 * @example
 * ```tsx
 * <SimplePopover
 *   trigger={<Button>Click me</Button>}
 *   content={<div>Popover content</div>}
 * />
 * ```
 */
type SimplePopoverProps = {
  /**
   * Element that triggers the popover
   */
  trigger: React.ReactNode
  /**
   * Popover content
   */
  content: React.ReactNode
  /**
   * Position of the popover relative to trigger
   * @default "bottom"
   */
  side?: Position
  /**
   * Alignment of the popover
   * @default "center"
   */
  align?: FlexAlign
  /**
   * Distance from the trigger in pixels
   * @default 8
   */
  sideOffset?: number
  /**
   * Whether to show the arrow
   * @default false
   */
  showArrow?: boolean
  /**
   * Whether to show a close button
   * @default false
   */
  showClose?: boolean
  /**
   * Additional class for content
   */
  className?: string
  /**
   * Controlled open state
   */
  open?: boolean
  /**
   * Callback when open state changes
   */
  onOpenChange?: (open: boolean) => void
}

const SimplePopover: React.FC<SimplePopoverProps> = ({
  trigger,
  content,
  side = 'bottom',
  align = 'center',
  sideOffset = 8,
  showArrow = false,
  showClose = false,
  className,
  open,
  onOpenChange,
}) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        showArrow={showArrow}
        showClose={showClose}
        className={className}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}
SimplePopover.displayName = 'SimplePopover'

export {
  Popover,
  PopoverAnchor,
  PopoverArrow,
  PopoverClose,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
  SimplePopover,
}
