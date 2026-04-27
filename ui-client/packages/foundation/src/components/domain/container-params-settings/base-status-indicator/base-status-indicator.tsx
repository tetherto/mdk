import { cn } from '@mdk/core'
import { CheckIcon, Cross2Icon } from '@radix-ui/react-icons'
import type { ReactElement } from 'react'
import './base-status-indicator.scss'

export type BaseStatusIndicatorProps = {
  /**
   * Whether the indicator is in active state
   */
  isActive?: boolean
  /**
   * Color to display when active
   */
  color?: string
  /**
   * Type of indicator (flash or sound)
   */
  type?: 'flash' | 'sound'
}

/**
 * Base Status Indicator Component
 *
 * Generic indicator component that shows active/inactive states with checkmark or cross icons.
 * When active, displays a checkmark in the specified color.
 * When inactive, displays a cross icon.
 *
 * @example
 * ```tsx
 * <BaseStatusIndicator isActive={true} color={COLOR.RED} type="flash" />
 * <BaseStatusIndicator isActive={false} type="sound" />
 * ```
 */
export const BaseStatusIndicator = ({
  isActive = false,
  color,
  type = 'flash',
}: BaseStatusIndicatorProps): ReactElement => {
  if (isActive) {
    return (
      <div className="mdk-status-indicator mdk-status-indicator--active">
        <span className="mdk-status-indicator__icon" style={{ color }}>
          <CheckIcon />
        </span>
      </div>
    )
  }

  return (
    <div className="mdk-status-indicator mdk-status-indicator--inactive">
      <span
        className={cn('mdk-status-indicator__icon', {
          'mdk-status-indicator__icon--flash': type === 'flash',
          'mdk-status-indicator__icon--sound': type === 'sound',
        })}
      >
        <Cross2Icon />
      </span>
    </div>
  )
}
