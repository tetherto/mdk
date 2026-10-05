import { createElement, forwardRef, type HTMLAttributes } from 'react'
import type { TextAlign, TypographyColor } from '../../types'
import { cn } from '../../utils'

type TypographyElement = 'h1' | 'h2' | 'h3' | 'p' | 'span'

export type TypographyProps = {
  /**
   * Determines the rendered HTML element and base style
   * @default 'body'
   */
  variant?: 'heading1' | 'heading2' | 'heading3' | 'body' | 'secondary' | 'caption'
  /**
   * Text size; defaults to the variant's size when unset.
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  /**
   * Font weight; defaults to the variant's weight when unset.
   */
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
  /**
   * Text alignment
   */
  align?: TextAlign
  /**
   * Token-based text color
   * @default "default"
   */
  color?: TypographyColor
  /**
   * Truncate text with ellipsis
   * @default false
   */
  truncate?: boolean
  /**
   * Custom className
   */
  className?: string
} & HTMLAttributes<HTMLElement>

/**
 * Typography component for consistent text styling
 *
 * @example
 * ```tsx
 * <Typography variant="heading1">Page Title</Typography>
 * <Typography variant="body">Body text content</Typography>
 * <Typography size="sm" color="muted">Helper text</Typography>
 * ```
 * @category display
 * @domain generic
 * @tier agent-ready
 */
export const Typography = forwardRef<HTMLElement, TypographyProps>(
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

    return createElement(Component, elementProps, children)
  },
)

Typography.displayName = 'Typography'
