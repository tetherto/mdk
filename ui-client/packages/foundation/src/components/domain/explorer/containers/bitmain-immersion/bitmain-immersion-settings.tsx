import type { ReactElement } from 'react'
import type { Device } from '../../../../../types/device'
import { ImmersionEditableThresholdForm } from '../../../container-params-settings/immersion-editable-threshold-form'
import {
  getImmersionTemperatureColor,
  shouldImmersionTemperatureFlash,
  shouldImmersionTemperatureSuperflash,
} from './bitmain-immersion-utils'

type BitMainImmersionSettingsProps = {
  /** Device data */
  data?: Device
  /** Container settings with custom thresholds */
  containerSettings?: {
    thresholds?: Record<string, unknown>
  } | null
}

/**
 * BitMain Immersion Settings Component
 *
 * Settings form for BitMain immersion containers with temperature threshold configuration.
 *
 * @example
 * ```tsx
 * <BitMainImmersionSettings data={deviceData} />
 *
 * <BitMainImmersionSettings
 *   data={deviceData}
 *   containerSettings={customSettings}
 * />
 * ```
 */
export const BitMainImmersionSettings = ({
  data,
  containerSettings = null,
}: BitMainImmersionSettingsProps): ReactElement => {
  const status = (data?.status as string) || 'active'

  return (
    <ImmersionEditableThresholdForm
      data={data}
      oilTempColorFunc={(value: number) =>
        getImmersionTemperatureColor(value, status, containerSettings)
      }
      oilTempFlashFunc={(value: number) =>
        shouldImmersionTemperatureFlash(value, status, containerSettings)
      }
      oilTempSuperflashFunc={(value: number) =>
        shouldImmersionTemperatureSuperflash(value, status, containerSettings)
      }
    />
  )
}
