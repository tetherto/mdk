import type { UnknownRecord } from '@core'
import type { ReactElement } from 'react'
import { getBitdeerCoolingSystemData } from '../bitdeer-settings-utils'
import './bitdeer-options.scss'
import { BitdeerPumps } from './bitdeer-pumps'
import { DryCooler } from './dry-cooler/dry-cooler'

type BitdeerOptionsProps = {
  data?: UnknownRecord
}

/**
 * Options panel for a Bitdeer container — exposes vendor-specific operating modes and thresholds.
 *
 * Main container for Bitdeer cooling system options.
 * Displays dry cooler and pumps components.
 *
 * @example
 * ```tsx
 * <BitdeerOptions data={containerData} />
 * ```
 * @category widgets
 * @domain device-management
 * @orkCapability device-management
 * @tier agent-ready
 */
export const BitdeerOptions = ({ data }: BitdeerOptionsProps): ReactElement => {
  const { dryCooler } = getBitdeerCoolingSystemData(data ?? {})

  return (
    <div className="mdk-bitdeer-options">
      {dryCooler && <DryCooler data={data} />}
      <BitdeerPumps data={data} />
    </div>
  )
}
