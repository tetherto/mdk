import { DataTable } from '@mdk/core'
import type { DataTableRowSelectionState, DataTableSortingState } from '@mdk/core'
import type { DeviceExplorerDeviceData, DeviceExplorerDeviceType } from './types'
import { getColumnConfig } from './columns/device-explorer.columns'

export type DeviceExplorerTableProps = {
  data: DeviceExplorerDeviceData[]
  deviceType: DeviceExplorerDeviceType
  selections: DataTableRowSelectionState
  onSelectionsChange: (selections: DataTableRowSelectionState) => void
  getFormattedDate: (date: Date) => string
  renderAction: (device: DeviceExplorerDeviceData) => React.ReactNode
  sorting: DataTableSortingState
  onSortingChange: (sorting: DataTableSortingState) => void
}

export const DeviceExplorerTable = ({
  data,
  deviceType,
  selections,
  onSelectionsChange,
  getFormattedDate,
  renderAction,
  sorting,
  onSortingChange,
}: DeviceExplorerTableProps): JSX.Element => {
  const columns = getColumnConfig({
    getFormattedDate,
    renderAction,
  })[deviceType]

  return (
    <DataTable
      data={data}
      columns={columns}
      enableRowSelection
      selections={selections}
      onSelectionsChange={onSelectionsChange}
      wrapperClassName="mdk-device-explorer__table"
      sorting={sorting}
      onSortingChange={onSortingChange}
    />
  )
}
