import type { DataTableColumnDef } from '@tetherto/mdk-core-ui'
import type {
  DeviceExplorerDeviceData,
  DeviceExplorerDeviceType,
  GetColumnConfigParams,
} from '../types'
import { getMinerColumns } from './miner-columns'
import { getContainerColumns } from './container-columns'
import { getCabinetColumns } from './cabinet-columns'

export const getColumnConfig = (
  params: GetColumnConfigParams,
): Record<DeviceExplorerDeviceType, DataTableColumnDef<DeviceExplorerDeviceData>[]> => ({
  miner: getMinerColumns(params),
  container: getContainerColumns(params),
  cabinet: getCabinetColumns(params),
})
