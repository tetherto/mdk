/**
 * Runnable example for DataTable.
 */
import type { DataTableColumnDef } from '@tetherto/mdk-react-devkit'
import { DataTable } from '@tetherto/mdk-react-devkit'

type Miner = {
  id: string
  status: 'online' | 'warning' | 'offline'
  hashrate: number
  power_w: number
}

const data: Miner[] = [
  { id: 'miner-01', status: 'online', hashrate: 102.4, power_w: 3200 },
  { id: 'miner-02', status: 'warning', hashrate: 95.1, power_w: 3450 },
  { id: 'miner-03', status: 'offline', hashrate: 0, power_w: 0 },
]

const columns: DataTableColumnDef<Miner, unknown>[] = [
  { accessorKey: 'id', header: 'Miner' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'hashrate', header: 'Hashrate (TH/s)' },
  { accessorKey: 'power_w', header: 'Power (W)' },
]

export const DataTableExample = () => {
  return <DataTable<Miner> data={data} columns={columns} getRowId={(row) => row.id} />
}
