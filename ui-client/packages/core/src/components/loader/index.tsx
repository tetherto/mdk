import * as React from 'react'

import { cn } from '../../utils'

export type LoaderProps = {
  /**
   * Size of each dot in pixels
   * @default 10
   */
  size?: number
  /**
   * Number of dots to display
   * @default 5
   */
  count?: 3 | 5 | 7
  /**
   * Color variant of the loader
   * @default 'orange'
   */
  color?: 'red' | 'gray' | 'blue' | 'amber' | 'orange'
  /**
   * Custom className for the root element
   */
  className?: string
} & React.ComponentPropsWithoutRef<'div'>

/**
 * Loader component - display pulsing dots animation
 *
 * @example
 * ```tsx
 * <Loader />
 * <Loader size={12} count={5} color="orange" />
 * <Loader color="blue" count={3} />
 * ```
 */
const Loader = React.forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, size = 10, count = 5, color = 'orange', ...props }, ref) => {
    const dots = Array.from({ length: count }, (_, i) => i)

    return (
      <div
        ref={ref}
        className={cn('mdk-loader', className)}
        role="status"
        aria-live="polite"
        aria-label="Loading"
        {...props}
      >
        {dots.map((index) => (
          <span
            key={index}
            className={cn('mdk-loader__dot', `mdk-loader__dot--${color}`)}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              margin: `0 ${size / 1.5}px`,
              animationDelay: `${index * 0.1}s`,
            }}
          />
        ))}
      </div>
    )
  },
)

Loader.displayName = 'Loader'

export { Loader }
