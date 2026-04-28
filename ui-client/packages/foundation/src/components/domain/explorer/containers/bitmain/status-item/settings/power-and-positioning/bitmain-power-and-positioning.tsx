import { formatNumber, unitToKilo } from '@tetherto/core'
import type { ReactElement } from 'react'
import type { ContainerSnap, Device } from '../../../../../../../../types/device'
import { getDeviceData } from '../../../../../../../../utils/device-utils'
import { ContentBox } from '../../../../../../container/content-box/content-box'
import './bitmain-power-and-positioning.scss'

type BitMainPowerAndPositioningProps = {
  /** Container data */
  data?: Device
}

/**
 * Safely converts unknown value to number for unitToKilo
 * Returns 0 if value is not a number
 */
const safeNumber = (value: unknown): number => {
  const num = Number(value)
  return Number.isNaN(num) ? 0 : num
}

/**
 * Safely converts unknown value to string for display
 * Returns empty string if value is null or undefined
 */
const safeString = (value: unknown): string => {
  if (value == null) {
    return ''
  }
  return String(value)
}

/**
 * Bitmain Power and Positioning Component
 *
 * Displays power distribution and GPS location information:
 * - Distribution box #1 and #2 power consumption
 * - Latitude and longitude coordinates with direction
 *
 * @example
 * ```tsx
 * <BitMainPowerAndPositioning data={containerData} />
 * ```
 */
export const BitMainPowerAndPositioning = ({
  data,
}: BitMainPowerAndPositioningProps): ReactElement => {
  const [, deviceData] = getDeviceData(data as Device)
  const snap = deviceData?.snap as ContainerSnap
  const stats = snap?.stats
  const containerSpecific = stats?.container_specific

  return (
    <div className="mdk-bitmain-power-positioning">
      {/* Power Section */}
      <div className="mdk-bitmain-power-positioning__panel">
        <ContentBox title="Power">
          <div className="mdk-bitmain-power-positioning__section">
            <div className="mdk-bitmain-power-positioning__power-item">
              <h4 className="mdk-bitmain-power-positioning__subtitle">#1 Power Distribution:</h4>
              <p className="mdk-bitmain-power-positioning__value">
                Power: {formatNumber(unitToKilo(safeNumber(stats?.distribution_box1_power_w)))} kW
              </p>
            </div>
            <div className="mdk-bitmain-power-positioning__power-item">
              <h4 className="mdk-bitmain-power-positioning__subtitle">#2 Power Distribution:</h4>
              <p className="mdk-bitmain-power-positioning__value">
                Power: {formatNumber(unitToKilo(safeNumber(stats?.distribution_box2_power_w)))} kW
              </p>
            </div>
          </div>
        </ContentBox>
      </div>

      {/* Location Section */}
      <div className="mdk-bitmain-power-positioning__panel">
        <ContentBox title="Location">
          <div className="mdk-bitmain-power-positioning__section">
            <div className="mdk-bitmain-power-positioning__location-grid">
              <div className="mdk-bitmain-power-positioning__location-item">
                <h4 className="mdk-bitmain-power-positioning__subtitle">Latitude</h4>
                <div className="mdk-bitmain-power-positioning__location-details">
                  <p>Latitude: {safeString(containerSpecific?.latitude)}</p>
                  <p>Direction: {safeString(containerSpecific?.latitude_direction)}</p>
                </div>
              </div>
              <div className="mdk-bitmain-power-positioning__location-item">
                <h4 className="mdk-bitmain-power-positioning__subtitle">Longitude</h4>
                <div className="mdk-bitmain-power-positioning__location-details">
                  <p>Longitude: {safeString(containerSpecific?.longitude)}</p>
                  <p>Direction: {safeString(containerSpecific?.longitude_direction)}</p>
                </div>
              </div>
            </div>
          </div>
        </ContentBox>
      </div>
    </div>
  )
}
