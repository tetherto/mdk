import type { UnknownRecord } from '@primitives'
import type { ReactElement } from 'react'
import {
  getBitdeerOilTemperatureColor,
  getBitdeerTankPressureColor,
  shouldBitdeerOilTemperatureFlash,
  shouldBitdeerOilTemperatureSuperflash,
  shouldBitdeerTankPressureFlash,
  shouldBitdeerTankPressureSuperflash,
} from './bitdeer-settings-utils'

import {
  ContainerParamsSettings,
  EditableThresholdForm,
} from '../../../../container-params-settings'
import './bitdeer-settings.scss'

type BitdeerSettingsProps = {
  data?: UnknownRecord
}

/**
 * Settings tab for a Bitdeer container — vendor-specific configuration controls and limits.
 *
 * Displays container parameter settings and editable threshold forms
 * for Bitdeer containers with oil temperature and tank pressure monitoring.
 *
 * Includes:
 * - Container parameter display (MAC address, serial number, etc.)
 * - Editable threshold forms for oil temperature and tank pressure
 * - Color-coded alerts and flash indicators
 * - Sound alert configuration
 *
 * @example
 * ```tsx
 * <BitdeerSettings data={containerData} />
 * ```
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const BitdeerSettings = ({ data = {} }: BitdeerSettingsProps): ReactElement => (
  <div className="mdk-bitdeer-settings">
    <section className="mdk-bitdeer-settings__params">
      <ContainerParamsSettings data={data} />
    </section>

    <section className="mdk-bitdeer-settings__thresholds">
      <EditableThresholdForm
        data={data}
        oilTempColorFunc={(value: number) => getBitdeerOilTemperatureColor(true, value, data)}
        oilTempFlashFunc={(value: number) =>
          shouldBitdeerOilTemperatureFlash(true, value, data?.status as string, data)
        }
        oilTempSuperflashFunc={(value: number) =>
          shouldBitdeerOilTemperatureSuperflash(true, value, data?.status as string, data)
        }
        tankPressureColorFunc={(value: number) => getBitdeerTankPressureColor(true, value, data)}
        tankPressureFlashFunc={(value: number) =>
          shouldBitdeerTankPressureFlash(true, value, data?.status as string, data)
        }
        tankPressureSuperflashFunc={(value: number) =>
          shouldBitdeerTankPressureSuperflash(true, value, data?.status as string, data)
        }
      />
    </section>
  </div>
)
