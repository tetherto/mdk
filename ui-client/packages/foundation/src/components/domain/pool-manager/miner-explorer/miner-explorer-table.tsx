import type { DataTableRowSelectionState } from '@tetherto/mdk-core-ui'
import { DataTable } from '@tetherto/mdk-core-ui'
import { MinerStatuses } from '../../../../constants/device-constants'
import type { MinerRecord } from '../types'
import { getMinerTableColumns } from './miner-explorer-columns'

export type MinerExplorerTableProps = {
  data: MinerRecord[]
  loading?: boolean
  selections: DataTableRowSelectionState
  onSelectionsChange: (selections: DataTableRowSelectionState) => void
  getFormattedDate: (date: Date | number, fixedTimezone?: string, formatString?: string) => string
}

export const MinerExplorerTable = ({
  data,
  loading,
  selections,
  onSelectionsChange,
  getFormattedDate,
}: MinerExplorerTableProps): JSX.Element => {
  const columns = getMinerTableColumns(getFormattedDate)

  return (
    <DataTable<MinerRecord>
      data={data}
      columns={columns}
      loading={loading}
      enableRowSelection={(row) => row.original.status !== MinerStatuses.OFFLINE}
      selections={selections}
      onSelectionsChange={onSelectionsChange}
      wrapperClassName="mdk-pm-miner-explorer__table"
      getRowId={(row) => row.id}
    />
  )
}
