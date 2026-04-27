import * as React from 'react'

import { Label } from '../label'
import { cn } from '../../utils'

export type TextAreaProps = React.ComponentProps<'textarea'> & {
  /**
   * Optional label displayed above the textarea
   */
  label?: string
  /**
   * HTML id for the textarea. Required when using label for accessibility.
   */
  id?: string
  /**
   * Validation error message. When provided, displays error styling (red border) and the message below the textarea.
   */
  error?: string
  /**
   * Custom className for the root wrapper
   */
  wrapperClassName?: string
}

/**
 * TextArea component with label support and error handling
 *
 * @example
 * ```tsx
 * <TextArea label="Description" placeholder="Enter description" id="desc" />
 * <TextArea error="This field is required" placeholder="Required field" />
 * ```
 */
const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, wrapperClassName, label, id, disabled, error, ...props }, ref) => {
    const textareaId = id ?? React.useId()
    const errorId = `${textareaId}-error`
    const hasError = !!error

    const textarea = (
      <div
        className={cn(
          'mdk-textarea__wrapper',
          disabled && 'mdk-textarea__wrapper--disabled',
          hasError && 'mdk-textarea__wrapper--error',
          !label && wrapperClassName,
        )}
      >
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          className={cn('mdk-textarea', className)}
          aria-invalid={hasError || props['aria-invalid']}
          aria-describedby={hasError ? errorId : props['aria-describedby']}
          {...props}
        />
      </div>
    )

    const content = (
      <>
        {textarea}
        {hasError && (
          <span id={errorId} className="mdk-textarea__error" role="alert">
            {error}
          </span>
        )}
      </>
    )

    if (label) {
      return (
        <div className={cn('mdk-textarea-root', wrapperClassName)}>
          <Label htmlFor={textareaId} className="mdk-textarea__label">
            {label}
          </Label>
          {content}
        </div>
      )
    }

    return content
  },
)

TextArea.displayName = 'TextArea'

export { TextArea }
