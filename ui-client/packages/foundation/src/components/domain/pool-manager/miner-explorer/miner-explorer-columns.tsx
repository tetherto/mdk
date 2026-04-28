import type { DataTableColumnDef } from '@tetherto/mdk-core-ui'
import { Indicator } from '@tetherto/mdk-core-ui'

import { DATE_TIME_FORMAT } from '../../../../constants/dates'
import { getHashrateString } from '../../../../utils/device-utils'
import {
  MINER_IN_POOL_STATUS_COLORS,
  MINER_IN_POOL_STATUSES,
  MINER_STATUS_TO_IN_POOL_STATUS,
} from '../pool-manager-constants'
import type { MinerRecord } from '../types'

const CELL_MIN_WIDTH = 100

type GetFormattedDate = (
  date: Date | number,
  fixedTimezone?: string,
  formatString?: string,
) => string

export const getMinerTableColumns = (
  getFormattedDate: GetFormattedDate,
): DataTableColumnDef<MinerRecord>[] => [
  {
    header: 'Miner Code',
    accessorKey: 'code',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => info.getValue() as string,
    sortingFn: (rowA, rowB) => (rowA.original.code ?? '').localeCompare(rowB.original.code ?? ''),
  },
  {
    header: 'Unit',
    accessorKey: 'unit',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => (info.getValue() as string) ?? '-',
    sortingFn: (rowA, rowB) => (rowA.original.unit ?? '').localeCompare(rowB.original.unit ?? ''),
  },
  {
    header: 'Current Pool',
    accessorKey: 'pool',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => (info.getValue() as string) ?? '-',
    sortingFn: (rowA, rowB) => (rowA.original.pool ?? '').localeCompare(rowB.original.pool ?? ''),
  },
  {
    header: 'Status',
    accessorKey: 'status',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const status = info.getValue() as string | undefined
      const minerStatus = status as keyof typeof MINER_STATUS_TO_IN_POOL_STATUS

      const inPoolStatus =
        MINER_STATUS_TO_IN_POOL_STATUS[minerStatus] ?? MINER_IN_POOL_STATUSES.INACTIVE

      const inPoolColor = MINER_IN_POOL_STATUS_COLORS[inPoolStatus]

      if (!inPoolColor) return null

      return (
        <Indicator size="sm" color={inPoolColor}>
          {inPoolStatus}
        </Indicator>
      )
    },
    sortingFn: (rowA, rowB) =>
      (rowA.original.status ?? '').localeCompare(rowB.original.status ?? ''),
  },
  {
    header: 'Hashrate',
    accessorKey: 'hashrate',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const value = info.getValue() as number | undefined
      return value ? getHashrateString(value) : '-'
    },
    sortingFn: (rowA, rowB) => (rowA.original.hashrate ?? 0) - (rowB.original.hashrate ?? 0),
  },
  {
    header: 'Last Sync',
    accessorKey: 'lastSyncedAt',
    minSize: CELL_MIN_WIDTH,
    cell: (info) => {
      const value = info.getValue() as Date | undefined
      return value ? getFormattedDate(value, undefined, DATE_TIME_FORMAT) : '-'
    },
    sortingFn: (rowA, rowB) =>
      rowA.original.lastSyncedAt.getTime() - rowB.original.lastSyncedAt.getTime(),
  },
]
