import * as React from 'react'

import type { TextAlign, TypographyColor } from '../../types'
import { cn } from '../../utils'

type TypographyElement = 'h1' | 'h2' | 'h3' | 'p' | 'span'

export type TypographyProps = {
  /**
   * Typography variant
   * @default 'body'
   */
  variant?: 'heading1' | 'heading2' | 'heading3' | 'body' | 'secondary' | 'caption'
  /**
   * Text size
   * @default undefined (uses variant default)
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  /**
   * Font weight
   * @default undefined (uses variant default)
   */
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
  /**
   * Text alignment
   */
  align?: TextAlign
  /**
   * Text color variant
   */
  color?: TypographyColor
  /**
   * Truncate text with ellipsis
   */
  truncate?: boolean
  /**
   * Custom className
   */
  className?: string
} & React.HTMLAttributes<HTMLElement>

/**
 * Typography component for consistent text styling
 *
 * @example
 * ```tsx
 * <Typography variant="heading1">Page Title</Typography>
 * <Typography variant="body">Body text content</Typography>
 * <Typography size="sm" color="muted">Helper text</Typography>
 * ```
 */
export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  (
    {
      variant = 'body',
      size,
      weight,
      align,
      color = 'default',
      truncate = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    // Default element based on variant
    const defaultElement: Record<string, TypographyElement> = {
      heading1: 'h1',
      heading2: 'h2',
      heading3: 'h3',
      body: 'p',
      secondary: 'p',
      caption: 'span',
    }

    const Component = defaultElement[variant] as TypographyElement

    const elementProps = {
      ref,
      className: cn(
        'mdk-typography',
        `mdk-typography--${variant}`,
        size && `mdk-typography--size-${size}`,
        weight && `mdk-typography--weight-${weight}`,
        align && `mdk-typography--align-${align}`,
        `mdk-typography--color-${color}`,
        truncate && 'mdk-typography--truncate',
        className,
      ),
      ...props,
    }

    return React.createElement(Component, elementProps, children)
  },
)

Typography.displayName = 'Typography'
