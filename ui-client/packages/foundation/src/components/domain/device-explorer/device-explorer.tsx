import { cn } from '@tetherto/mdk-core-ui'
import type { DataTableRowSelectionState, DataTableSortingState, LocalFilters } from '@tetherto/mdk-core-ui'
import { DeviceExplorerTable } from './device-explorer-table'
import type { DeviceExplorerTableProps } from './device-explorer-table'
import { DeviceExplorerToolbar } from './device-explorer-toolbar'
import type { DeviceExplorerToolbarProps } from './device-explorer-toolbar'
import type { DeviceExplorerDeviceType } from './types'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useFilterState } from './hooks/use-filter-state'
import { useState } from 'react'

type OmittedToolbarProps = 'onFiltersChange' | 'filters'
type OptionalToolbarProps = 'filters'
type ForwardedToolbarProps = {
  onFiltersChange: (value: LocalFilters) => void
} & Omit<DeviceExplorerToolbarProps, OmittedToolbarProps> &
  Partial<Pick<DeviceExplorerToolbarProps, OptionalToolbarProps>>

type OmittedTableProps = 'selections' | 'onSelectionsChange' | 'sorting' | 'onSortingChange'
type OptionalTableProps = 'onSortingChange'
type ForwardedTableProps = Partial<Pick<DeviceExplorerTableProps, OptionalTableProps>> &
  Omit<DeviceExplorerTableProps, OmittedTableProps>

export type DeviceExplorerProps = {
  deviceType: DeviceExplorerDeviceType
  className?: string
  selectedDevices?: DataTableRowSelectionState
  onSelectedDevicesChange?: (selections: DataTableRowSelectionState) => void
} & ForwardedToolbarProps &
  ForwardedTableProps

export const DeviceExplorer = ({
  filters: providedFilters,
  onFiltersChange,
  filterOptions,
  searchOptions,
  data,
  deviceType,
  onDeviceTypeChange,
  selectedDevices,
  onSelectedDevicesChange,
  searchTags,
  onSearchTagsChange,
  className,
  renderAction,
  getFormattedDate,
}: DeviceExplorerProps): JSX.Element => {
  const [selections, setSelections] = useControllableState<DataTableRowSelectionState>({
    prop: selectedDevices,
    defaultProp: {},
    onChange: onSelectedDevicesChange,
  })

  const { filters, onFiltersChange: handleFilterChange } = useFilterState({
    filters: providedFilters,
    onFiltersChange,
  })

  const [sorting, setSorting] = useState<DataTableSortingState>([])

  const handleDeviceTypeChange = (deviceType: DeviceExplorerDeviceType): void => {
    if (deviceType === 'cabinet') {
      setSorting([{ id: 'id', desc: true }])
    } else {
      setSorting([])
    }

    onDeviceTypeChange(deviceType)
  }

  return (
    <div className={cn('mdk-device-explorer', className)}>
      <DeviceExplorerToolbar
        filters={filters}
        filterOptions={filterOptions}
        onFiltersChange={handleFilterChange}
        searchOptions={searchOptions}
        searchTags={searchTags}
        onSearchTagsChange={onSearchTagsChange}
        deviceType={deviceType}
        onDeviceTypeChange={handleDeviceTypeChange}
      />
      <DeviceExplorerTable
        data={data}
        deviceType={deviceType}
        selections={selections}
        onSelectionsChange={setSelections}
        renderAction={renderAction}
        getFormattedDate={getFormattedDate}
        sorting={sorting}
        onSortingChange={setSorting}
      />
    </div>
  )
}
