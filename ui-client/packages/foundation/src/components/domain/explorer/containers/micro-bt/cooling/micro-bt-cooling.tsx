import { Indicator, UNITS } from '@tetherto/core'
import type { ReactElement } from 'react'
import { DEVICE_STATUS } from '../../../../../../constants/devices'
import type { Device } from '../../../../../../types'
import { isMicroBTKehua } from '../../../../../../utils/container-utils'
import { getContainerSpecificStats } from '../../../../../../utils/device-utils'
import './micro-bt-cooling.scss'

type MicroBTCoolingProps = {
  /** Device data */
  data?: Device
}

type CduStats = {
  cycle_pump_control?: boolean
  circulation_pump_running_status?: string
  circulation_pump_switch?: string
  circulation_pump_speed?: number
  cooling_fan_control?: boolean
  cooling_system_status?: string
  cooling_fan_switch?: string
  makeup_water_pump_control?: boolean
  makeup_water_pump_fault?: boolean
  makeup_water_pump_switch?: string
}

/**
 * MicroBT Cooling Component
 *
 * Displays cooling system status for MicroBT containers including:
 * - Cycle pump status
 * - Main circulation pump (status, switch, speed)
 * - Cooling fan (status, switch, speed)
 * - Make-up water pump (status, switch, fault)
 *
 * @example
 * ```tsx
 * <MicroBTCooling data={deviceData} />
 * ```
 */
export const MicroBTCooling = ({ data }: MicroBTCoolingProps): ReactElement | null => {
  if (!data) return null

  const { cdu } = getContainerSpecificStats(data) as { cdu: CduStats }
  const isKehua = isMicroBTKehua(data?.type)

  return (
    <div className="mdk-micro-bt-cooling">
      {/* Cycle Pump */}
      <div className="mdk-micro-bt-cooling__section">
        <div className="mdk-micro-bt-cooling__item-row">
          <span className="mdk-micro-bt-cooling__label">Cycle Pump</span>
          <Indicator color={cdu?.cycle_pump_control ? 'green' : 'gray'} size="sm">
            {cdu?.cycle_pump_control ? DEVICE_STATUS.RUNNING : DEVICE_STATUS.OFF}
          </Indicator>
        </div>
      </div>

      <div className="mdk-micro-bt-cooling__divider" />

      {/* Main Circulation Pump */}
      <div className="mdk-micro-bt-cooling__section">
        <h4 className="mdk-micro-bt-cooling__section-title">Main Circulation Pump</h4>
        <div className="mdk-micro-bt-cooling__row">
          <div className="mdk-micro-bt-cooling__item">
            <span className="mdk-micro-bt-cooling__label">Status</span>
            <Indicator color={cdu?.circulation_pump_running_status ? 'green' : 'gray'} size="sm">
              {cdu?.circulation_pump_running_status || '--'}
            </Indicator>
          </div>

          <div className="mdk-micro-bt-cooling__item">
            <span className="mdk-micro-bt-cooling__label">Switch State</span>
            <span className="mdk-micro-bt-cooling__value">
              {cdu?.circulation_pump_switch || '--'}
            </span>
          </div>

          <div className="mdk-micro-bt-cooling__item">
            <span className="mdk-micro-bt-cooling__label">Speed</span>
            <span className="mdk-micro-bt-cooling__value">
              {cdu?.circulation_pump_speed != null
                ? `${cdu.circulation_pump_speed} ${isKehua ? UNITS.PERCENT : UNITS.FREQUENCY_HERTZ}`
                : '--'}
            </span>
          </div>
        </div>
      </div>

      <div className="mdk-micro-bt-cooling__divider" />

      {/* Cooling Fan */}
      <div className="mdk-micro-bt-cooling__section">
        <h4 className="mdk-micro-bt-cooling__section-title">Cooling Fan</h4>
        <div className="mdk-micro-bt-cooling__row">
          <div className="mdk-micro-bt-cooling__item">
            <span className="mdk-micro-bt-cooling__label">Status</span>
            <Indicator color={cdu?.cooling_fan_control ? 'green' : 'gray'} size="sm">
              {cdu?.cooling_fan_control ? DEVICE_STATUS.RUNNING : DEVICE_STATUS.OFF}
            </Indicator>
          </div>

          {isKehua && (
            <div className="mdk-micro-bt-cooling__item">
              <span className="mdk-micro-bt-cooling__label">Speed</span>
              <span className="mdk-micro-bt-cooling__value">
                {cdu?.cooling_system_status || '--'}
              </span>
            </div>
          )}

          <div className="mdk-micro-bt-cooling__item">
            <span className="mdk-micro-bt-cooling__label">Switch State</span>
            <span className="mdk-micro-bt-cooling__value">{cdu?.cooling_fan_switch || '--'}</span>
          </div>
        </div>
      </div>

      <div className="mdk-micro-bt-cooling__divider" />

      {/* Make Up Pump */}
      <div className="mdk-micro-bt-cooling__section">
        <h4 className="mdk-micro-bt-cooling__section-title">Make Up Pump</h4>
        <div className="mdk-micro-bt-cooling__row">
          <div className="mdk-micro-bt-cooling__item">
            <span className="mdk-micro-bt-cooling__label">Status</span>
            <Indicator
              color={
                cdu?.makeup_water_pump_fault
                  ? 'red'
                  : cdu?.makeup_water_pump_control
                    ? 'green'
                    : 'gray'
              }
              size="sm"
            >
              {cdu?.makeup_water_pump_fault
                ? DEVICE_STATUS.ERROR
                : cdu?.makeup_water_pump_control
                  ? DEVICE_STATUS.RUNNING
                  : DEVICE_STATUS.OFF}
            </Indicator>
          </div>

          <div className="mdk-micro-bt-cooling__item">
            <span className="mdk-micro-bt-cooling__label">Switch State</span>
            <span className="mdk-micro-bt-cooling__value">
              {cdu?.makeup_water_pump_switch || '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
