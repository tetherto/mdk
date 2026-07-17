import * as PopoverPrimitive from '@radix-ui/react-popover'

import type { FlexAlign, Position } from '../../types'
import { cn } from '../../utils'
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type FC,
  forwardRef,
  type ReactNode,
} from 'react'

/**
 * Popover Root - Container for a single popover
 * @example
 * ```tsx
 * <Popover>
 *   <PopoverTrigger>Click me</PopoverTrigger>
 *   <PopoverContent>Content here</PopoverContent>
 * </Popover>
 * ```
 * @category overlays
 * @domain generic
 * @tier agent-ready
 */
const Popover = PopoverPrimitive.Root

/**
 * Popover Trigger - Element that triggers the popover
 * @category overlays
 * @domain generic
 * @tier internal
 */
const PopoverTrigger = PopoverPrimitive.Trigger

/**
 * Popover Anchor - Optional anchor point for positioning
 * @category overlays
 * @domain generic
 * @tier internal
 */
const PopoverAnchor = PopoverPrimitive.Anchor

/**
 * Popover Portal - Portals the popover content to document.body
 * @category overlays
 * @domain generic
 * @tier internal
 */
const PopoverPortal = PopoverPrimitive.Portal

/**
 * Popover Close - Button to close the popover
 * @category overlays
 * @domain generic
 * @tier internal
 */
const PopoverClose = PopoverPrimitive.Close

/**
 * Popover Arrow - Small arrow pointing to the trigger
 * @category overlays
 * @domain generic
 * @tier internal
 */
const PopoverArrow = forwardRef<
  ComponentRef<typeof PopoverPrimitive.Arrow>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Arrow>
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
 * @category overlays
 * @domain generic
 * @tier internal
 */
const PopoverContent = forwardRef<
  ComponentRef<typeof PopoverPrimitive.Content>,
  ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
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
  trigger: ReactNode
  /**
   * Popover content
   */
  content: ReactNode
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

/**
 * One-line convenience wrapper that pairs a trigger with floating content — no provider boilerplate.
 *
 * @category overlays
 * @domain generic
 * @tier agent-ready
 */
const SimplePopover: FC<SimplePopoverProps> = ({
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
