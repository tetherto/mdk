import type { ReactElement } from 'react'
import type { Device } from '../../../../../../types/device'
import './bitmain-basic-settings.scss'
import { BitMainCoolingSystem } from './cooling-system/bitmain-cooling-system'
import { BitMainPowerAndPositioning } from './power-and-positioning/bitmain-power-and-positioning'

type BitMainBasicSettingsProps = {
  /** Container data */
  data?: Device
}

/**
 * General settings form for a BitMain container — naming, location, and power limits.
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
 * @category widgets
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
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
