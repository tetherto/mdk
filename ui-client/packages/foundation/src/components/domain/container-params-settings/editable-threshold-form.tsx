import type { UnknownRecord } from '@mdk/core'
import { UNITS } from '@mdk/core'
import type { ReactElement } from 'react'
import { BaseThresholdForm } from './base-threshold-form'

type EditableThresholdFormProps = {
  data?: UnknownRecord
  oilTempColorFunc?: (value: number) => string
  oilTempFlashFunc?: (value: number) => boolean
  oilTempSuperflashFunc?: (value: number) => boolean
  tankPressureColorFunc?: (value: number) => string
  tankPressureFlashFunc?: (value: number) => boolean
  tankPressureSuperflashFunc?: (value: number) => boolean
}

/**
 * Editable Threshold Form Component
 *
 * Pre-configured threshold form for oil temperature and tank pressure.
 * Wraps BaseThresholdForm with specific configuration for these two threshold types.
 *
 * @example
 * ```tsx
 * <EditableThresholdForm
 *   data={containerData}
 *   oilTempColorFunc={(temp) => temp > 45 ? COLOR.RED : COLOR.GREEN}
 *   tankPressureFlashFunc={(pressure) => pressure < 2 || pressure > 4}
 * />
 * ```
 */
export const EditableThresholdForm = ({
  data = {},
  oilTempColorFunc,
  oilTempFlashFunc,
  oilTempSuperflashFunc,
  tankPressureColorFunc,
  tankPressureFlashFunc,
  tankPressureSuperflashFunc,
}: EditableThresholdFormProps): ReactElement => {
  // Define the threshold configuration for both oil temperature and tank pressure
  const thresholdConfigs = [
    {
      type: 'oilTemperature',
      title: 'Oil Temperature (°C)',
      unit: UNITS.TEMPERATURE_C,
      colorFunc: oilTempColorFunc,
      flashFunc: oilTempFlashFunc,
      superflashFunc: oilTempSuperflashFunc,
    },
    {
      type: 'tankPressure',
      title: 'Oil Pressure (bar)',
      unit: UNITS.PRESSURE_BAR,
      colorFunc: tankPressureColorFunc,
      flashFunc: tankPressureFlashFunc,
      superflashFunc: tankPressureSuperflashFunc,
    },
  ]

  return <BaseThresholdForm data={data} thresholdConfigs={thresholdConfigs} />
}

export default EditableThresholdForm
