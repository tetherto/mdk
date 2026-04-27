import type { UnknownRecord } from '@mdk/core'
import type { ReactElement } from 'react'
import { getBitdeerCoolingSystemData } from '../bitdeer-settings-utils'
import './bitdeer-options.scss'
import { BitdeerPumps } from './bitdeer-pumps'
import { DryCooler } from './dry-cooler/dry-cooler'

type BitdeerOptionsProps = {
  data?: UnknownRecord
}

/**
 * Bitdeer Options Component
 *
 * Main container for Bitdeer cooling system options.
 * Displays dry cooler and pumps components.
 *
 * @example
 * ```tsx
 * <BitdeerOptions data={containerData} />
 * ```
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
