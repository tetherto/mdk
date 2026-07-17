import type { DataTableColumnDef } from '@primitives'
import { POOL_ENDPOINT_ROLES_LABELS } from '../../pool-manager-constants'
import type { EndpointRow } from './set-pool-configuration'

export const endpointColumns: DataTableColumnDef<EndpointRow>[] = [
  { header: 'Host', accessorKey: 'host' },
  { header: 'Port', accessorKey: 'port' },
  {
    header: 'Role',
    accessorKey: 'role',
    cell: (info) => {
      const role = info.getValue() as string
      const label = POOL_ENDPOINT_ROLES_LABELS[role as keyof typeof POOL_ENDPOINT_ROLES_LABELS]
      const isPrimary = role === POOL_ENDPOINT_ROLES_LABELS.PRIMARY

      return (
        <span
          className={`mdk-pm-set-pool__role-tag ${isPrimary ? 'mdk-pm-set-pool__role-tag--primary' : 'mdk-pm-set-pool__role-tag--secondary'}`}
        >
          {label}
        </span>
      )
    },
  },
]
