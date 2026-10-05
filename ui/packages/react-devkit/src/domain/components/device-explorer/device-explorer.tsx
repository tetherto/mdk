import { cn } from '@primitives'
import type { DataTableRowSelectionState, DataTableSortingState, LocalFilters } from '@primitives'
import { DeviceExplorerTable } from './device-explorer-table'
import type { DeviceExplorerTableProps } from './device-explorer-table'
import { DeviceExplorerToolbar } from './device-explorer-toolbar'
import type { DeviceExplorerToolbarProps } from './device-explorer-toolbar'
import { DEVICE_EXPLORER_DEVICE_TYPE } from './types'
import type { DeviceExplorerDeviceType } from './types'
import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { useFilterState } from './hooks/use-filter-state'
import { useState } from 'react'
import type { JSX } from 'react'

type OmittedToolbarProps = 'onFiltersChange' | 'filters'
type OptionalToolbarProps = 'filters'
type ForwardedToolbarProps = {
  /** Setter for filters */
  onFiltersChange: (value: LocalFilters) => void
} & Omit<DeviceExplorerToolbarProps, OmittedToolbarProps> &
  Partial<Pick<DeviceExplorerToolbarProps, OptionalToolbarProps>>

type OmittedTableProps = 'selections' | 'onSelectionsChange' | 'sorting' | 'onSortingChange'
type OptionalTableProps = 'onSortingChange'
type ForwardedTableProps = Partial<Pick<DeviceExplorerTableProps, OptionalTableProps>> &
  Omit<DeviceExplorerTableProps, OmittedTableProps>

export type DeviceExplorerProps = {
  /** Active device-type tab */
  deviceType: DeviceExplorerDeviceType
  /** Additional class names */
  className?: string
  /** Controlled row-selection state */
  selectedDevices?: DataTableRowSelectionState
  /** Setter for row selection */
  onSelectedDevicesChange?: (selections: DataTableRowSelectionState) => void
} & ForwardedToolbarProps &
  ForwardedTableProps

/**
 * Top-level device explorer: filter toolbar + searchable, sortable table of
 * miners, containers, or cabinets. Designed to be controlled by URL state in the host app.
 *
 * @category tables
 * @kernelCapability device-management
 * @domain device-management
 *
 * @example
 * ```tsx
 * <DeviceExplorer
 *   deviceType={deviceType}
 *   onDeviceTypeChange={setDeviceType}
 *   data={devices}
 *   filterOptions={filterOptions}
 *   searchOptions={searchOptions}
 *   searchTags={searchTags}
 *   onSearchTagsChange={setSearchTags}
 *   onFiltersChange={setFilters}
 *   getFormattedDate={(date) => formatDate(date)}
 *   renderAction={(device) => <RowActionMenu device={device} />}
 * />
 * ```
 * @tier agent-ready
 */
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
  onRowClick,
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
    if (deviceType === DEVICE_EXPLORER_DEVICE_TYPE.CABINET) {
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
        onRowClick={onRowClick}
      />
    </div>
  )
}
