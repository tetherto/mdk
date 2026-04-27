import type { ReactElement } from 'react'
import { ContainerFanLegend } from './container-fans-legend'

import type { PumpItem } from '../../pump-box/pump-box'
import './container-fans-card.scss'

type ContainerFansCardProps = {
  fansData?: PumpItem[]
}

/**
 * Container Fans Card Component
 *
 * Displays a grid of fan status indicators.
 * Shows fan number and on/off state with icon.
 *
 * @example
 * ```tsx
 * <ContainerFansCard
 *   fansData={[
 *     { enabled: true, index: 0 },
 *     { enabled: false, index: 1 },
 *     { enabled: true, index: 2 }
 *   ]}
 * />
 * ```
 */
export const ContainerFansCard = ({ fansData }: ContainerFansCardProps): ReactElement | null => {
  if (!fansData || !Array.isArray(fansData)) {
    return null
  }

  return (
    <div className="mdk-container-fans-card">
      {fansData.map((fan, index) => (
        <ContainerFanLegend key={index} enabled={fan.enabled} index={fan.index + 1} />
      ))}
    </div>
  )
}
