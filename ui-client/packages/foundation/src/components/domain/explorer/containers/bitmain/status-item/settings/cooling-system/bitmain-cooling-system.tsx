import type { IndicatorColor } from '@tetherto/core'
import { Indicator } from '@tetherto/core'
import type { ReactElement } from 'react'
import type { ContainerSnap, Device } from '../../../../../../../../types/device'
import { getDeviceData } from '../../../../../../../../utils/device-utils'
import './bitmain-cooling-system.scss'

type BitMainCoolingSystemProps = {
  /** Container data */
  data?: Device
}

/**
 * Get indicator color based on device status and fault
 */
const getIndicatorColor = (isRunning: boolean, hasFault: unknown): IndicatorColor => {
  if (hasFault) return 'red'
  if (isRunning) return 'green'
  return 'gray'
}

/**
 * Get status label
 */
const getStatusLabel = (isRunning: boolean, hasFault: unknown): string => {
  if (hasFault) return 'Fault'
  if (isRunning) return 'Running'
  return 'Off'
}

/**
 * Bitmain Cooling System Component
 *
 * Displays the status of cooling system components including:
 * - Circulating pump
 * - Fluid infusion pump
 * - Fans (1-2)
 * - Cooling tower fans (1-3)
 *
 * @example
 * ```tsx
 * <BitMainCoolingSystem data={containerData} />
 * ```
 */
export const BitMainCoolingSystem = ({ data }: BitMainCoolingSystemProps): ReactElement => {
  const [, deviceData] = getDeviceData(data)
  const snap = deviceData?.snap as ContainerSnap
  const containerSpecific = snap?.stats?.container_specific

  return (
    <div className="mdk-bitmain-cooling-system">
      <div className="mdk-bitmain-cooling-system__wrapper">
        <div className="mdk-bitmain-cooling-system__row">
          <div className="mdk-bitmain-cooling-system__item">
            <div className="mdk-bitmain-cooling-system__label">Circulating pump</div>
            <Indicator
              color={getIndicatorColor(
                Boolean(containerSpecific?.circulating_pump),
                containerSpecific?.circulating_pump_fault,
              )}
              size="md"
            >
              {getStatusLabel(
                Boolean(containerSpecific?.circulating_pump),
                containerSpecific?.circulating_pump_fault,
              )}
            </Indicator>
          </div>
          <div className="mdk-bitmain-cooling-system__item">
            <div className="mdk-bitmain-cooling-system__label">Fluid Infusion pump</div>
            <Indicator
              color={getIndicatorColor(
                Boolean(containerSpecific?.fluid_infusion_pump),
                containerSpecific?.fluid_infusion_pump_fault,
              )}
              size="md"
            >
              {getStatusLabel(
                Boolean(containerSpecific?.fluid_infusion_pump),
                containerSpecific?.fluid_infusion_pump_fault,
              )}
            </Indicator>
          </div>
          <div className="mdk-bitmain-cooling-system__item">
            <div className="mdk-bitmain-cooling-system__label">Fan #1</div>
            <Indicator
              color={getIndicatorColor(
                Boolean(containerSpecific?.fan1),
                containerSpecific?.fan1_fault,
              )}
              size="md"
            >
              {getStatusLabel(Boolean(containerSpecific?.fan1), containerSpecific?.fan1_fault)}
            </Indicator>
          </div>
          <div className="mdk-bitmain-cooling-system__item">
            <div className="mdk-bitmain-cooling-system__label">Fan #2</div>
            <Indicator
              color={getIndicatorColor(
                Boolean(containerSpecific?.fan2),
                containerSpecific?.fan2_fault,
              )}
              size="md"
            >
              {getStatusLabel(Boolean(containerSpecific?.fan2), containerSpecific?.fan2_fault)}
            </Indicator>
          </div>
        </div>

        <div className="mdk-bitmain-cooling-system__row">
          <div className="mdk-bitmain-cooling-system__item">
            <div className="mdk-bitmain-cooling-system__label">Cooling tower fan #1</div>
            <Indicator
              color={getIndicatorColor(
                Boolean(containerSpecific?.cooling_tower_fan1),
                containerSpecific?.cooling_tower_fan1_fault,
              )}
              size="md"
            >
              {getStatusLabel(
                Boolean(containerSpecific?.cooling_tower_fan1),
                containerSpecific?.cooling_tower_fan1_fault,
              )}
            </Indicator>
          </div>
          <div className="mdk-bitmain-cooling-system__item">
            <div className="mdk-bitmain-cooling-system__label">Cooling tower fan #2</div>
            <Indicator
              color={getIndicatorColor(
                Boolean(containerSpecific?.cooling_tower_fan2),
                containerSpecific?.cooling_tower_fan2_fault,
              )}
              size="md"
            >
              {getStatusLabel(
                Boolean(containerSpecific?.cooling_tower_fan2),
                containerSpecific?.cooling_tower_fan2_fault,
              )}
            </Indicator>
          </div>
          <div className="mdk-bitmain-cooling-system__item">
            <div className="mdk-bitmain-cooling-system__label">Cooling tower fan #3</div>
            <Indicator
              color={getIndicatorColor(
                Boolean(containerSpecific?.cooling_tower_fan3),
                containerSpecific?.cooling_tower_fan3_fault,
              )}
              size="md"
            >
              {getStatusLabel(
                Boolean(containerSpecific?.cooling_tower_fan3),
                containerSpecific?.cooling_tower_fan3_fault,
              )}
            </Indicator>
          </div>
        </div>
      </div>
    </div>
  )
}
