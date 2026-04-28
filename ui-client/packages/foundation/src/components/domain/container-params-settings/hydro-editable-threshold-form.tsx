import { UNITS } from '@tetherto/core'
import type { ReactElement } from 'react'
import type { Device } from '../../../types/device'
import { BaseThresholdForm } from './base-threshold-form'

type HydroEditableThresholdFormProps = {
  /** Device data */
  data?: Device
  /** Water temperature color function */
  waterTempColorFunc?: (value: number) => string
  /** Water temperature flash function */
  waterTempFlashFunc?: (value: number) => boolean
  /** Water temperature superflash function */
  waterTempSuperflashFunc?: (value: number) => boolean
  /** Pressure color function */
  pressureColorFunc?: (value: number) => string
  /** Pressure flash function */
  pressureFlashFunc?: (value: number) => boolean
  /** Pressure superflash function */
  pressureSuperflashFunc?: (value: number) => boolean
}

/**
 * Hydro Editable Threshold Form Component
 *
 * Provides threshold configuration forms for:
 * - Water temperature (°C)
 * - Supply liquid pressure (bar)
 *
 * @example
 * ```tsx
 * <HydroEditableThresholdForm
 *   data={deviceData}
 *   waterTempColorFunc={(value) => value > 50 ? 'red' : 'green'}
 *   pressureColorFunc={(value) => value > 2 ? 'red' : 'green'}
 * />
 * ```
 */
export const HydroEditableThresholdForm = ({
  data,
  waterTempColorFunc,
  waterTempFlashFunc,
  waterTempSuperflashFunc,
  pressureColorFunc,
  pressureFlashFunc,
  pressureSuperflashFunc,
}: HydroEditableThresholdFormProps): ReactElement => {
  const thresholdConfigs = [
    {
      type: 'waterTemperature',
      title: 'Water Temperature (°C)',
      unit: UNITS.TEMPERATURE_C,
      colorFunc: waterTempColorFunc,
      flashFunc: waterTempFlashFunc,
      superflashFunc: waterTempSuperflashFunc,
    },
    {
      type: 'supplyLiquidPressure',
      title: 'Supply Liquid Pressure (bar)',
      unit: UNITS.PRESSURE_BAR,
      colorFunc: pressureColorFunc,
      flashFunc: pressureFlashFunc,
      superflashFunc: pressureSuperflashFunc,
    },
  ]

  return (
    <div className="mdk-hydro-threshold-form">
      <BaseThresholdForm data={data} thresholdConfigs={thresholdConfigs} />
    </div>
  )
}
