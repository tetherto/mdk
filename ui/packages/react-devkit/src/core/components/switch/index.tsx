import * as SwitchPrimitives from '@radix-ui/react-switch'

import type { BorderRadius, ComponentColor, ComponentSize } from '../../types'
import { cn } from '../../utils'
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react'

export type SwitchProps = {
  /**
   * Size variant of the switch
   * @default 'md'
   */
  size?: ComponentSize
  /**
   * Color variant when checked
   * @default 'default'
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
   * Custom className for the thumb element
   */
  thumbClassName?: string
} & ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
/**
 * Switch component for toggle controls with full customization
 *
 * @example
 * ```tsx
 * <Switch checked={enabled} onCheckedChange={setEnabled} size="lg" color="primary" />
 * ```
 * @category forms
 * @domain generic
 * @tier agent-ready
 */
const Switch = forwardRef<ComponentRef<typeof SwitchPrimitives.Root>, SwitchProps>(
  (
    { className, thumbClassName, size = 'md', color = 'default', radius = 'none', ...props },
    ref,
  ) => (
    <SwitchPrimitives.Root
      className={cn(
        'mdk-switch',
        `mdk-switch--${size}`,
        `mdk-switch--${color}`,
        `mdk-switch--radius-${radius}`,
        className,
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb className={cn('mdk-switch__thumb', thumbClassName)} />
    </SwitchPrimitives.Root>
  ),
)

Switch.displayName = 'Switch'

export { Switch }
