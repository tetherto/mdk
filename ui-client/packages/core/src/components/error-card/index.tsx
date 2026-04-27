import * as React from 'react'

import { cn } from '../../utils'

export type ErrorCardVariant = 'card' | 'inline'

export type ErrorCardProps = {
  /**
   * Error message string. Supports `\n` for line breaks.
   */
  error: string
  /**
   * Title displayed above the error message
   * @default "Errors"
   */
  title?: string
  /**
   * Display variant. "card" shows a bordered container, "inline" shows flat text.
   * @default "card"
   */
  variant?: ErrorCardVariant
  /**
   * Additional CSS class name
   */
  className?: string
}

/**
 * Error card component for displaying error messages.
 *
 * @example
 * ```tsx
 * <ErrorCard error="Connection failed" />
 * <ErrorCard error="Line 1\nLine 2" variant="inline" title="Validation Errors" />
 * ```
 */
const ErrorCard = React.forwardRef<HTMLDivElement, ErrorCardProps>(
  ({ error, title = 'Errors', variant = 'card', className, ...props }, ref) => {
    const lines = error.split('\n')

    return (
      <div
        ref={ref}
        className={cn('mdk-error-card', `mdk-error-card--${variant}`, className)}
        {...props}
      >
        <div className="mdk-error-card__title">{title}</div>
        <div className="mdk-error-card__message">
          {lines.map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      </div>
    )
  },
)
ErrorCard.displayName = 'ErrorCard'

export { ErrorCard }
