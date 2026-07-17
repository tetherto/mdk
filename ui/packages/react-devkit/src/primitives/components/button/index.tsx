import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react'
import type { ButtonIconPosition, ButtonVariant, ComponentSize } from '../../types'
import { cn } from '../../utils'
import { Spinner } from '../spinner'

/**
 * Props for {@link Button}. Extends all native `<button>` attributes.
 */
export type ButtonProps = Partial<
  {
    /** Show a spinner instead of the content and disable the button. */
    loading: boolean
    /** Make the button stretch to fill its container. */
    fullWidth: boolean
    /** Icon node rendered alongside `children`. */
    icon: ReactNode
    /** Visual variant (e.g. `primary`, `secondary`, `ghost`). */
    variant: ButtonVariant
    /** Class names applied to the inner content wrapper. */
    contentClassName: string
    /** Icon placement relative to children. */
    iconPosition: ButtonIconPosition
    /** Size token (`sm`, `md`, `lg`). */
    size: ComponentSize
  } & ButtonHTMLAttributes<HTMLButtonElement>
>

/**
 * Primary action button. Supports loading state with spinner, icon placement,
 * variants, sizes, and full-width layout. Forwards refs and all native button
 * attributes.
 *
 * @category actions
 * @domain generic
 * @tier agent-ready
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleSave}>Save</Button>
 * <Button variant="secondary" icon={<TrashIcon />}>Delete</Button>
 * <Button loading>Submitting…</Button>
 * ```
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
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
