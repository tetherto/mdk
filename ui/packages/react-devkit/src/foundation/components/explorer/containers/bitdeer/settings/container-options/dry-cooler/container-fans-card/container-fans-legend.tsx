import { cn, FanIcon } from '@core'
import type { ReactElement } from 'react'
import './container-fans-legend.scss'

type ContainerFanLegendProps = {
  /** Fan index/number to display */
  index?: number | null
  /** Whether the fan is enabled/running */
  enabled?: boolean
  /** Custom className */
  className?: string
}

/**
 * Legend strip describing fan states and colours used by the container fans visualisation.
 *
 * Displays a single fan status with number and icon.
 *
 * @example
 * ```tsx
 * <ContainerFanLegend index={1} enabled={true} />
 * <ContainerFanLegend index={2} enabled={false} />
 * ```
 * @category widgets
 * @domain device-management
 * @orkCapability device-management
 * @tier agent-ready
 */
export const ContainerFanLegend = ({
  index,
  enabled = false,
  className,
}: ContainerFanLegendProps): ReactElement => (
  <div
    className={cn(
      'mdk-container-fan-legend',
      {
        'mdk-container-fan-legend--on': enabled,
        'mdk-container-fan-legend--off': !enabled,
      },
      className,
    )}
  >
    <span className="mdk-container-fan-legend__number">
      {index !== null && index !== undefined ? String(index) : ''}
    </span>
    <div
      className={cn('mdk-container-fan-legend__icon', {
        'mdk-container-fan-legend__icon--on': enabled,
        'mdk-container-fan-legend__icon--off': !enabled,
      })}
    >
      <FanIcon />
    </div>
  </div>
)
