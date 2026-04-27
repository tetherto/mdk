import { CheckIcon, Cross2Icon } from '@radix-ui/react-icons'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as React from 'react'

import { cn, hexToRgba } from '../../utils'

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.27592 8.65219C6.44783 8.48679 6.67838 8.39641 6.91689 8.40091C7.1554 8.40541 7.38237 8.50442 7.54792 8.67619L11.9999 13.4018L16.4519 8.67619C16.5328 8.58697 16.6309 8.51491 16.7401 8.46427C16.8494 8.41363 16.9678 8.38544 17.0881 8.38137C17.2085 8.37731 17.3285 8.39744 17.4409 8.44059C17.5534 8.48374 17.6561 8.54902 17.7428 8.63257C17.8296 8.71612 17.8987 8.81623 17.946 8.92698C17.9934 9.03772 18.0181 9.15685 18.0185 9.2773C18.019 9.39775 17.9953 9.51706 17.9488 9.62818C17.9023 9.7393 17.834 9.83996 17.7479 9.92419L12.6479 15.3242C12.564 15.4113 12.4633 15.4806 12.352 15.5279C12.2406 15.5752 12.1209 15.5996 11.9999 15.5996C11.8789 15.5996 11.7592 15.5752 11.6479 15.5279C11.5365 15.4806 11.4359 15.4113 11.3519 15.3242L6.25192 9.92419C6.08653 9.75228 5.99615 9.52173 6.00065 9.28322C6.00515 9.04471 6.10416 8.81774 6.27592 8.65219Z"
      fill="currentColor"
    />
  </svg>
)

type SelectContextValue = {
  value?: string
  onClear?: () => void
  allowClear?: boolean
}

const SelectContext = React.createContext<SelectContextValue>({})

export type SelectProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> & {
  /**
   * Show a clear button when a value is selected
   * @default false
   */
  allowClear?: boolean
}

export type SelectSize = 'sm' | 'md' | 'lg'
export type SelectVariant = 'default' | 'colored'

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const Select = ({
  allowClear,
  onValueChange,
  value,
  defaultValue,
  children,
  ...props
}: SelectProps) => {
  const [internalValue, setInternalValue] = React.useState<string | undefined>(defaultValue)
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const handleValueChange = (next: string) => {
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  const handleClear = () => {
    if (!isControlled) setInternalValue(undefined)
    onValueChange?.('')
  }

  return (
    <SelectContext.Provider value={{ value: currentValue, onClear: handleClear, allowClear }}>
      <SelectPrimitive.Root value={currentValue} onValueChange={handleValueChange} {...props}>
        {children}
      </SelectPrimitive.Root>
    </SelectContext.Provider>
  )
}

export type SelectTriggerProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
  /**
   * Size of the select trigger
   * - `sm`: Small (32px height)
   * - `md`: Medium (36px height)
   * - `lg`: Large/Big (40px height)
   * @default 'lg'
   */
  size?: SelectSize
  /**
   * Visual variant
   * - `default`: Standard border style
   * - `colored`: Colored background (10% opacity) with colored text
   * @default 'default'
   */
  variant?: SelectVariant
  /**
   * Custom color for the colored variant (hex color)
   * Only applies when variant="colored"
   * @example "#72F59E"
   */
  color?: string
}

/**
 * SelectTrigger - The button that toggles the select dropdown
 */
const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, size = 'lg', variant = 'default', color, style, ...props }, ref) => {
  const { value, onClear, allowClear } = React.useContext(SelectContext)

  const hasValue = Boolean(value)
  const showClear = allowClear && hasValue

  let coloredStyle = style
  if (variant === 'colored' && color) {
    coloredStyle = {
      '--select-color': color,
      '--select-bg': hexToRgba(color, 0.1),
      '--select-bg-hover': hexToRgba(color, 0.15),
      ...style,
    } as React.CSSProperties
  }

  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        'mdk-select__trigger',
        `mdk-select__trigger--${size}`,
        variant === 'colored' && 'mdk-select__trigger--colored',
        className,
      )}
      style={coloredStyle}
      {...props}
    >
      {children}

      {showClear ? (
        <span
          className="mdk-select__clear"
          role="button"
          aria-label="Clear selection"
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClear?.()
          }}
        >
          <Cross2Icon />
        </span>
      ) : (
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon className="mdk-select__icon" />
        </SelectPrimitive.Icon>
      )}
    </SelectPrimitive.Trigger>
  )
})
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

/**
 * SelectContent - The dropdown content
 */
const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', sideOffset = 4, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn('mdk-select__content', className)}
      position={position}
      sideOffset={sideOffset}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(position === 'popper' && 'mdk-select__viewport mdk-select__viewport--popper')}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

/**
 * SelectLabel - Label for a group of items
 */
const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={cn('mdk-select__label', className)} {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

/**
 * SelectItem - A single selectable option
 */
const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item ref={ref} className={cn('mdk-select__item', className)} {...props}>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="mdk-select__item-indicator">
      <CheckIcon />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

/**
 * SelectSeparator - Visual separator between items
 */
const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('mdk-select__separator', className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
