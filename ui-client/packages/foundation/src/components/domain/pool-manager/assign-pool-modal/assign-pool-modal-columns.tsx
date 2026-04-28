import type { DataTableColumnDef } from '@tetherto/core'
import { Indicator } from '@tetherto/core'
import {
  MINER_IN_POOL_STATUS_COLORS,
  MINER_IN_POOL_STATUSES,
  MINER_STATUS_TO_IN_POOL_STATUS,
} from '../pool-manager-constants'
import type { MinerRow } from './assign-pool-modal'

export const minersTableColumns: DataTableColumnDef<MinerRow>[] = [
  {
    header: 'Miner Code',
    accessorKey: 'code',
    sortingFn: (rowA, rowB) => (rowA.original.code ?? '').localeCompare(rowB.original.code ?? ''),
  },
  {
    header: 'Unit',
    accessorKey: 'unit',
    sortingFn: (rowA, rowB) => (rowA.original.unit ?? '').localeCompare(rowB.original.unit ?? ''),
  },
  {
    header: 'Current Pool',
    accessorKey: 'pool',
    sortingFn: (rowA, rowB) => (rowA.original.pool ?? '').localeCompare(rowB.original.pool ?? ''),
  },
  {
    header: 'Status',
    accessorKey: 'status',
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
]
