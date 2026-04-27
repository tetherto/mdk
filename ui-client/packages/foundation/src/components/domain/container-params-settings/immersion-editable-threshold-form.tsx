import { UNITS } from '@mdk/core'
import type { ReactElement } from 'react'
import type { Device } from '../../../types/device'
import { BaseThresholdForm } from './base-threshold-form'

type ImmersionEditableThresholdFormProps = {
  /** Device data */
  data?: Device
  /** Function to determine oil temperature color */
  oilTempColorFunc?: (value: number) => string
  /** Function to determine if oil temperature should flash */
  oilTempFlashFunc?: (value: number) => boolean
  /** Function to determine if oil temperature should super-flash */
  oilTempSuperflashFunc?: (value: number) => boolean
}

/**
 * Immersion Editable Threshold Form Component
 *
 * Form for editing oil temperature thresholds for BitMain immersion containers.
 *
 * @example
 * ```tsx
 * <ImmersionEditableThresholdForm
 *   data={deviceData}
 *   oilTempColorFunc={(temp) => temp > 50 ? 'red' : 'green'}
 *   oilTempFlashFunc={(temp) => temp > 48}
 *   oilTempSuperflashFunc={(temp) => temp > 50}
 * />
 * ```
 */
export const ImmersionEditableThresholdForm = ({
  data,
  oilTempColorFunc,
  oilTempFlashFunc,
  oilTempSuperflashFunc,
}: ImmersionEditableThresholdFormProps): ReactElement => {
  // Define the threshold configuration for oil temperature
  const thresholdConfigs = [
    {
      type: 'oilTemperature',
      title: 'Oil Temperature (°C)',
      unit: UNITS.TEMPERATURE_C,
      colorFunc: oilTempColorFunc,
      flashFunc: oilTempFlashFunc,
      superflashFunc: oilTempSuperflashFunc,
    },
  ]

  return <BaseThresholdForm data={data} thresholdConfigs={thresholdConfigs} />
}
