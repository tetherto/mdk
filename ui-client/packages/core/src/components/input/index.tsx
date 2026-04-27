import * as React from 'react'

import { cn } from '../../utils'
import { Label } from '../label'

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none">
    <g clipPath="url(#search-icon-clip)">
      <path
        d="M11.375 5.6875C11.375 6.94258 10.9676 8.10195 10.2812 9.04258L13.743 12.507C14.0848 12.8488 14.0848 13.4039 13.743 13.7457C13.4012 14.0875 12.8461 14.0875 12.5043 13.7457L9.04258 10.2812C8.10195 10.9703 6.94258 11.375 5.6875 11.375C2.5457 11.375 0 8.8293 0 5.6875C0 2.5457 2.5457 0 5.6875 0C8.8293 0 11.375 2.5457 11.375 5.6875ZM5.6875 9.625C6.20458 9.625 6.7166 9.52315 7.19432 9.32528C7.67204 9.1274 8.1061 8.83736 8.47173 8.47173C8.83736 8.1061 9.1274 7.67204 9.32528 7.19432C9.52315 6.7166 9.625 6.20458 9.625 5.6875C9.625 5.17042 9.52315 4.6584 9.32528 4.18068C9.1274 3.70296 8.83736 3.2689 8.47173 2.90327C8.1061 2.53764 7.67204 2.2476 7.19432 2.04972C6.7166 1.85185 6.20458 1.75 5.6875 1.75C5.17042 1.75 4.6584 1.85185 4.18068 2.04972C3.70296 2.2476 3.2689 2.53764 2.90327 2.90327C2.53764 3.2689 2.2476 3.70296 2.04972 4.18068C1.85185 4.6584 1.75 5.17042 1.75 5.6875C1.75 6.20458 1.85185 6.7166 2.04972 7.19432C2.2476 7.67204 2.53764 8.1061 2.90327 8.47173C3.2689 8.83736 3.70296 9.1274 4.18068 9.32528C4.6584 9.52315 5.17042 9.625 5.6875 9.625Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="search-icon-clip">
        <path d="M0 0H14V14H0V0Z" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

export type InputSize = 'default' | 'medium'

export type InputProps = Omit<React.ComponentProps<'input'>, 'prefix' | 'size'> & {
  /**
   * Optional label displayed above the input
   */
  label?: string
  /**
   * HTML id for the input. Required when using label for accessibility.
   */
  id?: string
  /**
   * Variant of the input
   * - `default`: Standard text input
   * - `search`: Input with magnifying glass icon on the right
   * @default 'default'
   */
  variant?: 'default' | 'search'
  /**
   * Size of the input
   * - `default`: padding 10px 12px, icon 16px
   * - `medium`: padding 6px 12px, icon 12px
   * @default 'default'
   */
  size?: InputSize
  /**
   * Validation error message. When provided, displays error styling (red border) and the message below the input.
   */
  error?: string
  /**
   * Custom className for the root wrapper
   */
  wrapperClassName?: string
  /**
   * Prefix element displayed before the input (left side)
   */
  prefix?: React.ReactNode
  /**
   * Suffix element displayed after the input (right side)
   */
  suffix?: React.ReactNode
}

/**
 * Input component with label support, prefix/suffix, and search variant
 *
 * @example
 * ```tsx
 * <Input label="MAC Address" placeholder="Enter MAC address" id="mac" />
 * <Input variant="search" placeholder="Search" />
 * <Input prefix="$" suffix="USD" placeholder="0.00" />
 * <Input suffix="°C" placeholder="Temperature" />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      wrapperClassName,
      label,
      id,
      variant = 'default',
      size = 'default',
      disabled,
      error,
      prefix,
      suffix,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? React.useId()
    const errorId = `${inputId}-error`
    const showSearchIcon = variant === 'search'
    const hasError = !!error
    const hasPrefix = !!prefix
    const hasSuffix = !!suffix || showSearchIcon

    const input = (
      <div
        className={cn(
          'mdk-input__wrapper',
          `mdk-input__wrapper--size-${size}`,
          showSearchIcon && 'mdk-input__wrapper--search',
          disabled && 'mdk-input__wrapper--disabled',
          hasError && 'mdk-input__wrapper--error',
          hasPrefix && 'mdk-input__wrapper--has-prefix',
          hasSuffix && 'mdk-input__wrapper--has-suffix',
          !label && wrapperClassName,
        )}
      >
        {prefix && (
          <span className="mdk-input__prefix" aria-hidden>
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn('mdk-input', `mdk-input--size-${size}`, className)}
          aria-invalid={hasError || props['aria-invalid']}
          aria-describedby={hasError ? errorId : props['aria-describedby']}
          {...props}
        />
        {suffix && (
          <span className="mdk-input__suffix" aria-hidden>
            {suffix}
          </span>
        )}
        {showSearchIcon && (
          <span className="mdk-input__icon" aria-hidden>
            <SearchIcon />
          </span>
        )}
      </div>
    )

    const content = (
      <>
        {input}
        {hasError && (
          <span id={errorId} className="mdk-input__error" role="alert">
            {error}
          </span>
        )}
      </>
    )

    if (label) {
      return (
        <div className={cn('mdk-input-root', wrapperClassName)}>
          <Label htmlFor={inputId} className="mdk-input__label">
            {label}
          </Label>
          {content}
        </div>
      )
    }

    return content
  },
)

Input.displayName = 'Input'

export { Input }
