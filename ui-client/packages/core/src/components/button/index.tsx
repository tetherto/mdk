import React from 'react'
import type { ButtonIconPosition, ButtonVariant, ComponentSize } from '../../types'
import { cn } from '../../utils'
import { Spinner } from '../spinner'

export type ButtonProps = Partial<
  {
    loading: boolean
    fullWidth: boolean
    icon: React.ReactNode
    variant: ButtonVariant
    contentClassName: string
    iconPosition: ButtonIconPosition
    size: ComponentSize
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      icon,
      disabled,
      children,
      className,
      fullWidth,
      size,
      type = 'button',
      loading = false,
      contentClassName,
      variant = 'secondary',
      iconPosition = 'left',
      ...props
    },
    ref,
  ) => {
    const leftIcon = icon && iconPosition === 'left'
    const rightIcon = icon && iconPosition === 'right'

    const buttonClasses = cn(
      'mdk-button',
      `mdk-button--variant-${variant}`,
      size && `mdk-button--size-${size}`,
      fullWidth && 'mdk-button--full-width',
      loading && 'mdk-button--loading',
      className,
    )

    const contentClasses = cn(
      'mdk-button__content',
      `mdk-button__content--${variant}`,
      contentClassName,
    )

    return (
      <button
        ref={ref}
        type={type}
        data-variant={variant}
        className={buttonClasses}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <span className="mdk-button__loading" aria-hidden="true">
            <Spinner size="sm" type="circle" />
          </span>
        ) : (
          <span className={contentClasses}>
            {leftIcon && <span className="mdk-button__icon">{icon}</span>}
            {children && <span className="mdk-button__children">{children}</span>}
            {rightIcon && <span className="mdk-button__icon">{icon}</span>}
          </span>
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'

export { Button }
