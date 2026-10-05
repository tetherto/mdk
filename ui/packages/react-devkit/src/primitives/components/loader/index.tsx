import { type ComponentPropsWithoutRef, forwardRef } from 'react'
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
   * Render as an inline activity indicator instead of a block loading state.
   *
   * The default reserves a fixed 200px so a panel standing in for absent content does not
   * collapse and then jump. Inline, that height is wrong: it strands the dots ~100px below the
   * thing they belong to and centers them against surrounding text, which reads as frozen.
   * @default false
   */
  inline?: boolean
  /**
   * Custom className for the root element
   */
  className?: string
} & ComponentPropsWithoutRef<'div'>

/**
 * Loader component - display pulsing dots animation
 *
 * @example
 * ```tsx
 * <Loader />
 * <Loader size={12} count={5} color="orange" />
 * <Loader color="blue" count={3} />
 * <Loader inline size={6} count={3} />  // in a flow of content
 * ```
 * @category feedback
 * @domain generic
 * @tier agent-ready
 */
const Loader = forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, size = 10, count = 5, color = 'orange', inline = false, ...props }, ref) => {
    const dots = Array.from({ length: count }, (_, i) => i)

    return (
      <div
        ref={ref}
        className={cn('mdk-loader', inline && 'mdk-loader--inline', className)}
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
