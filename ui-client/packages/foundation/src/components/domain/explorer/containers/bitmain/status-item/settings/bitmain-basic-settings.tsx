import type { ReactElement } from 'react'
import type { Device } from '../../../../../../../types/device'
import './bitmain-basic-settings.scss'
import { BitMainCoolingSystem } from './cooling-system/bitmain-cooling-system'
import { BitMainPowerAndPositioning } from './power-and-positioning/bitmain-power-and-positioning'

type BitMainBasicSettingsProps = {
  /** Container data */
  data?: Device
}

/**
 * Bitmain Basic Settings Component
 *
 * Main settings view displaying:
 * - Cooling system status (pumps and fans)
 * - Power distribution
 * - GPS positioning
 *
 * @example
 * ```tsx
 * <BitMainBasicSettings data={containerData} />
 * ```
 */
export const BitMainBasicSettings = ({ data }: BitMainBasicSettingsProps): ReactElement => (
  <div className="mdk-bitmain-basic-settings">
    <section className="mdk-bitmain-basic-settings__section">
      <BitMainCoolingSystem data={data} />
    </section>

    <h2 className="mdk-bitmain-basic-settings__title">Power & Positioning</h2>

    <section className="mdk-bitmain-basic-settings__section">
      <BitMainPowerAndPositioning data={data} />
    </section>
  </div>
)
