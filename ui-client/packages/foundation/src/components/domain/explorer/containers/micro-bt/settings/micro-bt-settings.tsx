import type { ReactElement } from 'react'
import type { Device } from '../../../../../../types'
import { ContainerParamsSettings } from '../../../../container-params-settings'
import { MicroBTEditableThresholdForm } from '../../../../container-params-settings/micro-bt-editable-threshold-form'
import {
  getMicroBtInletTempColor,
  shouldMicroBtTemperatureFlash,
  shouldMicroBtTemperatureSuperflash,
} from './micro-bt-utils'

type MicroBTSettingsProps = {
  /** Device data */
  data?: Device
  /** Container settings with custom thresholds */
  containerSettings?: {
    thresholds?: Record<string, unknown>
  } | null
}

/**
 * MicroBT Settings Component
 *
 * Settings form for MicroBT containers with temperature threshold configuration.
 *
 * @example
 * ```tsx
 * <MicroBTSettings data={deviceData} />
 *
 * <MicroBTSettings
 *   data={deviceData}
 *   containerSettings={customSettings}
 * />
 * ```
 */
export const MicroBTSettings = ({
  data,
  containerSettings = null,
}: MicroBTSettingsProps): ReactElement => {
  return (
    <div className="mdk-micro-bt-settings">
      <ContainerParamsSettings data={data} />

      <div className="mdk-micro-bt-settings__divider" />

      <MicroBTEditableThresholdForm
        data={data}
        waterTempColorFunc={(value: number) =>
          getMicroBtInletTempColor(value, true, containerSettings)
        }
        waterTempFlashFunc={(value: number) =>
          shouldMicroBtTemperatureFlash(value, true, data, containerSettings)
        }
        waterTempSuperflashFunc={(value: number) =>
          shouldMicroBtTemperatureSuperflash(value, data, containerSettings)
        }
      />
    </div>
  )
}
