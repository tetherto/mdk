import * as React from 'react'

import { cn } from '../../utils'

export type TagProps = {
  /**
   * Color variant of the tag
   * @default 'dark'
   */
  color?: 'dark' | 'red' | 'green' | 'amber' | 'blue'
  /**
   * Custom className for the root element
   */
  className?: string
  /**
   * Children content
   */
  children?: React.ReactNode
} & React.ComponentPropsWithoutRef<'span'>

/**
 * Tag component - display labels, categories, or status
 *
 * @example
 * ```tsx
 * <Tag color="green">Success</Tag>
 * <Tag color="red">Error</Tag>
 * ```
 */
const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, color = 'dark', children, ...props }, ref) => {
    return (
      <span ref={ref} className={cn('mdk-tag', `mdk-tag--${color}`, className)} {...props}>
        {children}
      </span>
    )
  },
)

Tag.displayName = 'Tag'

export { Tag }
