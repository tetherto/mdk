import * as React from 'react'

import type { ColorVariant, ComponentSize } from '../../types'
import { cn } from '../../utils'

export type BadgeProps = {
  /**
   * Badge content (wraps children with badge)
   */
  children?: React.ReactNode

  /**
   * Number to display in badge
   * If > overflowCount, will show "overflowCount+"
   */
  count?: number

  /**
   * Maximum count to display
   * @default 99
   */
  overflowCount?: number

  /**
   * Whether to show badge when count is 0
   * @default false
   */
  showZero?: boolean

  /**
   * Show badge as a dot
   * @default false
   */
  dot?: boolean

  /**
   * Custom badge content (overrides count)
   */
  text?: string

  /**
   * Color variant
   * @default 'primary'
   */
  color?: ColorVariant

  /**
   * Badge size
   * @default 'md'
   */
  size?: ComponentSize

  /**
   * Offset position [x, y] in pixels
   * @default [0, 0]
   */
  offset?: [number, number]

  /**
   * Square badge (no border-radius)
   * @default false
   */
  square?: boolean

  /**
   * Custom className for badge
   */
  className?: string

  /**
   * Custom className for wrapper
   */
  wrapperClassName?: string

  /**
   * Badge title for accessibility
   */
  title?: string

  /**
   * Status badge (small dot badge with text)
   */
  status?: 'success' | 'processing' | 'error' | 'warning' | 'default'
}

/**
 * Badge component - Display badge with number or dot
 *
 * @example
 * // Basic number badge
 * ```tsx
 * <Badge count={5}>
 *   <Button>Messages</Button>
 * </Badge>
 * ```
 *
 * @example
 * // Dot badge
 * ```tsx
 * <Badge dot>
 *   <BellIcon />
 * </Badge>
 * ```
 *
 * @example
 * // Square badge
 * ```tsx
 * <Badge count={5} square>
 *   <Button>Messages</Button>
 * </Badge>
 * ```
 *
 * @example
 * // Standalone badge
 * ```tsx
 * <Badge count={25} />
 * <Badge text="NEW" color="primary" square />
 * ```
 *
 * @example
 * // With overflow
 * ```tsx
 * <Badge count={100} overflowCount={99}>
 *   <Button>Notifications</Button>
 * </Badge>
 * // Shows "99+"
 * ```
 *
 * @example
 * // Status badge
 * ```tsx
 * <Badge status="success" text="Online" />
 * <Badge status="error" text="Offline" />
 * ```
 *
 * @example
 * // Different colors
 * ```tsx
 * <Badge count={5} color="success">
 *   <Button>Success</Button>
 * </Badge>
 * <Badge count={5} color="error">
 *   <Button>Error</Button>
 * </Badge>
 * ```
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      count = 0,
      overflowCount = 99,
      showZero = false,
      dot = false,
      text,
      color = 'primary',
      size = 'md',
      offset = [0, 0],
      square = false,
      className,
      wrapperClassName,
      title,
      status,
    },
    ref,
  ) => {
    const hasChildren = Boolean(children)
    const hasOffset = offset[0] !== 0 || offset[1] !== 0
    const shouldApplyOffset = hasChildren && hasOffset

    // Determine if badge should be shown
    const shouldShow = React.useMemo(() => {
      if (dot || status) return true
      if (text) return true
      if (count === 0) return showZero

      return count > 0
    }, [dot, status, text, count, showZero])

    // Get display content
    const displayContent = React.useMemo(() => {
      if (text) return text
      if (dot || status) return null
      if (count > overflowCount) return `${overflowCount}+`

      return count
    }, [text, dot, status, count, overflowCount])

    // Badge element
    const badgeElement = shouldShow && (
      <span
        ref={hasChildren ? undefined : ref}
        className={cn(
          'mdk-badge',
          `mdk-badge--${size}`,
          `mdk-badge--${color}`,
          dot && 'mdk-badge--dot',
          square && 'mdk-badge--square',
          status && `mdk-badge--status mdk-badge--status-${status}`,
          !hasChildren && 'mdk-badge--standalone',
          className,
        )}
        style={{
          ...(shouldApplyOffset && {
            transform: `translate(calc(50% + ${offset[0]}px), calc(-50% + ${offset[1]}px))`,
          }),
        }}
        title={title}
      >
        {displayContent}
      </span>
    )

    // If no children, return badge alone
    if (!hasChildren) {
      return badgeElement
    }

    // Wrap children with badge
    return (
      <span
        ref={ref}
        className={cn('mdk-badge-wrapper', wrapperClassName)}
        data-has-offset={hasOffset}
      >
        {children}
        {badgeElement}
      </span>
    )
  },
)

Badge.displayName = 'Badge'

export { Badge }
