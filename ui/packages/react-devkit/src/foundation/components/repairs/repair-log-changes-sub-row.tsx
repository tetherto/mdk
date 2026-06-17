import type { JSX } from 'react'
import { useMemo } from 'react'

import { DataTable, Spinner } from '@core'

import { MINER_TYPE_NAME_MAP } from '../../constants/device-constants'
import { SparePartNames } from '../../constants/spare-parts-constants'
import { getRackNameFromId, isMiner } from '../../utils/device-utils'

import { sparePartChangesColumns } from './repair-log-changes-sub-row-columns'
import type { RepairBatchAction, RepairDevice, RepairLogChangeRow } from './types'

import './repairs.scss'

export type RepairLogChangesSubRowProps = {
  /**
   * The repair batch action whose part changes should be displayed.
   */
  batchAction: RepairBatchAction
  /**
   * Devices referenced by the batch action, pre-fetched by the parent.
   */
  devices: RepairDevice[]
  /**
   * Show a spinner while the parent is still fetching `devices`.
   * @default false
   */
  isLoading?: boolean
}

/**
 * Expandable sub-row that lists the spare-part changes recorded in a repair
 * batch action. Each non-miner repair action is resolved against its device to
 * show the part type, serial number, MAC address, and whether the part was
 * added or removed. Device data is fetched by the parent and passed in via
 * props — the component does no data fetching itself.
 *
 * @category tables
 * @domain device-management
 * @orkCapability device-management
 * @tier agent-ready
 */
export const RepairLogChangesSubRow = ({
  batchAction,
  devices,
  isLoading = false,
}: RepairLogChangesSubRowProps): JSX.Element => {
  const partRemovalMapping = useMemo<Record<string, boolean>>(() => {
    const repairActions = (batchAction.params ?? []).filter((action) => {
      const param = action.params?.[0]
      return param?.comment == null && !isMiner(getRackNameFromId(param?.rackId ?? ''))
    })

    return Object.fromEntries(
      repairActions.map((action) => {
        const param = action.params?.[0]
        return [param?.id ?? '', param?.info?.parentDeviceId == null]
      }),
    )
  }, [batchAction])

  const rows = useMemo<RepairLogChangeRow[]>(
    () =>
      devices.map((device) => {
        const rackName = getRackNameFromId(device.rack ?? '')
        return {
          type:
            (MINER_TYPE_NAME_MAP as Record<string, string>)[rackName] ??
            (SparePartNames as Record<string, string>)[rackName] ??
            'Unknown',
          serialNum: device.info?.serialNum,
          macAddress: device.info?.macAddress,
          removed: Boolean(partRemovalMapping[device.id ?? '']),
        }
      }),
    [devices, partRemovalMapping],
  )

  if (isLoading) {
    return <Spinner />
  }

  return (
    <DataTable<RepairLogChangeRow>
      data={rows}
      columns={sparePartChangesColumns}
      enablePagination={false}
    />
  )
}

RepairLogChangesSubRow.displayName = 'RepairLogChangesSubRow'
