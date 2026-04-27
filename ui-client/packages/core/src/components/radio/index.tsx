import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import * as React from 'react'

import type { BorderRadius, ComponentColor, ComponentSize } from '../../types'
import { cn } from '../../utils'

export type RadioProps = {
  /**
   * Size variant of the radio
   * @default 'md'
   */
  size?: ComponentSize
  /**
   * Color variant when checked
   * @default 'default'
   */
  color?: ComponentColor
  /**
   * Border radius variant (full makes it circular)
   * @default 'full'
   */
  radius?: BorderRadius
  /**
   * Custom className for the root element
   */
  className?: string
  /**
   * Label text (or use children for custom content)
   */
  label?: string
  /**
   * Children content (takes precedence over label)
   */
  children?: React.ReactNode
  /**
   * Custom className for the indicator element
   */
  indicatorClassName?: string
} & React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>

/**
 * Radio button component (use within RadioGroup)
 *
 * @example
 * ```tsx
 * <RadioGroup>
 *   <Radio value="option1" />
 *   <Radio value="option2" />
 * </RadioGroup>
 * ```
 */
const Radio = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Item>, RadioProps>(
  (
    {
      className,
      indicatorClassName,
      size = 'md',
      color = 'primary',
      radius = 'full',
      label,
      children,
      ...props
    },
    ref,
  ) => (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'mdk-radio',
        `mdk-radio--${size}`,
        `mdk-radio--${color}`,
        `mdk-radio--radius-${radius}`,
        className,
      )}
      {...props}
    >
      {(label || children) ?? (
        <RadioGroupPrimitive.Indicator className={cn('mdk-radio__indicator', indicatorClassName)} />
      )}
    </RadioGroupPrimitive.Item>
  ),
)

Radio.displayName = 'Radio'

export type RadioGroupProps = {
  /**
   * Layout orientation
   * @default 'vertical'
   */
  orientation?: 'horizontal' | 'vertical'
  /**
   *  Remove gap between radio items
   * @default false
   */
  noGap?: boolean
  /**
   * Custom className for the group
   */
  className?: string
} & React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>

/**
 * RadioGroup component - container for Radio items
 *
 * @example
 * ```tsx
 * <RadioGroup defaultValue="option1" onValueChange={setValue}>
 *   <Radio value="option1" />
 *   <Radio value="option2" />
 * </RadioGroup>
 * ```
 */
const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(({ className, orientation = 'vertical', noGap = false, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn(
      'mdk-radio-group',
      `mdk-radio-group--${orientation}`,
      noGap && 'mdk-radio-group--no-gap',
      className,
    )}
    {...props}
  />
))

RadioGroup.displayName = 'RadioGroup'

/**
 * RadioCard component - button-like radio option
 *
 * Supports an `onChange` callback when selected.
 *
 * @example
 * ```tsx
 * <RadioGroup defaultValue="5min" orientation="horizontal" onValueChange={value => console.log(value)}>
 *   <RadioCard value="5min" label="5 Min" onChange={value => () => console.log('Selected:', value)} />
 *   <RadioCard value="30min" label="30 Min" onChange={value => () => console.log('Selected:', value)} />
 * </RadioGroup>
 * ```
 */
const RadioCard = React.forwardRef<React.ElementRef<typeof RadioGroupPrimitive.Item>, RadioProps>(
  (
    { className, size = 'sm', color = 'default', radius = 'none', label, children, ...props },
    ref,
  ) => (
    <Radio
      ref={ref}
      className={cn(
        'mdk-radio-card',
        `mdk-radio-card--${size}`,
        `mdk-radio-card--${color}`,
        `mdk-radio-card--radius-${radius}`,
        className,
      )}
      {...props}
    >
      {children || label}
    </Radio>
  ),
)

RadioCard.displayName = 'RadioCard'

export { Radio, RadioCard, RadioGroup }
