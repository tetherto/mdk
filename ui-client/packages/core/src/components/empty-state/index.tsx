import * as React from 'react'
import { ArchiveIcon, CircleIcon } from '@radix-ui/react-icons'

import { cn } from '../../utils'

import type { ComponentSize } from '../../types'

export type EmptyStateSize = ComponentSize
export type EmptyStateImage = 'default' | 'simple' | React.ReactNode

const ICON_SIZE: Record<EmptyStateSize, string> = {
  sm: '32',
  md: '48',
  lg: '64',
}

export type EmptyStateProps = {
  /**
   * Description text or ReactNode displayed below the image
   */
  description: React.ReactNode
  /**
   * Image to display. Use "default" for the standard illustration,
   * "simple" for a minimal icon, or pass a custom ReactNode.
   * @default "default"
   */
  image?: EmptyStateImage
  /**
   * Size variant controlling spacing and icon dimensions
   * @default "md"
   */
  size?: EmptyStateSize
  /**
   * Additional CSS class name
   */
  className?: string
}

/**
 * Empty state component for displaying placeholder content when no data is available.
 *
 * @example
 * ```tsx
 * <EmptyState description="No data available" />
 * <EmptyState description="No miners found" image="simple" size="sm" />
 * <EmptyState description={<span>Custom <strong>content</strong></span>} />
 * ```
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ description, image = 'default', size = 'md', className, ...props }, ref) => {
    const iconDimension = ICON_SIZE[size]

    const renderImage = (): React.ReactNode => {
      if (image === 'default') {
        return <ArchiveIcon width={iconDimension} height={iconDimension} aria-hidden="true" />
      }
      if (image === 'simple') {
        return <CircleIcon width={iconDimension} height={iconDimension} aria-hidden="true" />
      }
      return image
    }

    return (
      <div
        ref={ref}
        className={cn('mdk-empty-state', `mdk-empty-state--${size}`, className)}
        {...props}
      >
        <div className="mdk-empty-state__image">{renderImage()}</div>
        <div className="mdk-empty-state__description">{description}</div>
      </div>
    )
  },
)
EmptyState.displayName = 'EmptyState'

export { EmptyState }
