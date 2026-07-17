import React from 'react'
import { cn, toCssSize } from '../../utils'

export type SkeletonBlockProps = Partial<{
  circle: boolean
  className: string
  width: number | string
  height: number | string
  borderRadius: number | string
}>

/**
 * Rectangular shimmer placeholder used to hint at content shape while data is loading.
 *
 * @category feedback
 * @domain generic
 * @tier agent-ready
 */
const SkeletonBlock = React.forwardRef<HTMLDivElement, SkeletonBlockProps>(
  ({ width, height, className, borderRadius, circle = false, ...props }, ref) => {
    const computedStyle = {
      height: toCssSize(height),
      width: circle ? toCssSize(height) : toCssSize(width),
      borderRadius: circle ? '50%' : toCssSize(borderRadius),
    }

    return (
      <div
        ref={ref}
        className={cn('mdk-skeleton mdk-skeleton__line', className)}
        style={computedStyle}
        {...props}
      />
    )
  },
)

SkeletonBlock.displayName = 'SkeletonBlock'

export { SkeletonBlock }
