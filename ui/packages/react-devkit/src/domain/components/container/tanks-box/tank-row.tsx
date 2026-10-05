import { Indicator, SimpleTooltip, UNITS } from '@primitives'
import { DEVICE_STATUS } from '../../../constants/devices'
import _isNil from 'lodash/isNil'

import type { JSX } from 'react'

export type TankRowPressure = Partial<{
  value: number
  flash: boolean
  color: string
  tooltip: string
}>

export type TankRowProps = {
  /** Tank identifier label (e.g. "Tank 1") */
  label: string
  /** Current temperature value */
  temperature: number
  /** Temperature unit string (e.g. "°C") */
  unit: string
  /** Running state for the oil pump */
  oilPumpEnabled: boolean
  /** Running state for the water pump */
  waterPumpEnabled: boolean
  /** CSS colour for the temperature value (threshold-driven) */
  color: string
  /** Enables flash animation on the temperature row */
  flash?: boolean
  /** Tooltip text for the temperature value */
  tooltip?: string
  /** Pressure reading with optional flash/colour/tooltip */
  pressure: TankRowPressure
}

/**
 * Single tank-list row used inside `<TanksBox>` to display per-tank temperature and pressure.
 *
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const TankRow = ({
  label,
  temperature,
  unit,
  oilPumpEnabled,
  waterPumpEnabled,
  color,
  flash,
  tooltip,
  pressure,
}: TankRowProps): JSX.Element => (
  <div className="mdk-tanks-box__row">
    <span>{label}</span>
    <div className="mdk-tanks-box__params">
      <div className="mdk-tanks-box__param">
        <span
          className="mdk-tanks-box__param-label"
          data-flash={flash || undefined}
          style={{ color: color || 'var(--mdk-color-white-5)' }}
        >
          Temperature
        </span>
        <SimpleTooltip content={tooltip || `Temperature: ${temperature}${unit}`}>
          <span
            className="mdk-tanks-box__param-value"
            data-flash={flash || undefined}
            style={{ color: color || 'var(--mdk-color-white)' }}
          >
            {`${temperature}${unit}`}
          </span>
        </SimpleTooltip>
      </div>
      {!_isNil(pressure.value) && (
        <div className="mdk-tanks-box__param">
          <span
            className="mdk-tanks-box__param-label"
            data-flash={pressure.flash || undefined}
            style={{
              color: pressure.color || 'var(--mdk-color-white-5)',
            }}
          >
            Pressure
          </span>
          <SimpleTooltip
            content={pressure.tooltip || `Pressure: ${pressure.value} ${UNITS.PRESSURE_BAR}`}
          >
            <span
              className="mdk-tanks-box__param-value"
              data-flash={pressure.flash || undefined}
              style={{
                color: pressure.color || 'var(--mdk-color-white)',
              }}
            >
              {`${pressure.value} ${UNITS.PRESSURE_BAR}`}
            </span>
          </SimpleTooltip>
        </div>
      )}
    </div>
    <div className="mdk-tanks-box__pump-statuses">
      <div className="mdk-tanks-box__pump-status">
        <span className="mdk-tanks-box__pump-status-title">Oil Pump</span>
        <Indicator color={oilPumpEnabled ? 'green' : 'gray'} size="md">
          {oilPumpEnabled ? DEVICE_STATUS.RUNNING : DEVICE_STATUS.OFF}
        </Indicator>
      </div>
      <div className="mdk-tanks-box__pump-status">
        <span className="mdk-tanks-box__pump-status-title">Water Pump</span>
        <Indicator color={waterPumpEnabled ? 'green' : 'gray'} size="md">
          {waterPumpEnabled ? DEVICE_STATUS.RUNNING : DEVICE_STATUS.OFF}
        </Indicator>
      </div>
    </div>
  </div>
)
