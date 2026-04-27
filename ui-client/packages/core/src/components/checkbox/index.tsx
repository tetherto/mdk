import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as React from 'react'

import type { BorderRadius, ComponentColor, ComponentSize } from '../../types'
import { cn } from '../../utils'

export type { CheckedState } from '@radix-ui/react-checkbox'

export type CheckboxSize = 'xs' | ComponentSize

export type CheckboxProps = {
  /**
   * Size variant of the checkbox
   * @default 'md'
   */
  size?: CheckboxSize
  /**
   * Color variant when checked
   * @default 'primary'
   */
  color?: ComponentColor
  /**
   * Border radius variant
   * @default 'none'
   */
  radius?: BorderRadius
  /**
   * Custom className for the root element
   */
  className?: string
  /**
   * Custom className for the indicator element
   */
  indicatorClassName?: string
  /**
   * Callback when the checked state changes
   */
  onCheckedChange?: (checked: CheckboxPrimitive.CheckedState) => void
} & React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>

/**
 * Checkbox component with full customization
 *
 * @example
 * ```tsx
 * <Checkbox checked={checked} onCheckedChange={setChecked} size="lg" color="primary" />
 * ```
 */
const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  (
    { className, indicatorClassName, size = 'md', color = 'primary', radius = 'none', ...props },
    ref,
  ) => (
    <CheckboxPrimitive.Root
      onCheckedChange={props.onCheckedChange}
      ref={ref}
      className={cn(
        'mdk-checkbox',
        `mdk-checkbox--${size}`,
        `mdk-checkbox--${color}`,
        `mdk-checkbox--radius-${radius}`,
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className={cn('mdk-checkbox__indicator', indicatorClassName)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mdk-checkbox__icon"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }
