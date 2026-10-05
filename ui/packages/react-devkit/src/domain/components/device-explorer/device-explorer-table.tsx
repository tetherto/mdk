import { DataTable } from '@primitives'
import type { DataTableRowSelectionState, DataTableSortingState } from '@primitives'
import type { DeviceExplorerDeviceData, DeviceExplorerDeviceType } from './types'
import { getColumnConfig } from './columns/device-explorer.columns'

import type { JSX } from 'react'

export type DeviceExplorerTableProps = {
  /** Rows */
  data: DeviceExplorerDeviceData[]
  deviceType: DeviceExplorerDeviceType
  selections: DataTableRowSelectionState
  onSelectionsChange: (selections: DataTableRowSelectionState) => void
  /** Date formatter from the host's timezone setup */
  getFormattedDate: (date: Date) => string
  /** Renderer for the per-row action cell */
  renderAction: (device: DeviceExplorerDeviceData) => React.ReactNode
  sorting: DataTableSortingState
  onSortingChange: (sorting: DataTableSortingState) => void
  /** Called when a row is clicked (e.g. to open the device's detail page). */
  onRowClick?: (device: DeviceExplorerDeviceData) => void
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
  onRowClick,
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
      // Key rows by the device id (not the default row index) so a selection —
      // and any `?thing=<id>` deep-link that maps onto it — survives sorting and
      // filtering, and so the host can resolve a selected row back to its thing.
      getRowId={(row) => row.id}
      selections={selections}
      onSelectionsChange={onSelectionsChange}
      wrapperClassName="mdk-device-explorer__table"
      sorting={sorting}
      onSortingChange={onSortingChange}
      onRowClick={onRowClick}
    />
  )
}
