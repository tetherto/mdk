import * as React from 'react'

import type { ComponentSize } from '../../types'
import { cn } from '../../utils'

export type IndicatorColor =
  | 'red'
  | 'gray'
  | 'blue'
  | 'yellow'
  | 'green'
  | 'purple'
  | 'amber'
  | 'slate'

export const INDICATOR_COLORS: Record<string, IndicatorColor> = {
  RED: 'red',
  GRAY: 'gray',
  BLUE: 'blue',
  YELLOW: 'yellow',
  GREEN: 'green',
  PURPLE: 'purple',
  AMBER: 'amber',
  SLATE: 'slate',
} as const

export type IndicatorProps = {
  /**
   * Color variant of the indicator
   * @default 'gray'
   */
  color?: IndicatorColor
  /**
   * Size variant of the indicator
   * @default 'md'
   */
  size?: ComponentSize
  /**
   * Custom className for the root element
   */
  className?: string
  /**
   * When true, adds extra spacing between child elements and stacks them vertically.
   * Useful for displaying multiple pieces of information (e.g. status + count) in a clear way.
   * @default false
   */
  vertical?: boolean
  /**
   * Children content (can include text, icons, multiple elements)
   */
  children?: React.ReactNode
  /**
   * Click handler
   */
  onClick?: VoidFunction
} & React.ComponentPropsWithoutRef<'div'>

/**
 * Indicator component - display status with colored background and label
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Indicator color="green" size="lg">Running</Indicator>
 *
 * // With icon
 * <Indicator color="green">
 *   <span>Functioning</span>
 *   <ChevronDownIcon />
 * </Indicator>
 *
 * // With count
 * <Indicator color="green">
 *   <span>Running</span>
 *   <span>10</span>
 * </Indicator>
 * ```
 */
const Indicator = React.forwardRef<HTMLDivElement, IndicatorProps>(
  (
    { className, color = 'gray', size = 'md', vertical = false, children, onClick, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'mdk-indicator',
          `mdk-indicator--${color}`,
          `mdk-indicator--${size}`,
          onClick && 'mdk-indicator--clickable',
          vertical && 'mdk-indicator--vertical',
          className,
        )}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Indicator.displayName = 'Indicator'

export { Indicator }
