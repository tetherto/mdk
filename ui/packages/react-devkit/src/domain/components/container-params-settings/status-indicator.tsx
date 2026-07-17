import type { ReactElement } from 'react'
import { BaseStatusIndicator } from './base-status-indicator/base-status-indicator'

type FlashStatusIndicatorProps = {
  /**
   * Whether the flash indicator is active
   */
  isFlashing?: boolean
  /**
   * Color for the active flash indicator
   */
  color?: string
}

/**
 * Flash Status Indicator Component
 *
 * Displays a visual indicator showing whether a threshold state triggers flashing behavior.
 * Used in threshold tables to show which states cause the UI to flash.
 *
 * @example
 * ```tsx
 * <FlashStatusIndicator isFlashing={true} color={COLOR.RED} />
 * <FlashStatusIndicator isFlashing={false} />
 * ```
 */
export const FlashStatusIndicator = ({
  isFlashing,
  color,
}: FlashStatusIndicatorProps): ReactElement => (
  <BaseStatusIndicator isActive={isFlashing} color={color} type="flash" />
)

type SoundStatusIndicatorProps = {
  /**
   * Whether the sound indicator is active (critical state with sound alert)
   */
  isSuperflashing?: boolean
  /**
   * Color for the active sound indicator
   */
  color?: string
}

/**
 * Sound Status Indicator Component
 *
 * Displays a visual indicator showing whether a threshold state triggers sound alerts.
 * Typically only active for critical high states that require immediate attention.
 *
 * @example
 * ```tsx
 * <SoundStatusIndicator isSuperflashing={true} color={COLOR.RED} />
 * <SoundStatusIndicator isSuperflashing={false} />
 * ```
 */
export const SoundStatusIndicator = ({
  isSuperflashing,
  color,
}: SoundStatusIndicatorProps): ReactElement => (
  <BaseStatusIndicator isActive={isSuperflashing} color={color} type="sound" />
)
