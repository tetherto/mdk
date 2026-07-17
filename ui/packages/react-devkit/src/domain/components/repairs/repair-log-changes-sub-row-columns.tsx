import type { DataTableColumnDef } from '@primitives'

import type { RepairLogChangeRow } from './types'

/**
 * Column definitions for the spare-part changes table rendered inside
 * `RepairLogChangesSubRow`. The "Changes" column renders an Added/Removed
 * label based on the `removed` flag.
 */
export const sparePartChangesColumns: DataTableColumnDef<RepairLogChangeRow>[] = [
  {
    header: 'Type',
    accessorKey: 'type',
  },
  {
    header: 'Serial Number',
    accessorKey: 'serialNum',
  },
  {
    header: 'MAC',
    accessorKey: 'macAddress',
  },
  {
    header: 'Changes',
    accessorKey: 'removed',
    cell: (info) => {
      const removed = info.getValue() as boolean
      return (
        <span
          className={
            removed
              ? 'mdk-repair-log-changes__label mdk-repair-log-changes__label--removed'
              : 'mdk-repair-log-changes__label mdk-repair-log-changes__label--added'
          }
        >
          {removed ? 'Removed' : 'Added'}
        </span>
      )
    },
  },
]
