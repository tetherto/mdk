import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import * as React from 'react'

import type { Position } from '../../types'
import { cn } from '../../utils'

/**
 * Tooltip Provider - Wraps your app or tooltip group
 * @example
 * ```tsx
 * <TooltipProvider delayDuration={200}>
 *   <Tooltip>...</Tooltip>
 * </TooltipProvider>
 * ```
 */
const TooltipProvider = TooltipPrimitive.Provider

/**
 * Tooltip Root - Container for a single tooltip
 * @example
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger>Hover me</TooltipTrigger>
 *   <TooltipContent>Helpful information</TooltipContent>
 * </Tooltip>
 * ```
 */
const Tooltip = TooltipPrimitive.Root

/**
 * Tooltip Trigger - Element that triggers the tooltip
 */
const TooltipTrigger = TooltipPrimitive.Trigger

/**
 * Tooltip Portal - Portals the tooltip content to document.body
 */
const TooltipPortal = TooltipPrimitive.Portal

/**
 * Tooltip Arrow - Small arrow pointing to the trigger
 */
const TooltipArrow = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Arrow
    ref={ref}
    asChild
    width={14}
    height={7}
    {...props}
    className={cn('mdk-tooltip__arrow', className)}
  >
    <span />
  </TooltipPrimitive.Arrow>
))
TooltipArrow.displayName = 'TooltipArrow'

/**
 * Tooltip Content - The content shown in the tooltip
 * @example
 * ```tsx
 * <TooltipContent side="top" sideOffset={8}>
 *   Helpful information
 *   <TooltipArrow />
 * </TooltipContent>
 * ```
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    /**
     * Whether to show the arrow
     * @default true
     */
    showArrow?: boolean
  }
>(({ className, align = 'center', sideOffset = 8, showArrow = true, children, ...props }, ref) => (
  <TooltipPortal>
    <TooltipPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn('mdk-tooltip__content', className)}
      {...props}
    >
      <div className="mdk-tooltip__content-main">{children}</div>
      {showArrow && <TooltipArrow />}
    </TooltipPrimitive.Content>
  </TooltipPortal>
))
TooltipContent.displayName = 'TooltipContent'

/**
 * SimpleTooltip - Convenient wrapper for basic tooltip usage
 * @example
 * ```tsx
 * <SimpleTooltip content="Helpful text" side="top">
 *   <button>Hover me</button>
 * </SimpleTooltip>
 * ```
 */
type SimpleTooltipProps = {
  /**
   * Tooltip content (string or JSX)
   */
  content: React.ReactNode
  /**
   * Position of the tooltip relative to trigger
   * @default "top"
   */
  side?: Position
  /**
   * Distance from the trigger in pixels
   * @default 8
   */
  sideOffset?: number
  /**
   * Delay before showing tooltip (ms)
   * @default 200
   */
  delayDuration?: number
  /**
   * Whether to show the arrow
   * @default true
   */
  showArrow?: boolean
  /**
   * Additional class for content
   */
  className?: string
  /**
   * Element that triggers the tooltip
   */
  children: React.ReactNode
}

const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  content,
  side = 'top',
  sideOffset = 8,
  delayDuration = 200,
  showArrow = true,
  className,
  children,
}) => {
  if (!content) return <>{children}</>

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          sideOffset={sideOffset}
          showArrow={showArrow}
          className={className}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
SimpleTooltip.displayName = 'SimpleTooltip'

export {
  SimpleTooltip,
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger,
}
