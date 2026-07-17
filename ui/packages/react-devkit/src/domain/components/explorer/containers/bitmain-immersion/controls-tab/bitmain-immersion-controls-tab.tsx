import type { IndicatorColor } from '@primitives'
import { Indicator, safeString } from '@primitives'
import type { ReactElement } from 'react'
import type { ContainerSnap, Device } from '../../../../../types/device'
import { getDeviceData } from '../../../../../utils/device-utils'
import './bitmain-immersion-controls-tab.scss'

export type BitMainControlsTabProps = {
  /** Device data */
  data: Device
}

/**
 * Controls tab for a BitMain container exposing start/stop, mode select, and emergency actions.
 *
 * Displays container controls including:
 * - Container fan status
 * - Tank levels (A, B, C, D)
 * - GPS location (latitude/longitude)
 *
 * @example
 * ```tsx
 * <BitMainControlsTab data={deviceData} />
 * ```
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const BitMainControlsTab = ({ data }: BitMainControlsTabProps): ReactElement => {
  const [, deviceData] = getDeviceData(data)
  const snap = deviceData?.snap as ContainerSnap
  const containerSpecific = snap?.stats?.container_specific

  const isContainerFanRunning = Boolean(containerSpecific?.container_fan)
  const hasFanFault = Boolean(containerSpecific?.fan_fault)

  const getFanColor = (): IndicatorColor => {
    if (hasFanFault) return 'red'
    if (isContainerFanRunning) return 'green'
    return 'gray'
  }

  const getFanLabel = (): string => {
    if (hasFanFault) return 'Fault'
    if (isContainerFanRunning) return 'Running'
    return 'Off'
  }

  const tanks = [
    { name: 'Tank A', level: containerSpecific?.tank_a_level },
    { name: 'Tank B', level: containerSpecific?.tank_b_level },
    { name: 'Tank C', level: containerSpecific?.tank_c_level },
    { name: 'Tank D', level: containerSpecific?.tank_d_level },
  ]

  return (
    <div className="mdk-bitmain-controls-tab">
      {/* Fan Status */}
      <div className="mdk-bitmain-controls-tab__section">
        <div className="mdk-bitmain-controls-tab__section-header">
          <span className="mdk-bitmain-controls-tab__section-label">Container Fan</span>
          <Indicator color={getFanColor()} size="md">
            {getFanLabel()}
          </Indicator>
        </div>
      </div>

      {/* Tank Levels */}
      <div className="mdk-bitmain-controls-tab__section">
        <h3 className="mdk-bitmain-controls-tab__title">Tank Levels</h3>
        <div className="mdk-bitmain-controls-tab__grid">
          {tanks.map(({ name, level }) => (
            <div key={name} className="mdk-bitmain-controls-tab__item">
              <span className="mdk-bitmain-controls-tab__label">{name}</span>
              <span className="mdk-bitmain-controls-tab__value">
                {level != null ? `${level} cm` : '--'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="mdk-bitmain-controls-tab__section">
        <h3 className="mdk-bitmain-controls-tab__title">GPS Location</h3>
        <div className="mdk-bitmain-controls-tab__grid">
          <div className="mdk-bitmain-controls-tab__location">
            <span className="mdk-bitmain-controls-tab__location-label">Latitude</span>
            <span className="mdk-bitmain-controls-tab__location-value">
              {safeString(containerSpecific?.latitude) || '--'}
            </span>
            <span className="mdk-bitmain-controls-tab__location-dir">
              {safeString(containerSpecific?.latitude_direction) || '--'}
            </span>
          </div>
          <div className="mdk-bitmain-controls-tab__location">
            <span className="mdk-bitmain-controls-tab__location-label">Longitude</span>
            <span className="mdk-bitmain-controls-tab__location-value">
              {safeString(containerSpecific?.longitude) || '--'}
            </span>
            <span className="mdk-bitmain-controls-tab__location-dir">
              {safeString(containerSpecific?.longitude_direction) || '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
