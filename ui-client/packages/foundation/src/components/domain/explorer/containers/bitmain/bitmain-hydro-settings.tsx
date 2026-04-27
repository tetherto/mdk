import type { ReactElement } from 'react'
import type { Device } from '../../../../../types/device'
import { HydroEditableThresholdForm } from '../../../container-params-settings/hydro-editable-threshold-form'
import './bitmain-hydro-settings.scss'
import {
  getAntspaceSupplyLiquidPressureColor,
  getAntspaceSupplyLiquidTemperatureColor,
  shouldAntspacePressureFlash,
  shouldAntspacePressureSuperflash,
  shouldAntspaceSupplyLiquidTempFlash,
  shouldAntspaceSupplyLiquidTempSuperflash,
} from './bitmain-hydro-utils'
import { BitMainBasicSettings } from './status-item'

export type BitMainHydroSettingsProps = {
  /** Device data */
  data?: Device
}

/**
 * BitMain Hydro Settings Component
 *
 * Main settings view for BitMain Hydro containers displaying:
 * - Basic settings (cooling system, power, positioning)
 * - Threshold configuration forms (water temperature, pressure)
 *
 * @example
 * ```tsx
 * <BitMainHydroSettings data={deviceData} />
 * ```
 */
export const BitMainHydroSettings = ({ data }: BitMainHydroSettingsProps): ReactElement => {
  const deviceStatus = data?.status as string | undefined

  return (
    <div className="mdk-bitmain-hydro-settings">
      <section className="mdk-bitmain-hydro-settings__params">
        <BitMainBasicSettings data={data} />
      </section>

      <section className="mdk-bitmain-hydro-settings__thresholds">
        <HydroEditableThresholdForm
          data={data}
          waterTempColorFunc={(value: number) =>
            getAntspaceSupplyLiquidTemperatureColor(value, deviceStatus, data)
          }
          waterTempFlashFunc={(value: number) =>
            shouldAntspaceSupplyLiquidTempFlash(value, deviceStatus, data)
          }
          waterTempSuperflashFunc={(value: number) =>
            shouldAntspaceSupplyLiquidTempSuperflash(value, deviceStatus, data)
          }
          pressureColorFunc={(value: number) =>
            getAntspaceSupplyLiquidPressureColor(value, deviceStatus, data)
          }
          pressureFlashFunc={(value: number) =>
            shouldAntspacePressureFlash(value, deviceStatus, data)
          }
          pressureSuperflashFunc={(value: number) =>
            shouldAntspacePressureSuperflash(value, deviceStatus, data)
          }
        />
      </section>
    </div>
  )
}
