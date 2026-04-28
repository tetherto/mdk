import { UNITS } from '@tetherto/core'
import type { ReactElement } from 'react'
import type { Device } from '../../../types'
import { BaseThresholdForm } from './base-threshold-form'

type MicroBTEditableThresholdFormProps = {
  /** Device data */
  data?: Device
  /** Color function for water temperature */
  waterTempColorFunc?: (value: number) => string
  /** Flash function for water temperature */
  waterTempFlashFunc?: (value: number) => boolean
  /** Superflash function for water temperature */
  waterTempSuperflashFunc?: (value: number) => boolean
}

/**
 * MicroBT Editable Threshold Form Component
 *
 * Displays editable threshold form for MicroBT containers with water temperature configuration.
 *
 * @example
 * ```tsx
 * <MicroBTEditableThresholdForm data={deviceData} />
 *
 * <MicroBTEditableThresholdForm
 *   data={deviceData}
 *   waterTempColorFunc={(value) => value > 40 ? 'red' : 'green'}
 *   waterTempFlashFunc={(value) => value > 45}
 *   waterTempSuperflashFunc={(value) => value > 50}
 * />
 * ```
 */
export const MicroBTEditableThresholdForm = ({
  data,
  waterTempColorFunc,
  waterTempFlashFunc,
  waterTempSuperflashFunc,
}: MicroBTEditableThresholdFormProps): ReactElement => {
  const thresholdConfigs = [
    {
      type: 'waterTemperature',
      title: 'Water Temperature (°C)',
      unit: UNITS.TEMPERATURE_C,
      colorFunc: waterTempColorFunc,
      flashFunc: waterTempFlashFunc,
      superflashFunc: waterTempSuperflashFunc,
    },
  ]

  return <BaseThresholdForm data={data} thresholdConfigs={thresholdConfigs} />
}
